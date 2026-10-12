import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0009, Epic 4 step 2: time unit, meeting types, weekly windows, per-Client meeting types.
 * Today's `allowed_durations_minutes` become meeting types (the column itself is dropped in step 3,
 * together with the onboarding form that still writes it).
 */
export class AddScheduleSettings1779860000000 implements MigrationInterface {
  name = 'AddScheduleSettings1779860000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ADD "time_unit_minutes" integer NOT NULL DEFAULT 60',
    );
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ADD CONSTRAINT "CHK_provider_settings_time_unit" CHECK ("time_unit_minutes" IN (30, 60))',
    );

    await queryRunner.query(`
      CREATE TABLE "meeting_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "name" character varying(60) NOT NULL,
        "length_minutes" integer NOT NULL,
        "default_for_clients" boolean NOT NULL,
        "archived_at" TIMESTAMP WITH TIME ZONE NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_types_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_meeting_types_length" CHECK ("length_minutes" > 0),
        CONSTRAINT "FK_meeting_types_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_meeting_types_provider_id" ON "meeting_types" ("provider_id")',
    );

    await queryRunner.query(`
      CREATE TABLE "weekly_windows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "weekday" smallint NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        CONSTRAINT "PK_weekly_windows_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_weekly_windows_weekday" CHECK ("weekday" BETWEEN 0 AND 6),
        CONSTRAINT "CHK_weekly_windows_order" CHECK ("start_time" < "end_time"),
        CONSTRAINT "FK_weekly_windows_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_weekly_windows_provider_id" ON "weekly_windows" ("provider_id")',
    );

    await queryRunner.query(`
      CREATE TABLE "client_meeting_types" (
        "client_id" uuid NOT NULL,
        "meeting_type_id" uuid NOT NULL,
        CONSTRAINT "PK_client_meeting_types" PRIMARY KEY ("client_id", "meeting_type_id"),
        CONSTRAINT "FK_client_meeting_types_client_id" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_client_meeting_types_meeting_type_id" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_client_meeting_types_meeting_type_id" ON "client_meeting_types" ("meeting_type_id")',
    );

    // Existing durations -> meeting types. The unit is 60 when every duration fits it, else 30;
    // a duration that isn't a multiple of 30 can't live on either grid and is left out, and
    // a repeated duration becomes one type.
    await queryRunner.query(`
      UPDATE "provider_settings" SET "time_unit_minutes" = 30
      WHERE EXISTS (SELECT 1 FROM unnest("allowed_durations_minutes") AS d WHERE d % 60 <> 0)
    `);
    await queryRunner.query(`
      INSERT INTO "meeting_types" ("provider_id", "name", "length_minutes", "default_for_clients")
      SELECT DISTINCT ps."provider_id", 'פגישה של ' || d || ' דקות', d, true
      FROM "provider_settings" ps, unnest(ps."allowed_durations_minutes") AS d
      WHERE d % 30 = 0
    `);
    await queryRunner.query(`
      INSERT INTO "client_meeting_types" ("client_id", "meeting_type_id")
      SELECT u."id", mt."id"
      FROM "users" u
      JOIN "meeting_types" mt ON mt."provider_id" = u."provider_id"
      WHERE u."role" = 'CLIENT'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "client_meeting_types"');
    await queryRunner.query('DROP TABLE "weekly_windows"');
    await queryRunner.query('DROP TABLE "meeting_types"');
    await queryRunner.query(
      'ALTER TABLE "provider_settings" DROP CONSTRAINT "CHK_provider_settings_time_unit"',
    );
    await queryRunner.query('ALTER TABLE "provider_settings" DROP COLUMN "time_unit_minutes"');
  }
}

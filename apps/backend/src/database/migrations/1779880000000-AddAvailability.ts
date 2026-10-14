import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0009, Epic 4 step 4b: appointments (rows only for bookings, no double booking), one-off
 * extra windows, and the opening state ("open until", the opening limit).
 */
export class AddAvailability1779880000000 implements MigrationInterface {
  name = 'AddAvailability1779880000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "provider_settings" ADD "open_until" date NULL');
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ADD "max_open_weeks" integer NOT NULL DEFAULT 12',
    );
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ADD CONSTRAINT "CHK_provider_settings_max_open_weeks" CHECK ("max_open_weeks" BETWEEN 1 AND 52)',
    );

    await queryRunner.query(`
      CREATE TABLE "extra_windows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        CONSTRAINT "PK_extra_windows_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_extra_windows_order" CHECK ("start_time" < "end_time"),
        CONSTRAINT "FK_extra_windows_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_extra_windows_provider_date" ON "extra_windows" ("provider_id", "date")',
    );

    // btree_gist lets one exclusion constraint combine "same Provider" (=) with "times overlap" (&&).
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "meeting_type_id" uuid NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'BOOKED',
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_appointments_order" CHECK ("starts_at" < "ends_at"),
        CONSTRAINT "CHK_appointments_status" CHECK ("status" IN ('BOOKED', 'CANCELLED')),
        CONSTRAINT "FK_appointments_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_client_id" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_meeting_type_id" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE NO ACTION,
        -- No two BOOKED appointments of one Provider may overlap. '[)': touching is fine.
        CONSTRAINT "EXC_appointments_no_overlap" EXCLUDE USING gist (
          "provider_id" WITH =,
          tstzrange("starts_at", "ends_at", '[)') WITH &&
        ) WHERE ("status" = 'BOOKED')
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_appointments_provider_starts_at" ON "appointments" ("provider_id", "starts_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "appointments"');
    await queryRunner.query('DROP TABLE "extra_windows"');
    await queryRunner.query(
      'ALTER TABLE "provider_settings" DROP CONSTRAINT "CHK_provider_settings_max_open_weeks"',
    );
    await queryRunner.query('ALTER TABLE "provider_settings" DROP COLUMN "max_open_weeks"');
    await queryRunner.query('ALTER TABLE "provider_settings" DROP COLUMN "open_until"');
  }
}

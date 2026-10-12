import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0009, Epic 4 step 3: onboarding keeps the business details only. Durations already became
 * meeting types (AddScheduleSettings); the cancellation window is edited in the appointment
 * settings, and a new Provider starts with 24 hours.
 */
export class OnboardingBusinessDetailsOnly1779870000000 implements MigrationInterface {
  name = 'OnboardingBusinessDetailsOnly1779870000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "provider_settings" DROP COLUMN "allowed_durations_minutes"',
    );
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ALTER COLUMN "cancellation_window_minutes" SET DEFAULT 1440',
    );
  }

  /** Rebuilds the durations from the active meeting types. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ALTER COLUMN "cancellation_window_minutes" DROP DEFAULT',
    );
    await queryRunner.query(
      `ALTER TABLE "provider_settings" ADD "allowed_durations_minutes" integer array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`
      UPDATE "provider_settings" ps SET "allowed_durations_minutes" = COALESCE(
        (SELECT array_agg(DISTINCT mt."length_minutes") FROM "meeting_types" mt
         WHERE mt."provider_id" = ps."provider_id" AND mt."archived_at" IS NULL),
        '{}'
      )
    `);
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ALTER COLUMN "allowed_durations_minutes" DROP DEFAULT',
    );
  }
}

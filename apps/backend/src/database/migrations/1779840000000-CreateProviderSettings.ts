import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderSettings1779840000000 implements MigrationInterface {
  name = 'CreateProviderSettings1779840000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provider_settings" (
        "provider_id" uuid NOT NULL,
        "business_name" character varying(150) NOT NULL,
        "client_label" character varying(50) NOT NULL,
        "cancellation_window_minutes" integer NOT NULL,
        "allowed_durations_minutes" integer array NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_settings_provider_id" PRIMARY KEY ("provider_id")
      )
    `);
    await queryRunner.query(
      'ALTER TABLE "provider_settings" ADD CONSTRAINT "FK_provider_settings_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "provider_settings"');
  }
}

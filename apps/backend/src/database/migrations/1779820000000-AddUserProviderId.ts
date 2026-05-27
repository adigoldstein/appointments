import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProviderId1779820000000 implements MigrationInterface {
  name = 'AddUserProviderId1779820000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "provider_id" uuid NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_users_provider_id" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "FK_users_provider_id"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "provider_id"');
  }
}

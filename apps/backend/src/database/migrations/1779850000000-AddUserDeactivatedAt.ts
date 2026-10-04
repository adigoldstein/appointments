import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeactivatedAt1779850000000 implements MigrationInterface {
  name = 'AddUserDeactivatedAt1779850000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "deactivated_at" TIMESTAMP WITH TIME ZONE NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "deactivated_at"');
  }
}

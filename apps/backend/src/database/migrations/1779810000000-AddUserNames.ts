import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNames1779810000000 implements MigrationInterface {
  name = 'AddUserNames1779810000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "first_name" character varying(100) NOT NULL DEFAULT \'\'',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "last_name" character varying(100) NOT NULL DEFAULT \'\'',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_name"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "first_name"');
  }
}

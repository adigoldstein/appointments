import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhoneAndCityId1779830000000 implements MigrationInterface {
  name = 'AddUserPhoneAndCityId1779830000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "phone" character varying(16) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "city_id" integer NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "city_id"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "phone"');
  }
}

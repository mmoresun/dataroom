import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNodeConfirmed1783772049558 implements MigrationInterface {
  name = 'AddNodeConfirmed1783772049558';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "node" ADD "confirmed" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "node" DROP COLUMN "confirmed"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDataRoomAndNode1783685561000 implements MigrationInterface {
  name = 'CreateDataRoomAndNode1783685561000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "data_room" ("name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" integer NOT NULL, CONSTRAINT "PK_fb06cb9f8edc11b4502393aa49c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "node" ("s3Key" character varying, "mimeType" character varying, "size" integer, "parentId" character varying NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "dataRoomId" uuid NOT NULL, CONSTRAINT "PK_8c8caf5f29d25264abe9eaf94dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_room" ADD CONSTRAINT "FK_015ef8b378d38255bc0e24a2b31" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "node" ADD CONSTRAINT "FK_41b05758c4f0ff8266ad4542b66" FOREIGN KEY ("dataRoomId") REFERENCES "data_room"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "node" DROP CONSTRAINT "FK_41b05758c4f0ff8266ad4542b66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_room" DROP CONSTRAINT "FK_015ef8b378d38255bc0e24a2b31"`,
    );
    await queryRunner.query(`DROP TABLE "node"`);
    await queryRunner.query(`DROP TABLE "data_room"`);
  }
}

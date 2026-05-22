import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserNameNotNull1778591981018 implements MigrationInterface {
  name = 'MakeUserNameNotNull1778591981018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`User\` SET name = username WHERE name IS NULL OR name = ''`,
    );
    await queryRunner.query(
      `ALTER TABLE \`User\` MODIFY COLUMN \`name\` varchar(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`User\` MODIFY COLUMN \`name\` varchar(255) NULL DEFAULT ''`,
    );
  }
}

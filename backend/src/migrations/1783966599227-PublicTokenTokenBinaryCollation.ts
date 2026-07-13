import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicTokenTokenBinaryCollation1783966599227 implements MigrationInterface {
  name = 'PublicTokenTokenBinaryCollation1783966599227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`PublicToken\` MODIFY \`token\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`PublicToken\` MODIFY \`token\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL`,
    );
  }
}

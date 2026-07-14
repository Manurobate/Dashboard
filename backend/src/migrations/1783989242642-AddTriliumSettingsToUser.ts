import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriliumSettingsToUser1783989242642
  implements MigrationInterface
{
  name = 'AddTriliumSettingsToUser1783989242642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`User\` ADD \`triliumUrl\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`User\` ADD \`notesEnabled\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`User\` DROP COLUMN \`notesEnabled\``);
    await queryRunner.query(`ALTER TABLE \`User\` DROP COLUMN \`triliumUrl\``);
  }
}

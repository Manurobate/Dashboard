import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvantProposToRecipe1781183421289 implements MigrationInterface {
    name = 'AddAvantProposToRecipe1781183421289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`Recipe\` ADD \`avantPropos\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`Recipe\` DROP COLUMN \`avantPropos\``);
    }

}

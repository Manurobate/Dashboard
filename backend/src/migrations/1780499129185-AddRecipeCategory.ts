import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecipeCategory1780499129185 implements MigrationInterface {
    name = 'AddRecipeCategory1780499129185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`RecipeCategory\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`userId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE KEY \`UQ_RecipeCategory_name_userId\` (\`name\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`Recipe\` DROP COLUMN \`category\``);
        await queryRunner.query(`ALTER TABLE \`Recipe\` ADD \`categoryId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`RecipeCategory\` ADD CONSTRAINT \`FK_d97841d1fc9d404a1466a2ba1cd\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Recipe\` ADD CONSTRAINT \`FK_111f20ebadc999600cac3476756\` FOREIGN KEY (\`categoryId\`) REFERENCES \`RecipeCategory\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`Recipe\` DROP FOREIGN KEY \`FK_111f20ebadc999600cac3476756\``);
        await queryRunner.query(`ALTER TABLE \`RecipeCategory\` DROP FOREIGN KEY \`FK_d97841d1fc9d404a1466a2ba1cd\``);
        await queryRunner.query(`ALTER TABLE \`Recipe\` DROP COLUMN \`categoryId\``);
        await queryRunner.query(`ALTER TABLE \`Recipe\` ADD \`category\` varchar(255) NULL`);
        await queryRunner.query(`DROP TABLE \`RecipeCategory\``);
    }

}

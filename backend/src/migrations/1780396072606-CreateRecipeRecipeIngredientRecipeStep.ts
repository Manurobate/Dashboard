import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecipeRecipeIngredientRecipeStep1780396072606 implements MigrationInterface {
  name = 'CreateRecipeRecipeIngredientRecipeStep1780396072606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`RecipeIngredient\` (\`id\` int NOT NULL AUTO_INCREMENT, \`quantity\` decimal(10,3) NOT NULL, \`unit\` varchar(50) NULL, \`name\` varchar(255) NOT NULL, \`position\` int NOT NULL DEFAULT '0', \`recipeId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`RecipeStep\` (\`id\` int NOT NULL AUTO_INCREMENT, \`content\` text NOT NULL, \`position\` int NOT NULL DEFAULT '0', \`recipeId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`Recipe\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`category\` varchar(255) NULL, \`servings\` int NOT NULL DEFAULT '4', \`imageUrl\` varchar(2083) NULL, \`userId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`RecipeIngredient\` ADD CONSTRAINT \`FK_72a25a30a5263524c5ae07a12a9\` FOREIGN KEY (\`recipeId\`) REFERENCES \`Recipe\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`RecipeStep\` ADD CONSTRAINT \`FK_93f6c5ce2c1b0cc5b58fe4772e6\` FOREIGN KEY (\`recipeId\`) REFERENCES \`Recipe\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`Recipe\` ADD CONSTRAINT \`FK_a7657e73c65475630f10a8eefb9\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`Recipe\` DROP FOREIGN KEY \`FK_a7657e73c65475630f10a8eefb9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`RecipeStep\` DROP FOREIGN KEY \`FK_93f6c5ce2c1b0cc5b58fe4772e6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`RecipeIngredient\` DROP FOREIGN KEY \`FK_72a25a30a5263524c5ae07a12a9\``,
    );
    await queryRunner.query(`DROP TABLE \`Recipe\``);
    await queryRunner.query(`DROP TABLE \`RecipeStep\``);
    await queryRunner.query(`DROP TABLE \`RecipeIngredient\``);
  }
}

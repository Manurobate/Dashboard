import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRefreshToken1746057600000 implements MigrationInterface {
  name = 'CreateUserRefreshToken1746057600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`User\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(255) NOT NULL,
        \`passwordHash\` varchar(255) NOT NULL,
        \`role\` varchar(255) NOT NULL DEFAULT 'user',
        \`mustChangePassword\` tinyint NOT NULL DEFAULT 1,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_User_username\` (\`username\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`RefreshToken\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`token\` varchar(500) NOT NULL,
        \`userId\` int NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_RefreshToken_token\` (\`token\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_RefreshToken_userId\` FOREIGN KEY (\`userId\`)
          REFERENCES \`User\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`RefreshToken\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`User\``);
  }
}

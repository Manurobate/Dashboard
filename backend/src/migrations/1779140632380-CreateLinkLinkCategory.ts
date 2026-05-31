import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLinkLinkCategory1779140632380 implements MigrationInterface {
  name = 'CreateLinkLinkCategory1779140632380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`LinkCategory\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`emoji\` varchar(10) NULL, \`position\` int NOT NULL DEFAULT '0', \`userId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`Link\` (\`id\` int NOT NULL AUTO_INCREMENT, \`url\` varchar(2048) NOT NULL, \`title\` varchar(255) NOT NULL, \`description\` varchar(1000) NULL, \`faviconUrl\` varchar(2048) NULL, \`position\` int NOT NULL DEFAULT '0', \`categoryId\` int NOT NULL, \`userId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`User\` CHANGE \`name\` \`name\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`LinkCategory\` ADD CONSTRAINT \`FK_6c9d5f1ee7f56d42b59f92e919e\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`Link\` ADD CONSTRAINT \`FK_657f2e4fffb9c89531257717dfe\` FOREIGN KEY (\`categoryId\`) REFERENCES \`LinkCategory\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`Link\` ADD CONSTRAINT \`FK_0d31e1ad66ace35c1b3c71959af\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`Link\` DROP FOREIGN KEY \`FK_0d31e1ad66ace35c1b3c71959af\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`Link\` DROP FOREIGN KEY \`FK_657f2e4fffb9c89531257717dfe\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`LinkCategory\` DROP FOREIGN KEY \`FK_6c9d5f1ee7f56d42b59f92e919e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`User\` CHANGE \`name\` \`name\` varchar(255) NULL DEFAULT ''`,
    );
    await queryRunner.query(`DROP TABLE \`Link\``);
    await queryRunner.query(`DROP TABLE \`LinkCategory\``);
  }
}

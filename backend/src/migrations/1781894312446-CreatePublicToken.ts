import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePublicToken1781894312446 implements MigrationInterface {
    name = 'CreatePublicToken1781894312446'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`PublicToken\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token\` varchar(255) NOT NULL, \`resourceType\` varchar(20) NOT NULL, \`resourceId\` int NOT NULL, \`userId\` int NOT NULL, \`expiresAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`revokedAt\` datetime NULL, UNIQUE INDEX \`IDX_e16268952e955fdb005640949e\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`PublicToken\` ADD CONSTRAINT \`FK_6ef3a4e1eeac7e890c29551e10b\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`PublicToken\` DROP FOREIGN KEY \`FK_6ef3a4e1eeac7e890c29551e10b\``);
        await queryRunner.query(`DROP INDEX \`IDX_e16268952e955fdb005640949e\` ON \`PublicToken\``);
        await queryRunner.query(`DROP TABLE \`PublicToken\``);
    }

}

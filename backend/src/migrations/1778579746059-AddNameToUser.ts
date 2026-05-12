import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToUser1778579746059 implements MigrationInterface {
    name = 'AddNameToUser1778579746059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` DROP FOREIGN KEY \`FK_RefreshToken_userId\``);
        await queryRunner.query(`DROP INDEX \`IDX_RefreshToken_token\` ON \`RefreshToken\``);
        await queryRunner.query(`DROP INDEX \`IDX_User_username\` ON \`User\``);
        await queryRunner.query(`ALTER TABLE \`User\` ADD \`name\` varchar(255) NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` ADD UNIQUE INDEX \`IDX_24767d4be408c6c4b49080a397\` (\`token\`)`);
        await queryRunner.query(`ALTER TABLE \`User\` ADD UNIQUE INDEX \`IDX_29a05908a0fa0728526d283365\` (\`username\`)`);
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` ADD CONSTRAINT \`FK_3a4d068289fa6c2038fb2101e5b\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` DROP FOREIGN KEY \`FK_3a4d068289fa6c2038fb2101e5b\``);
        await queryRunner.query(`ALTER TABLE \`User\` DROP INDEX \`IDX_29a05908a0fa0728526d283365\``);
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` DROP INDEX \`IDX_24767d4be408c6c4b49080a397\``);
        await queryRunner.query(`ALTER TABLE \`User\` DROP COLUMN \`name\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_User_username\` ON \`User\` (\`username\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_RefreshToken_token\` ON \`RefreshToken\` (\`token\`)`);
        await queryRunner.query(`ALTER TABLE \`RefreshToken\` ADD CONSTRAINT \`FK_RefreshToken_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

}

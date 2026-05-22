import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEmojiToIconInLinkCategory1779361905285 implements MigrationInterface {
    name = 'RenameEmojiToIconInLinkCategory1779361905285'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`LinkCategory\` CHANGE \`emoji\` \`icon\` varchar(50) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`LinkCategory\` CHANGE \`icon\` \`emoji\` varchar(10) NULL`);
    }

}

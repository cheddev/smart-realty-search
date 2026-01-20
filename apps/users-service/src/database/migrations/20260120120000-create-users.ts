import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsers20260120120000 implements MigrationInterface {
  name = 'CreateUsers20260120120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'users';
    const indexName = 'IDX_USERS_EMAIL';
    const hasTable = await queryRunner.hasTable(tableName);

    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: tableName,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'uuid',
            },
            {
              name: 'email',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'password_hash',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
          ],
        }),
      );
    }

    const table = await queryRunner.getTable(tableName);
    const hasIndex = table?.indices.some((index) => index.name === indexName);

    if (!hasIndex) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: indexName,
          columnNames: ['email'],
          isUnique: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'users';
    const indexName = 'IDX_USERS_EMAIL';
    const hasTable = await queryRunner.hasTable(tableName);

    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find((item) => item.name === indexName);

    if (index) {
      await queryRunner.dropIndex(tableName, index);
    }

    await queryRunner.dropTable(tableName);
  }
}

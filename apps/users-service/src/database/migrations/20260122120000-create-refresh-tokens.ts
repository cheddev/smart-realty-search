import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateRefreshTokens20260122120000 implements MigrationInterface {
  name = 'CreateRefreshTokens20260122120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'refresh_tokens';
    const userIndexName = 'IDX_REFRESH_TOKENS_USER_ID';
    const tokenIndexName = 'IDX_REFRESH_TOKENS_TOKEN_HASH';
    const fkName = 'FK_REFRESH_TOKENS_USER_ID';

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

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
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'token_hash',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'now()',
            },
            {
              name: 'expires_at',
              type: 'timestamptz',
              isNullable: false,
            },
            {
              name: 'revoked_at',
              type: 'timestamptz',
              isNullable: true,
            },
          ],
        }),
      );
    }

    const table = await queryRunner.getTable(tableName);
    const hasUserIndex = table?.indices.some(
      (index) => index.name === userIndexName,
    );
    const hasTokenIndex = table?.indices.some(
      (index) => index.name === tokenIndexName,
    );
    const hasForeignKey = table?.foreignKeys.some(
      (foreignKey) => foreignKey.name === fkName,
    );

    if (!hasUserIndex) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: userIndexName,
          columnNames: ['user_id'],
        }),
      );
    }

    if (!hasTokenIndex) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: tokenIndexName,
          columnNames: ['token_hash'],
        }),
      );
    }

    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          name: fkName,
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'refresh_tokens';
    const userIndexName = 'IDX_REFRESH_TOKENS_USER_ID';
    const tokenIndexName = 'IDX_REFRESH_TOKENS_TOKEN_HASH';
    const fkName = 'FK_REFRESH_TOKENS_USER_ID';

    const hasTable = await queryRunner.hasTable(tableName);
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable(tableName);
    const fk = table?.foreignKeys.find((foreignKey) => foreignKey.name === fkName);
    const userIndex = table?.indices.find(
      (index) => index.name === userIndexName,
    );
    const tokenIndex = table?.indices.find(
      (index) => index.name === tokenIndexName,
    );

    if (fk) {
      await queryRunner.dropForeignKey(tableName, fk);
    }

    if (userIndex) {
      await queryRunner.dropIndex(tableName, userIndex);
    }

    if (tokenIndex) {
      await queryRunner.dropIndex(tableName, tokenIndex);
    }

    await queryRunner.dropTable(tableName);
  }
}

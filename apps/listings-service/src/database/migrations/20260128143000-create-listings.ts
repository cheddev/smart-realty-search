import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateListings20260128143000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE \"listing_status\" AS ENUM ('active', 'sold', 'archived')",
    );

    await queryRunner.createTable(
      new Table({
        name: 'listings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'city', type: 'text' },
          { name: 'district', type: 'text' },
          { name: 'price', type: 'int' },
          { name: 'rooms', type: 'int' },
          { name: 'area', type: 'int' },
          { name: 'title', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'listing_status',
            default: "'active'",
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'listings',
      new TableIndex({
        name: 'IDX_listings_city_district',
        columnNames: ['city', 'district'],
      }),
    );
    await queryRunner.createIndex(
      'listings',
      new TableIndex({
        name: 'IDX_listings_price',
        columnNames: ['price'],
      }),
    );
    await queryRunner.createIndex(
      'listings',
      new TableIndex({
        name: 'IDX_listings_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('listings', 'IDX_listings_status');
    await queryRunner.dropIndex('listings', 'IDX_listings_price');
    await queryRunner.dropIndex('listings', 'IDX_listings_city_district');
    await queryRunner.dropTable('listings');
    await queryRunner.query('DROP TYPE "listing_status"');
  }
}

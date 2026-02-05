import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateListingChanges20260128143100
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'listing_changes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'listingId', type: 'uuid' },
          { name: 'field', type: 'text' },
          { name: 'oldValue', type: 'text', isNullable: true },
          { name: 'newValue', type: 'text', isNullable: true },
          {
            name: 'changedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'listing_changes',
      new TableIndex({
        name: 'IDX_listing_changes_listing_id',
        columnNames: ['listingId'],
      }),
    );

    await queryRunner.createForeignKey(
      'listing_changes',
      new TableForeignKey({
        name: 'FK_listing_changes_listing_id',
        columnNames: ['listingId'],
        referencedTableName: 'listings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'listing_changes',
      'FK_listing_changes_listing_id',
    );
    await queryRunner.dropIndex(
      'listing_changes',
      'IDX_listing_changes_listing_id',
    );
    await queryRunner.dropTable('listing_changes');
  }
}

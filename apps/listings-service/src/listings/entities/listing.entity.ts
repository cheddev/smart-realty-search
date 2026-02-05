import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ListingStatus {
  Active = 'active',
  Sold = 'sold',
  Archived = 'archived',
}

@Entity({ name: 'listings' })
@Index(['city', 'district'])
@Index(['price'])
@Index(['status'])
export class ListingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  city: string;

  @Column({ type: 'text' })
  district: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'int' })
  rooms: number;

  @Column({ type: 'int' })
  area: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.Active })
  status: ListingStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

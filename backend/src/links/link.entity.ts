import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LinkCategoryEntity } from './link-category.entity';

@Entity('Link')
export class LinkEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 2048, nullable: false })
  url!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  faviconUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  categoryId!: number;

  @ManyToOne(() => LinkCategoryEntity, (cat) => cat.links, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category!: LinkCategoryEntity;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LinkEntity } from './link.entity';

@Entity('LinkCategory')
export class LinkCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true, type: 'varchar', length: 10 })
  emoji!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @OneToMany(() => LinkEntity, (link) => link.category, { cascade: ['remove'] })
  links!: LinkEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

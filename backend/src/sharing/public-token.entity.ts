import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export type ResourceType = 'recipe' | 'note';

@Entity('PublicToken')
export class PublicToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 20 })
  resourceType!: ResourceType;

  @Column({ type: 'int' })
  resourceId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt!: Date | null;
}

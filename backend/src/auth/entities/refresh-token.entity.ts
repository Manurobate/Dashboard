import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';

@Entity('RefreshToken')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, type: 'varchar', length: 500 })
  token!: string;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}

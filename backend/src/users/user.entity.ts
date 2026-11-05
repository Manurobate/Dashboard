import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

export type UserRole = 'admin' | 'user';

@Entity('User')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ nullable: false })
  name!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', default: 'user' })
  role!: UserRole;

  @Column({ default: true })
  mustChangePassword!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  triliumUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  notesEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => RefreshTokenEntity, (token) => token.user, {
    cascade: ['remove'],
  })
  refreshTokens!: RefreshTokenEntity[];
}

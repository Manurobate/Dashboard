import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';

@Entity('Recipe')
export class Recipe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category!: string | null;

  @Column({ type: 'int', default: 4 })
  servings!: number;

  @Column({ type: 'varchar', length: 2083, nullable: true })
  imageUrl!: string | null;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @OneToMany(() => RecipeIngredient, (ri) => ri.recipe, { cascade: ['remove'] })
  ingredients!: RecipeIngredient[];

  @OneToMany(() => RecipeStep, (rs) => rs.recipe, { cascade: ['remove'] })
  steps!: RecipeStep[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

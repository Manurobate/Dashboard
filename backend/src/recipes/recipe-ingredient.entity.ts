import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Recipe } from './recipe.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

@Entity('RecipeIngredient')
export class RecipeIngredient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  recipeId!: number;

  @ManyToOne(() => Recipe, (r) => r.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;
}

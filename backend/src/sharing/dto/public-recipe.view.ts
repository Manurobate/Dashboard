export interface PublicRecipeIngredientView {
  quantity: number;
  unit: string | null;
  name: string;
  position: number;
}

export interface PublicRecipeStepView {
  content: string;
  position: number;
}

export interface PublicRecipeView {
  title: string;
  avantPropos: string | null;
  imageUrl: string | null;
  servings: number;
  ingredients: PublicRecipeIngredientView[];
  steps: PublicRecipeStepView[];
}

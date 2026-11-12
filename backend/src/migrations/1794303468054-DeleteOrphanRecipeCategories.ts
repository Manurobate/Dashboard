import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supprime les catégories de recettes qui ne sont plus utilisées par aucune recette.
 * Nettoyage ponctuel des données existantes : la suppression est ensuite assurée par RecipesService.
 * Migration de données sans retour arrière (les catégories vides ne portent que leur nom).
 */
export class DeleteOrphanRecipeCategories1794303468054 implements MigrationInterface {
  name = 'DeleteOrphanRecipeCategories1794303468054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`RecipeCategory\` WHERE NOT EXISTS (SELECT 1 FROM \`Recipe\` WHERE \`Recipe\`.\`categoryId\` = \`RecipeCategory\`.\`id\`)`,
    );
  }

  public async down(): Promise<void> {
    // Rien à restaurer : les catégories supprimées n'étaient rattachées à aucune recette.
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

const mockRecipe = {
  id: 1,
  title: 'Tarte aux pommes',
  category: 'Desserts',
  servings: 4,
  imageUrl: null,
  userId: 42,
};

const mockUser = { id: 42 };

describe('RecipesController', () => {
  let controller: RecipesController;
  let recipesService: { findAll: jest.Mock };

  beforeEach(async () => {
    recipesService = {
      findAll: jest.fn().mockResolvedValue([mockRecipe]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [{ provide: RecipesService, useValue: recipesService }],
    }).compile();

    controller = module.get(RecipesController);
  });

  describe('findAll()', () => {
    it("retourne les recettes de l'utilisateur", async () => {
      const result = await controller.findAll(mockUser);
      expect(recipesService.findAll).toHaveBeenCalledWith(42);
      expect(result).toEqual([mockRecipe]);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

const mockRecipe = {
  id: 1,
  title: 'Tarte aux pommes',
  categoryId: 10,
  category: { id: 10, name: 'Desserts' },
  servings: 4,
  imageUrl: null,
  userId: 42,
  ingredients: [],
  steps: [],
};

const mockUser = { id: 42 };

describe('RecipesController', () => {
  let controller: RecipesController;
  let recipesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    recipesService = {
      findAll: jest.fn().mockResolvedValue([mockRecipe]),
      findOne: jest.fn().mockResolvedValue(mockRecipe),
      create: jest.fn().mockResolvedValue(mockRecipe),
      update: jest.fn().mockResolvedValue(mockRecipe),
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

  describe('findOne()', () => {
    it('retourne la recette correspondante', async () => {
      const result = await controller.findOne(mockUser, 1);
      expect(recipesService.findOne).toHaveBeenCalledWith(42, 1);
      expect(result).toEqual(mockRecipe);
    });

    it('propage NotFoundException du service', async () => {
      recipesService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(mockUser, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('crée une recette et la retourne', async () => {
      const dto = { title: 'Tarte', servings: 4, ingredients: [], steps: [] };
      const result = await controller.create(mockUser, dto as any);
      expect(recipesService.create).toHaveBeenCalledWith(42, dto);
      expect(result).toEqual(mockRecipe);
    });
  });

  describe('update()', () => {
    it('met à jour la recette et la retourne', async () => {
      const dto = { title: 'Tarte modifiée' };
      const result = await controller.update(mockUser, 1, dto as any);
      expect(recipesService.update).toHaveBeenCalledWith(42, 1, dto);
      expect(result).toEqual(mockRecipe);
    });

    it('propage NotFoundException du service', async () => {
      recipesService.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update(mockUser, 999, {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});

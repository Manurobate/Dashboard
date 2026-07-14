import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { RecipeCategoryEntity } from './recipe-category.entity';
import { PublicToken } from '../sharing/public-token.entity';

const mockCategory: Partial<RecipeCategoryEntity> = {
  id: 10,
  name: 'Desserts',
  userId: 42,
};

const mockRecipe: Partial<Recipe> = {
  id: 1,
  title: 'Tarte aux pommes',
  categoryId: 10,
  category: mockCategory as RecipeCategoryEntity,
  servings: 4,
  imageUrl: null,
  userId: 42,
  ingredients: [],
  steps: [],
};

describe('RecipesService', () => {
  let service: RecipesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const buildManager = (overrides: Record<string, jest.Mock> = {}) => ({
    create: jest
      .fn()
      .mockImplementation((_entity: unknown, data: unknown) => data),
    save: jest.fn().mockResolvedValue(mockRecipe),
    delete: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(mockRecipe),
    ...overrides,
  });

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const manager = buildManager();
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: getRepositoryToken(Recipe), useValue: repo },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get(RecipesService);
  });

  describe('findAll()', () => {
    it('retourne les recettes triées par catégorie puis titre', async () => {
      repo.find.mockResolvedValue([mockRecipe]);
      const result = await service.findAll(42);
      expect(result).toEqual([mockRecipe]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 42 },
        relations: ['category'],
        order: { category: { name: 'ASC' }, title: 'ASC' },
      });
    });

    it('ne retourne pas les recettes des autres utilisateurs', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll(99);
      expect(result).toEqual([]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 99 },
        relations: ['category'],
        order: { category: { name: 'ASC' }, title: 'ASC' },
      });
    });
  });

  describe('findOne()', () => {
    it('retourne la recette avec ses relations', async () => {
      repo.findOne.mockResolvedValue(mockRecipe);
      const result = await service.findOne(42, 1);
      expect(result).toEqual(mockRecipe);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 42 },
        relations: ['ingredients', 'steps', 'category'],
      });
    });

    it('lance NotFoundException si recette introuvable', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(42, 999)).rejects.toThrow(NotFoundException);
    });

    it('lance NotFoundException si userId différent', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('sauvegarde la recette + ingrédients + étapes via transaction', async () => {
      const manager = buildManager({
        save: jest
          .fn()
          .mockImplementation((_entityOrData: unknown, _data?: unknown) => {
            if (_data) return Promise.resolve(_data);
            return Promise.resolve({ ...(_entityOrData as object), id: 1 });
          }),
        findOne: jest.fn().mockResolvedValue(mockRecipe),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      const dto = {
        title: 'Tarte',
        categoryName: 'Desserts',
        ingredients: [{ quantity: 2, name: 'Pommes', unit: null }],
        steps: [{ content: 'Éplucher' }],
      };

      const result = await service.create(42, dto);
      expect(result).toEqual(mockRecipe);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('crée la catégorie si categoryName est fourni et inexistant', async () => {
      const newCat = { id: 99, name: 'Soupes', userId: 42 };
      const manager = buildManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockRecipe),
        save: jest
          .fn()
          .mockResolvedValueOnce(newCat)
          .mockResolvedValueOnce({ ...mockRecipe, categoryId: 99 }),
        create: jest
          .fn()
          .mockImplementation((_entity: unknown, data: unknown) => data),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      const result = await service.create(42, {
        title: 'Soupe',
        categoryName: 'Soupes',
      });
      expect(result).toBeDefined();
    });

    it('réutilise la catégorie existante si categoryName correspond', async () => {
      const existingCat = { id: 10, name: 'Desserts', userId: 42 };
      const manager = buildManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(existingCat)
          .mockResolvedValueOnce(mockRecipe),
        save: jest.fn().mockResolvedValue(mockRecipe),
        create: jest
          .fn()
          .mockImplementation((_entity: unknown, data: unknown) => data),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      const result = await service.create(42, {
        title: 'Tarte',
        categoryName: 'Desserts',
      });
      expect(result).toEqual(mockRecipe);
      expect(manager.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update()', () => {
    it('met à jour les champs de la recette', async () => {
      const manager = buildManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockRecipe)
          .mockResolvedValueOnce({ ...mockRecipe, title: 'Mis à jour' }),
        save: jest.fn().mockResolvedValue(mockRecipe),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.update(42, 1, { title: 'Mis à jour' });
      expect(manager.save).toHaveBeenCalled();
    });

    it('met à jour categoryId si categoryName est fourni', async () => {
      const existingCat = { id: 10, name: 'Desserts', userId: 42 };
      const manager = buildManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockRecipe)
          .mockResolvedValueOnce(existingCat)
          .mockResolvedValueOnce(mockRecipe),
        save: jest.fn().mockResolvedValue(mockRecipe),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.update(42, 1, { categoryName: 'Desserts' });
      expect(manager.save).toHaveBeenCalled();
    });

    it('remplace les ingrédients si fournis', async () => {
      const manager = buildManager({
        findOne: jest.fn().mockResolvedValue(mockRecipe),
        save: jest.fn().mockResolvedValue(mockRecipe),
        delete: jest.fn().mockResolvedValue(undefined),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.update(42, 1, {
        ingredients: [{ quantity: 1, name: 'Farine', unit: 'kg' }],
      });

      expect(manager.delete).toHaveBeenCalledWith(RecipeIngredient, {
        recipeId: 1,
      });
    });

    it('remplace les étapes si fournies', async () => {
      const manager = buildManager({
        findOne: jest.fn().mockResolvedValue(mockRecipe),
        save: jest.fn().mockResolvedValue(mockRecipe),
        delete: jest.fn().mockResolvedValue(undefined),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.update(42, 1, { steps: [{ content: 'Mélanger' }] });

      expect(manager.delete).toHaveBeenCalledWith(RecipeStep, { recipeId: 1 });
    });

    it('lance NotFoundException si recette introuvable', async () => {
      const manager = buildManager({
        findOne: jest.fn().mockResolvedValue(null),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await expect(
        service.update(42, 999, { title: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('supprime les PublicToken orphelins puis la recette dans une transaction', async () => {
      repo.findOne.mockResolvedValue(mockRecipe);
      const manager = buildManager({
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
      });
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.remove(42, 1);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.delete).toHaveBeenNthCalledWith(1, PublicToken, {
        resourceType: 'recipe',
        resourceId: 1,
      });
      expect(manager.delete).toHaveBeenNthCalledWith(2, Recipe, { id: 1 });
    });

    it('lance NotFoundException si la recette est introuvable', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(42, 999)).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lance ForbiddenException si la recette appartient à un autre utilisateur', async () => {
      repo.findOne.mockResolvedValue({ ...mockRecipe, userId: 7 });
      await expect(service.remove(42, 1)).rejects.toThrow(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});

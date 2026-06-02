import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecipesService } from './recipes.service';
import { Recipe } from './recipe.entity';

const mockRecipe: Partial<Recipe> = {
  id: 1,
  title: 'Tarte aux pommes',
  category: 'Desserts',
  servings: 4,
  imageUrl: null,
  userId: 42,
};

describe('RecipesService', () => {
  let service: RecipesService;
  let repo: { find: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: getRepositoryToken(Recipe), useValue: repo },
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
        order: { category: 'ASC', title: 'ASC' },
      });
    });

    it('ne retourne pas les recettes des autres utilisateurs', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll(99);
      expect(result).toEqual([]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 99 },
        order: { category: 'ASC', title: 'ASC' },
      });
    });
  });
});

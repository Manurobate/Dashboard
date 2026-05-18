import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LinkCategoriesService } from './link-categories.service';
import { LinkCategoryEntity } from './link-category.entity';

const mockCat: Partial<LinkCategoryEntity> = {
  id: 1,
  name: 'Dev',
  emoji: '💻',
  position: 0,
  userId: 42,
};

describe('LinkCategoriesService', () => {
  let service: LinkCategoriesService;
  let repo: jest.Mocked<Repository<LinkCategoryEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkCategoriesService,
        {
          provide: getRepositoryToken(LinkCategoryEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LinkCategoriesService>(LinkCategoriesService);
    repo = module.get(getRepositoryToken(LinkCategoryEntity));
  });

  describe('findAll', () => {
    it('retourne les catégories de l\'utilisateur triées par position ASC', async () => {
      const cats = [mockCat] as LinkCategoryEntity[];
      repo.find.mockResolvedValue(cats);
      const result = await service.findAll(42);
      expect(repo.find).toHaveBeenCalledWith({ where: { userId: 42 }, order: { position: 'ASC' } });
      expect(result).toEqual(cats);
    });
  });

  describe('create', () => {
    it('crée une catégorie avec position = max + 1', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 2 }),
      };
      repo.createQueryBuilder.mockReturnValue(qb as any);
      const newCat = { ...mockCat, position: 3 } as LinkCategoryEntity;
      repo.create.mockReturnValue(newCat);
      repo.save.mockResolvedValue(newCat);

      const result = await service.create(42, { name: 'Dev', emoji: '💻' });

      expect(repo.create).toHaveBeenCalledWith({ name: 'Dev', emoji: '💻', userId: 42, position: 3 });
      expect(result).toEqual(newCat);
    });

    it('crée avec position = 0 si aucune catégorie existante', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: null }),
      };
      repo.createQueryBuilder.mockReturnValue(qb as any);
      const newCat = { ...mockCat, position: 0 } as LinkCategoryEntity;
      repo.create.mockReturnValue(newCat);
      repo.save.mockResolvedValue(newCat);

      await service.create(42, { name: 'Dev' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }));
    });
  });

  describe('update', () => {
    it('met à jour et retourne la catégorie si ownership OK', async () => {
      const cat = { ...mockCat } as LinkCategoryEntity;
      repo.findOne.mockResolvedValue(cat);
      repo.save.mockResolvedValue({ ...cat, name: 'Nouveau' } as LinkCategoryEntity);

      const result = await service.update(42, 1, { name: 'Nouveau' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 42 } });
      expect(result.name).toBe('Nouveau');
    });

    it('lève NotFoundException si la catégorie n\'appartient pas à l\'utilisateur', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(99, 1, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('supprime la catégorie si ownership OK', async () => {
      const cat = { ...mockCat } as LinkCategoryEntity;
      repo.findOne.mockResolvedValue(cat);
      repo.remove.mockResolvedValue(cat);

      await service.remove(42, 1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 42 } });
      expect(repo.remove).toHaveBeenCalledWith(cat);
    });

    it('lève NotFoundException si la catégorie n\'appartient pas à l\'utilisateur', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(99, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('met à jour la position de chaque item avec vérification ownership', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as any);

      await service.reorder(42, [
        { id: 1, position: 0 },
        { id: 2, position: 1 },
      ]);

      expect(repo.update).toHaveBeenCalledTimes(2);
      expect(repo.update).toHaveBeenCalledWith({ id: 1, userId: 42 }, { position: 0 });
      expect(repo.update).toHaveBeenCalledWith({ id: 2, userId: 42 }, { position: 1 });
    });

    it('lève NotFoundException si un item n\'appartient pas à l\'utilisateur', async () => {
      repo.update.mockResolvedValue({ affected: 0 } as any);
      await expect(service.reorder(42, [{ id: 99, position: 0 }])).rejects.toThrow(NotFoundException);
    });
  });
});

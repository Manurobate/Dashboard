import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LinkCategoriesController } from './link-categories.controller';
import { LinkCategoriesService } from './link-categories.service';
import { LinkCategoryEntity } from './link-category.entity';

const mockUser = { id: 42, username: 'user@test.local', role: 'user' };

const mockCat: Partial<LinkCategoryEntity> = {
  id: 1,
  name: 'Dev',
  icon: null,
  position: 0,
  userId: 42,
};

describe('LinkCategoriesController', () => {
  let controller: LinkCategoriesController;
  let service: jest.Mocked<LinkCategoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkCategoriesController],
      providers: [
        {
          provide: LinkCategoriesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            reorder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LinkCategoriesController>(LinkCategoriesController);
    service = module.get(LinkCategoriesService);
  });

  describe('GET /link-categories', () => {
    it('200 — retourne toutes les catégories de l\'utilisateur', async () => {
      const cats = [mockCat] as LinkCategoryEntity[];
      service.findAll.mockResolvedValue(cats);
      const result = await controller.findAll(mockUser as any);
      expect(service.findAll).toHaveBeenCalledWith(42);
      expect(result).toEqual(cats);
    });
  });

  describe('POST /link-categories', () => {
    it('201 — crée une catégorie et la retourne', async () => {
      const cat = mockCat as LinkCategoryEntity;
      service.create.mockResolvedValue(cat);
      const result = await controller.create(mockUser as any, { name: 'Dev', icon: null });
      expect(service.create).toHaveBeenCalledWith(42, { name: 'Dev', icon: null });
      expect(result).toEqual(cat);
    });
  });

  describe('PATCH /link-categories/reorder', () => {
    it('204 — réordonne les catégories', async () => {
      service.reorder.mockResolvedValue();
      await controller.reorder(mockUser as any, { items: [{ id: 1, position: 0 }] });
      expect(service.reorder).toHaveBeenCalledWith(42, [{ id: 1, position: 0 }]);
    });
  });

  describe('PATCH /link-categories/:id', () => {
    it('200 — met à jour une catégorie', async () => {
      const updated = { ...mockCat, name: 'Updated' } as LinkCategoryEntity;
      service.update.mockResolvedValue(updated);
      const result = await controller.update(mockUser as any, 1, { name: 'Updated' });
      expect(service.update).toHaveBeenCalledWith(42, 1, { name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('404 — lève NotFoundException si catégorie introuvable', async () => {
      service.update.mockRejectedValue(new NotFoundException('Catégorie 99 introuvable'));
      await expect(controller.update(mockUser as any, 99, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DELETE /link-categories/:id', () => {
    it('204 — supprime une catégorie', async () => {
      service.remove.mockResolvedValue();
      await controller.remove(mockUser as any, 1);
      expect(service.remove).toHaveBeenCalledWith(42, 1);
    });

    it('404 — lève NotFoundException si catégorie introuvable', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Catégorie 99 introuvable'));
      await expect(controller.remove(mockUser as any, 99)).rejects.toThrow(NotFoundException);
    });
  });
});

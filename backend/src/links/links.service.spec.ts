import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinkEntity } from './link.entity';
import { LinkCategoryEntity } from './link-category.entity';

const mockLink: LinkEntity = {
  id: 1,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  position: 0,
  categoryId: 10,
  userId: 42,
  createdAt: new Date(),
  updatedAt: new Date(),
} as LinkEntity;

describe('LinksService', () => {
  let service: LinksService;
  let linkRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let categoryRepo: {
    findOne: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const mockQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ max: null }),
  };

  beforeEach(async () => {
    linkRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    categoryRepo = { findOne: jest.fn() };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (cb: (manager: any) => Promise<void>) =>
          cb({ update: linkRepo.update }),
        ),
    };
    // Reset query builder mocks
    mockQb.select.mockReturnThis();
    mockQb.where.mockReturnThis();
    mockQb.getRawOne.mockResolvedValue({ max: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: getRepositoryToken(LinkEntity), useValue: linkRepo },
        {
          provide: getRepositoryToken(LinkCategoryEntity),
          useValue: categoryRepo,
        },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get(LinksService);
  });

  describe('findAll()', () => {
    it('retourne les liens triés par categoryId puis position', async () => {
      linkRepo.find.mockResolvedValue([mockLink]);
      const result = await service.findAll(42);
      expect(result).toEqual([mockLink]);
      expect(linkRepo.find).toHaveBeenCalledWith({
        where: { userId: 42 },
        order: { categoryId: 'ASC', position: 'ASC' },
      });
    });
  });

  describe('create()', () => {
    it('crée un lien avec position = 0 quand aucun lien existant', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 10, userId: 42 });
      mockQb.getRawOne.mockResolvedValue({ max: null });
      linkRepo.create.mockReturnValue(mockLink);
      linkRepo.save.mockResolvedValue(mockLink);

      const dto = {
        url: 'https://example.com',
        title: 'Example',
        categoryId: 10,
      };
      const result = await service.create(42, dto);
      expect(result).toEqual(mockLink);
      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 0, userId: 42 }),
      );
    });

    it('crée un lien avec position = MAX + 1', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 10, userId: 42 });
      mockQb.getRawOne.mockResolvedValue({ max: 2 });
      const savedLink = { ...mockLink, position: 3 };
      linkRepo.create.mockReturnValue(savedLink);
      linkRepo.save.mockResolvedValue(savedLink);

      const result = await service.create(42, {
        url: 'https://a.com',
        title: 'A',
        categoryId: 10,
      });
      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }),
      );
      expect(result.position).toBe(3);
    });

    it("lève ForbiddenException si la catégorie n'appartient pas à l'utilisateur", async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(42, {
          url: 'https://a.com',
          title: 'A',
          categoryId: 99,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update()', () => {
    it('met à jour le lien si ownership ok', async () => {
      linkRepo.findOne.mockResolvedValue(mockLink);
      const updated = { ...mockLink, title: 'Updated' };
      linkRepo.save.mockResolvedValue(updated);

      const result = await service.update(42, 1, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it("lève NotFoundException si le lien n'appartient pas à l'utilisateur", async () => {
      linkRepo.findOne.mockResolvedValue(null);
      await expect(service.update(42, 99, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('met à jour le categoryId si fourni et si la catégorie appartient au userId', async () => {
      const linkWithCat = { ...mockLink, categoryId: 10 };
      linkRepo.findOne.mockResolvedValue(linkWithCat);
      categoryRepo.findOne.mockResolvedValue({ id: 20, userId: 42 });
      const updated = { ...linkWithCat, categoryId: 20 };
      linkRepo.save.mockResolvedValue(updated);

      const result = await service.update(42, 1, { categoryId: 20 });
      expect(result.categoryId).toBe(20);
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 20, userId: 42 },
      });
    });

    it('lève ForbiddenException si categoryId fourni mais catégorie introuvable', async () => {
      linkRepo.findOne.mockResolvedValue(mockLink);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(42, 1, { categoryId: 99 } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ne vérifie pas categoryId si non fourni dans le dto', async () => {
      linkRepo.findOne.mockResolvedValue(mockLink);
      linkRepo.save.mockResolvedValue(mockLink);

      await service.update(42, 1, { title: 'Sans catégorie' });
      expect(categoryRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('supprime le lien si ownership ok', async () => {
      linkRepo.findOne.mockResolvedValue(mockLink);
      linkRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(42, 1)).resolves.toBeUndefined();
      expect(linkRepo.remove).toHaveBeenCalledWith(mockLink);
    });

    it("lève NotFoundException si le lien n'appartient pas à l'utilisateur", async () => {
      linkRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(42, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder()', () => {
    it('met à jour les positions des liens', async () => {
      linkRepo.update.mockResolvedValue({ affected: 1 });
      await expect(
        service.reorder(42, [
          { id: 1, position: 0 },
          { id: 2, position: 1 },
        ]),
      ).resolves.toBeUndefined();
      expect(linkRepo.update).toHaveBeenCalledTimes(2);
    });

    it('lève NotFoundException si affected === 0', async () => {
      linkRepo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.reorder(42, [{ id: 99, position: 0 }]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

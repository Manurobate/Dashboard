import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { SharingService } from './sharing.service';
import { PublicToken } from './public-token.entity';
import { Recipe } from '../recipes/recipe.entity';
import { CreateShareDto } from './dto/create-share.dto';

const mockRecipe: Partial<Recipe> = { id: 1, title: 'Tarte', userId: 42 };

describe('SharingService', () => {
  let service: SharingService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let recipeRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data: unknown) => data),
      save: jest
        .fn()
        .mockImplementation((token: unknown) =>
          Promise.resolve({ id: 100, ...(token as object) }),
        ),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    recipeRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        { provide: getRepositoryToken(PublicToken), useValue: repo },
        { provide: getRepositoryToken(Recipe), useValue: recipeRepo },
      ],
    }).compile();

    service = module.get(SharingService);
  });

  describe('create()', () => {
    const dto: CreateShareDto = {
      resourceType: 'recipe',
      resourceId: 1,
      expiresIn: '7d',
    };

    it("génère un token pour une recette appartenant à l'utilisateur", async () => {
      recipeRepo.findOne.mockResolvedValue(mockRecipe);
      repo.find.mockResolvedValue([]);
      const result = await service.create(42, dto);
      expect(recipeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 42 },
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'recipe',
          resourceId: 1,
          userId: 42,
        }),
      );
      const created = repo.create.mock.calls[0][0];
      expect(typeof created.token).toBe('string');
      expect(created.token.length).toBeGreaterThan(0);
      expect(created.expiresAt).toBeInstanceOf(Date);
      expect(result).toMatchObject({ id: 100 });
    });

    it('calcule expiresAt = null pour permanent', async () => {
      recipeRepo.findOne.mockResolvedValue(mockRecipe);
      repo.find.mockResolvedValue([]);
      await service.create(42, { ...dto, expiresIn: 'permanent' });
      expect(repo.create.mock.calls[0][0].expiresAt).toBeNull();
    });

    it('lance NotFoundException si la recette appartient à un autre utilisateur', async () => {
      recipeRepo.findOne.mockResolvedValue(null);
      await expect(service.create(99, dto)).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('lance ConflictException si un lien actif existe déjà pour la recette', async () => {
      recipeRepo.findOne.mockResolvedValue(mockRecipe);
      repo.find.mockResolvedValue([
        { id: 7, expiresAt: null, revokedAt: null },
      ]);
      await expect(service.create(42, dto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('revoke()', () => {
    it("marque revokedAt sur un token appartenant à l'utilisateur", async () => {
      const token = { id: 5, userId: 42, revokedAt: null } as PublicToken;
      repo.findOne.mockResolvedValue(token);
      const result = await service.revoke(42, 5);
      expect(token.revokedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(token);
      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('est idempotent : ne réécrit pas revokedAt sur un token déjà révoqué', async () => {
      const alreadyRevoked = new Date('2026-01-01T00:00:00.000Z');
      const token = {
        id: 5,
        userId: 42,
        revokedAt: alreadyRevoked,
      } as PublicToken;
      repo.findOne.mockResolvedValue(token);
      const result = await service.revoke(42, 5);
      expect(result.revokedAt).toBe(alreadyRevoked);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('lance NotFoundException si le token est introuvable', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.revoke(42, 999)).rejects.toThrow(NotFoundException);
    });

    it('lance ForbiddenException si le token appartient à un autre utilisateur', async () => {
      repo.findOne.mockResolvedValue({ id: 5, userId: 7, revokedAt: null });
      await expect(service.revoke(42, 5)).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findActiveForResource()', () => {
    it('interroge les tokens non révoqués triés par createdAt DESC', async () => {
      repo.find.mockResolvedValue([]);
      await service.findActiveForResource(42, 'recipe', 1);
      expect(repo.find).toHaveBeenCalledWith({
        where: {
          userId: 42,
          resourceType: 'recipe',
          resourceId: 1,
          revokedAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });
    });

    it('filtre les tokens expirés et conserve les permanents / valides', async () => {
      const past = new Date(Date.now() - 1000);
      const future = new Date(Date.now() + 60_000);
      repo.find.mockResolvedValue([
        { id: 1, expiresAt: future },
        { id: 2, expiresAt: null },
        { id: 3, expiresAt: past },
      ]);
      const result = await service.findActiveForResource(42, 'recipe', 1);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });
  });
});

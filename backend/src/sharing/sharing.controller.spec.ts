import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';
import { CreateShareDto } from './dto/create-share.dto';

const mockUser = { id: 42 };
const mockToken = {
  id: 100,
  token: 'abc',
  resourceType: 'recipe',
  resourceId: 1,
  userId: 42,
};

describe('SharingController', () => {
  let controller: SharingController;
  let sharingService: {
    create: jest.Mock;
    revoke: jest.Mock;
    findActiveForResource: jest.Mock;
  };

  beforeEach(async () => {
    sharingService = {
      create: jest.fn().mockResolvedValue(mockToken),
      revoke: jest
        .fn()
        .mockResolvedValue({ ...mockToken, revokedAt: new Date() }),
      findActiveForResource: jest.fn().mockResolvedValue([mockToken]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharingController],
      providers: [{ provide: SharingService, useValue: sharingService }],
    }).compile();

    controller = module.get(SharingController);
  });

  describe('create()', () => {
    it('délègue au service avec le userId courant', async () => {
      const dto: CreateShareDto = {
        resourceType: 'recipe',
        resourceId: 1,
        expiresIn: '7d',
      };
      const result = await controller.create(mockUser, dto);
      expect(sharingService.create).toHaveBeenCalledWith(42, dto);
      expect(result).toEqual(mockToken);
    });
  });

  describe('revoke()', () => {
    it("délègue au service avec le userId courant et l'id", async () => {
      await controller.revoke(mockUser, 100);
      expect(sharingService.revoke).toHaveBeenCalledWith(42, 100);
    });
  });

  describe('findActiveForResource()', () => {
    it('retourne les tokens actifs pour resourceType=recipe', async () => {
      const result = await controller.findActiveForResource(
        mockUser,
        'recipe',
        '1',
      );
      expect(sharingService.findActiveForResource).toHaveBeenCalledWith(
        42,
        'recipe',
        1,
      );
      expect(result).toEqual([mockToken]);
    });

    it('rejette un resourceType différent de recipe avec BadRequestException', () => {
      expect(() =>
        controller.findActiveForResource(mockUser, 'note', '1'),
      ).toThrow(BadRequestException);
      expect(sharingService.findActiveForResource).not.toHaveBeenCalled();
    });

    it('rejette un resourceId non numérique avec BadRequestException', () => {
      expect(() =>
        controller.findActiveForResource(mockUser, 'recipe', 'abc'),
      ).toThrow(BadRequestException);
    });

    it('rejette un resourceId nul, négatif ou partiel avec BadRequestException', () => {
      for (const bad of ['0', '-5', '5abc', '1.5']) {
        expect(() =>
          controller.findActiveForResource(mockUser, 'recipe', bad),
        ).toThrow(BadRequestException);
      }
      expect(sharingService.findActiveForResource).not.toHaveBeenCalled();
    });
  });
});

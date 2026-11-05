import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TriliumController } from './trilium.controller';
import { TriliumService } from './trilium.service';

describe('TriliumController', () => {
  let controller: TriliumController;
  let triliumService: jest.Mocked<TriliumService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriliumController],
      providers: [
        {
          provide: TriliumService,
          useValue: { ping: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TriliumController>(TriliumController);
    triliumService = module.get(TriliumService);
  });

  describe('GET /trilium/ping', () => {
    it('délègue à triliumService.ping pour une URL http valide', async () => {
      (triliumService.ping as jest.Mock).mockResolvedValue({ reachable: true });

      const result = await controller.ping('https://trilium.example.fr');

      expect(triliumService.ping).toHaveBeenCalledWith(
        'https://trilium.example.fr',
      );
      expect(result).toEqual({ reachable: true });
    });

    it('rejette avec BadRequestException si url est absent', () => {
      expect(() => controller.ping('')).toThrow(BadRequestException);
      expect(triliumService.ping).not.toHaveBeenCalled();
    });

    it('rejette avec BadRequestException si url est malformée', () => {
      expect(() => controller.ping('not a url')).toThrow(BadRequestException);
      expect(triliumService.ping).not.toHaveBeenCalled();
    });

    it('rejette avec BadRequestException si url est un tableau (param répété)', () => {
      expect(() =>
        controller.ping(['https://a.example.fr', 'https://b.example.fr']),
      ).toThrow(BadRequestException);
      expect(triliumService.ping).not.toHaveBeenCalled();
    });

    it('rejette avec BadRequestException si url dépasse 2083 caractères', () => {
      const longUrl = `https://trilium.example.fr/${'a'.repeat(2083)}`;
      expect(() => controller.ping(longUrl)).toThrow(BadRequestException);
      expect(triliumService.ping).not.toHaveBeenCalled();
    });

    it('rejette avec BadRequestException si le protocole est ftp', () => {
      expect(() => controller.ping('ftp://trilium.example.fr')).toThrow(
        BadRequestException,
      );
      expect(triliumService.ping).not.toHaveBeenCalled();
    });
  });
});

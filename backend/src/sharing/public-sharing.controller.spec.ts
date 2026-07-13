import { Test, TestingModule } from '@nestjs/testing';
import { PublicSharingController } from './public-sharing.controller';
import { SharingService } from './sharing.service';
import { PublicRecipeView } from './dto/public-recipe.view';

const mockPublicRecipe: PublicRecipeView = {
  title: 'Tarte',
  avantPropos: null,
  imageUrl: null,
  servings: 4,
  ingredients: [],
  steps: [],
};

describe('PublicSharingController', () => {
  let controller: PublicSharingController;
  let sharingService: { findPublicRecipe: jest.Mock };

  beforeEach(async () => {
    sharingService = {
      findPublicRecipe: jest.fn().mockResolvedValue(mockPublicRecipe),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSharingController],
      providers: [{ provide: SharingService, useValue: sharingService }],
    }).compile();

    controller = module.get(PublicSharingController);
  });

  describe('getPublicResource()', () => {
    it('délègue à sharingService.findPublicRecipe avec le token', async () => {
      const result = await controller.getPublicResource('abc123');
      expect(sharingService.findPublicRecipe).toHaveBeenCalledWith('abc123');
      expect(result).toEqual(mockPublicRecipe);
    });

    it('expose les en-têtes anti-indexation et anti-cache (défense en profondeur)', () => {
      // @Header pose des métadonnées de réponse appliquées par Nest au niveau HTTP.
      const headers = Reflect.getMetadata(
        '__headers__',
        PublicSharingController.prototype.getPublicResource,
      );
      expect(headers).toEqual(
        expect.arrayContaining([
          { name: 'X-Robots-Tag', value: 'noindex' },
          { name: 'Cache-Control', value: 'private, no-store' },
        ]),
      );
    });
  });
});

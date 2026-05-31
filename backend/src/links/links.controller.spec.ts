import { Test, TestingModule } from '@nestjs/testing';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { OgFetchService } from '../og-fetch/og-fetch.service';

const mockLink = {
  id: 1,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  position: 0,
  categoryId: 10,
  userId: 42,
};

const mockUser = { id: 42 };

describe('LinksController', () => {
  let controller: LinksController;
  let linksService: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    reorder: jest.Mock;
  };
  let ogFetchService: { fetchOgData: jest.Mock };

  beforeEach(async () => {
    linksService = {
      findAll: jest.fn().mockResolvedValue([mockLink]),
      create: jest.fn().mockResolvedValue(mockLink),
      update: jest.fn().mockResolvedValue(mockLink),
      remove: jest.fn().mockResolvedValue(undefined),
      reorder: jest.fn().mockResolvedValue(undefined),
    };
    ogFetchService = {
      fetchOgData: jest.fn().mockResolvedValue({
        title: 'GitHub',
        faviconUrl: 'https://github.com/favicon.ico',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [
        { provide: LinksService, useValue: linksService },
        { provide: OgFetchService, useValue: ogFetchService },
      ],
    }).compile();

    controller = module.get(LinksController);
  });

  it('fetchOgPreview() délègue à OgFetchService', async () => {
    const result = await controller.fetchOgPreview('https://github.com');
    expect(ogFetchService.fetchOgData).toHaveBeenCalledWith(
      'https://github.com',
    );
    expect(result).toEqual({
      title: 'GitHub',
      faviconUrl: 'https://github.com/favicon.ico',
    });
  });

  it("findAll() retourne les liens de l'utilisateur", async () => {
    const result = await controller.findAll(mockUser);
    expect(linksService.findAll).toHaveBeenCalledWith(42);
    expect(result).toEqual([mockLink]);
  });

  it('create() crée un lien', async () => {
    const dto = {
      url: 'https://example.com',
      title: 'Example',
      categoryId: 10,
    };
    const result = await controller.create(mockUser, dto);
    expect(linksService.create).toHaveBeenCalledWith(42, dto);
    expect(result).toEqual(mockLink);
  });

  it('reorder() appelle LinksService.reorder', async () => {
    const dto = { items: [{ id: 1, position: 0 }] };
    await controller.reorder(mockUser, dto);
    expect(linksService.reorder).toHaveBeenCalledWith(42, dto.items);
  });

  it('update() met à jour un lien', async () => {
    const dto = { title: 'Updated' };
    const result = await controller.update(mockUser, 1, dto);
    expect(linksService.update).toHaveBeenCalledWith(42, 1, dto);
    expect(result).toEqual(mockLink);
  });

  it('remove() supprime un lien', async () => {
    await controller.remove(mockUser, 1);
    expect(linksService.remove).toHaveBeenCalledWith(42, 1);
  });
});

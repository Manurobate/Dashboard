import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

const mockUser: Partial<UserEntity> = {
  id: 1,
  username: 'admin@test.local',
  name: 'admin@test.local',
  passwordHash: '$2b$10$hashedpassword',
  role: 'admin',
  mustChangePassword: false,
  isActive: true,
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<UserEntity>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshTokenEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(UserEntity));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      (repo as any).find.mockResolvedValue([mockUser as UserEntity]);

      const result = await service.findAll();

      expect((repo as any).find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('admin@test.local');
    });

    it('should return empty array when no users', async () => {
      (repo as any).find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('updatePasswordHash', () => {
    it('should update passwordHash and return entity', async () => {
      const updatedUser = {
        ...mockUser,
        passwordHash: 'new-hash',
      } as UserEntity;
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updatedUser);

      const result = await service.updatePasswordHash(1, 'new-hash');

      expect((repo as any).update).toHaveBeenCalledWith(
        { id: 1 },
        { passwordHash: 'new-hash' },
      );
      expect(result.passwordHash).toBe('new-hash');
    });

    it('should throw NotFoundException when userId not found', async () => {
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 0 });
      repo.findOne.mockResolvedValue(null);

      await expect(service.updatePasswordHash(999, 'new-hash')).rejects.toThrow(
        'Not Found',
      );
    });
  });

  describe('findById', () => {
    it('should return user when id exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      const result = await service.findById(1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when id does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAdminCount', () => {
    it('should return count of admin users', async () => {
      (repo as any).count.mockResolvedValue(1);

      const result = await service.findAdminCount();

      expect((repo as any).count).toHaveBeenCalledWith({
        where: { role: 'admin' },
      });
      expect(result).toBe(1);
    });
  });

  describe('createUser', () => {
    it('should create and save user with isActive=true', async () => {
      const userData = {
        username: 'newuser@test.local',
        name: 'New User',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: false,
      };
      const createdUser = { ...userData, isActive: true, id: 2 };
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect((repo as any).create).toHaveBeenCalledWith({
        ...userData,
        isActive: true,
      });
      expect((repo as any).save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });

    it('should create user with name', async () => {
      const userData = {
        username: 'newuser@test.local',
        name: 'John Doe',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
      };
      const createdUser = { ...userData, isActive: true, id: 3 };
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect((repo as any).create).toHaveBeenCalledWith({
        ...userData,
        isActive: true,
      });
      expect(result.name).toBe('John Doe');
    });
  });

  describe('createUserWithTempPassword', () => {
    it('should create a user and return temporaryPassword', async () => {
      repo.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 5,
        username: 'newuser',
        name: 'New User',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
        isActive: true,
      } as UserEntity;
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUserWithTempPassword(
        'newuser',
        'New User',
      );

      expect(result.user).toEqual(createdUser);
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    });

    it('should set mustChangePassword=true and role=user', async () => {
      repo.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 6,
        username: 'testuser@test.local',
        name: 'Test User',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
        isActive: true,
      } as UserEntity;
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUserWithTempPassword(
        'testuser@test.local',
        'Test User',
      );

      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user.role).toBe('user');
      expect(result.user.isActive).toBe(true);
    });

    it('should generate a temporary password with base64url encoding (16 chars)', async () => {
      repo.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 7,
        username: 'passuser@test.local',
        name: 'Pass User',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
        isActive: true,
      } as UserEntity;
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUserWithTempPassword(
        'passuser@test.local',
        'Pass User',
      );

      // base64url from 12 bytes = 16 chars
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{16}$/);
    });

    it('should throw ConflictException when username already exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      await expect(
        service.createUserWithTempPassword('admin@test.local', 'Admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with correct message', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      await expect(
        service.createUserWithTempPassword('admin@test.local', 'Admin'),
      ).rejects.toThrow('Cette adresse email est déjà utilisée');
    });
  });

  describe('resetPasswordByAdmin', () => {
    const mockRegularUser: Partial<UserEntity> = {
      id: 2,
      username: 'user@test.local',
      name: 'Regular User',
      passwordHash: '$2b$10$hashedpassword',
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    };

    it('génère un mot de passe temporaire et met à jour le hash', async () => {
      repo.findOne.mockResolvedValue(mockRegularUser as UserEntity);
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 2 });

      const result = await service.resetPasswordByAdmin(2);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect((repo as any).update).toHaveBeenCalledWith(
        { id: 2 },
        expect.objectContaining({ mustChangePassword: true }),
      );
    });

    it('passe mustChangePassword à true', async () => {
      repo.findOne.mockResolvedValue(mockRegularUser as UserEntity);
      const updateMock = jest.fn().mockResolvedValue({ affected: 1 });
      (repo as any).update = updateMock;
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 0 });

      await service.resetPasswordByAdmin(2);

      expect(updateMock).toHaveBeenCalledWith(
        { id: 2 },
        expect.objectContaining({ mustChangePassword: true }),
      );
    });

    it("invalide tous les refresh tokens de l'utilisateur", async () => {
      repo.findOne.mockResolvedValue(mockRegularUser as UserEntity);
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      const deleteMock = jest.fn().mockResolvedValue({ affected: 3 });
      (refreshTokenRepo as any).delete = deleteMock;

      await service.resetPasswordByAdmin(2);

      expect(deleteMock).toHaveBeenCalledWith({ userId: 2 });
    });

    it('génère un mot de passe avec encodage base64url (16 chars)', async () => {
      repo.findOne.mockResolvedValue(mockRegularUser as UserEntity);
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 0 });

      const result = await service.resetPasswordByAdmin(2);

      expect(result).toMatch(/^[A-Za-z0-9_-]{16}$/);
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.resetPasswordByAdmin(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lance ForbiddenException si la cible est un administrateur', async () => {
      repo.findOne.mockResolvedValue({
        ...mockUser,
        role: 'admin',
      } as UserEntity);

      await expect(service.resetPasswordByAdmin(1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('disableUser', () => {
    const mockTargetUser: Partial<UserEntity> = {
      id: 2,
      username: 'user@test.local',
      role: 'user',
      isActive: true,
    };

    it('désactive le compte et invalide les tokens', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser as UserEntity);
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 1 });

      await service.disableUser(2, 1);

      expect((repo as any).update).toHaveBeenCalledWith(
        { id: 2 },
        { isActive: false },
      );
      expect((refreshTokenRepo as any).delete).toHaveBeenCalledWith({
        userId: 2,
      });
    });

    it('passe isActive à false', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser as UserEntity);
      const updateMock = jest.fn().mockResolvedValue({ affected: 1 });
      (repo as any).update = updateMock;
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 0 });

      await service.disableUser(2, 1);

      expect(updateMock).toHaveBeenCalledWith({ id: 2 }, { isActive: false });
    });

    it('lance ForbiddenException si targetId === requestingId', async () => {
      await expect(service.disableUser(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.disableUser(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lance ForbiddenException si désactivation du dernier administrateur actif', async () => {
      const mockAdminTarget: Partial<UserEntity> = {
        id: 2,
        username: 'other-admin@test.local',
        role: 'admin',
        isActive: true,
      };
      repo.findOne.mockResolvedValue(mockAdminTarget as UserEntity);
      repo.count.mockResolvedValue(1);

      await expect(service.disableUser(2, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteUser', () => {
    const mockTargetUser: Partial<UserEntity> = {
      id: 2,
      username: 'user@test.local',
      role: 'user',
      isActive: true,
    };

    it('supprime les refresh tokens puis le compte', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser as UserEntity);
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 2 });
      (repo as any).delete = jest.fn().mockResolvedValue({ affected: 1 });

      await service.deleteUser(2, 1);

      const deleteCalls = (refreshTokenRepo as any).delete.mock.calls;
      expect(deleteCalls[0][0]).toEqual({ userId: 2 });
      expect((repo as any).delete).toHaveBeenCalledWith({ id: 2 });
    });

    it('appelle userRepository.delete avec le bon id', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser as UserEntity);
      (refreshTokenRepo as any).delete.mockResolvedValue({ affected: 0 });
      const deleteMock = jest.fn().mockResolvedValue({ affected: 1 });
      (repo as any).delete = deleteMock;

      await service.deleteUser(2, 1);

      expect(deleteMock).toHaveBeenCalledWith({ id: 2 });
    });

    it('lance ForbiddenException si targetId === requestingId', async () => {
      await expect(service.deleteUser(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deleteUser(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lance ForbiddenException si suppression du dernier administrateur actif', async () => {
      const mockAdminTarget: Partial<UserEntity> = {
        id: 2,
        username: 'other-admin@test.local',
        role: 'admin',
        isActive: true,
      };
      repo.findOne.mockResolvedValue(mockAdminTarget as UserEntity);
      repo.count.mockResolvedValue(1);

      await expect(service.deleteUser(2, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('enableUser', () => {
    const mockInactiveUser: Partial<UserEntity> = {
      id: 2,
      username: 'user@test.local',
      role: 'user',
      isActive: false,
    };

    it('réactive le compte (isActive à true)', async () => {
      repo.findOne.mockResolvedValue(mockInactiveUser as UserEntity);
      const updateMock = jest.fn().mockResolvedValue({ affected: 1 });
      (repo as any).update = updateMock;

      await service.enableUser(2);

      expect(updateMock).toHaveBeenCalledWith({ id: 2 }, { isActive: true });
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.enableUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('met à jour le name et retourne le user mis à jour', async () => {
      const updatedUser = { ...mockUser, name: 'Nouveau Nom' } as UserEntity;
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, 'Nouveau Nom');

      expect((repo as any).update).toHaveBeenCalledWith(
        { id: 1 },
        { name: 'Nouveau Nom' },
      );
      expect(result.name).toBe('Nouveau Nom');
    });

    it('lance NotFoundException si utilisateur introuvable après update', async () => {
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 0 });
      repo.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(999, 'Nom')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getNotesSettings', () => {
    it('retourne { triliumUrl, notesEnabled } depuis le user', async () => {
      repo.findOne.mockResolvedValue({
        ...mockUser,
        triliumUrl: 'https://trilium.example.fr',
        notesEnabled: true,
      } as UserEntity);

      const result = await service.getNotesSettings(1);

      expect(result).toEqual({
        triliumUrl: 'https://trilium.example.fr',
        notesEnabled: true,
      });
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getNotesSettings(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateNotesSettings', () => {
    it('appelle update avec les champs fournis et retourne les valeurs rechargées', async () => {
      repo.findOne.mockResolvedValue({
        ...mockUser,
        triliumUrl: 'https://trilium.example.fr',
        notesEnabled: true,
      } as UserEntity);
      const updateMock = jest.fn().mockResolvedValue({ affected: 1 });
      (repo as any).update = updateMock;

      const dto = {
        notesEnabled: true,
        triliumUrl: 'https://trilium.example.fr',
      };
      const result = await service.updateNotesSettings(1, dto);

      expect(updateMock).toHaveBeenCalledWith({ id: 1 }, dto);
      expect(result).toEqual({
        triliumUrl: 'https://trilium.example.fr',
        notesEnabled: true,
      });
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateNotesSettings(999, { notesEnabled: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return user when username exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      const result = await service.findByUsername('admin@test.local');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { username: 'admin@test.local' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when username does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('unknown@test.local');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { username: 'unknown@test.local' },
      });
      expect(result).toBeNull();
    });
  });
});

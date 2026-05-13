import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { UserListItemDto } from './dto/user-list-item.dto';
import { CreateUserDto } from './dto/create-user.dto';

const mockUser: Partial<UserEntity> = {
  id: 1,
  username: 'admin',
  name: 'Admin User',
  passwordHash: '$2b$10$hashedpassword',
  role: 'admin',
  mustChangePassword: false,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            createUserWithTempPassword: jest.fn(),
            resetPasswordByAdmin: jest.fn(),
            disableUser: jest.fn(),
            enableUser: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('findAll', () => {
    it('should call usersService.findAll and return DTOs', async () => {
      usersService.findAll.mockResolvedValue([mockUser as UserEntity]);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(UserListItemDto);
    });

    it('should never include passwordHash in the response', async () => {
      usersService.findAll.mockResolvedValue([mockUser as UserEntity]);

      const result = await controller.findAll();

      expect(
        (result[0] as Record<string, unknown>)['passwordHash'],
      ).toBeUndefined();
    });

    it('should never include refreshTokens in the response', async () => {
      usersService.findAll.mockResolvedValue([mockUser as UserEntity]);

      const result = await controller.findAll();

      expect(
        (result[0] as Record<string, unknown>)['refreshTokens'],
      ).toBeUndefined();
    });

    it('should return empty array when no users', async () => {
      usersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toHaveLength(0);
    });

    it('should map name to empty string when null', async () => {
      const userWithNoName = {
        ...mockUser,
        name: null,
      } as unknown as UserEntity;
      usersService.findAll.mockResolvedValue([userWithNoName]);

      const result = await controller.findAll();

      expect(result[0].name).toBe('');
    });
  });

  describe('resetPassword', () => {
    it('retourne 200 avec temporaryPassword', async () => {
      const tempPwd = 'TempAbcDef1234';
      (usersService as any).resetPasswordByAdmin.mockResolvedValue(tempPwd);

      const result = await controller.resetPassword(1);

      expect((usersService as any).resetPasswordByAdmin).toHaveBeenCalledWith(
        1,
      );
      expect(result.temporaryPassword).toBe(tempPwd);
    });

    it('retourne 404 si userId inconnu', async () => {
      (usersService as any).resetPasswordByAdmin.mockRejectedValue(
        new NotFoundException('Utilisateur 999 introuvable'),
      );

      await expect(controller.resetPassword(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('disableUser', () => {
    const mockReq = { user: { id: 1 } } as Request & { user: { id: number } };

    it('retourne 204 (void) quand le compte est désactivé', async () => {
      (usersService as any).disableUser.mockResolvedValue(undefined);

      const result = await controller.disableUser(2, mockReq);

      expect((usersService as any).disableUser).toHaveBeenCalledWith(2, 1);
      expect(result).toBeUndefined();
    });

    it('retourne 403 si targetId === requestingId', async () => {
      (usersService as any).disableUser.mockRejectedValue(
        new ForbiddenException('Impossible de désactiver son propre compte'),
      );

      await expect(controller.disableUser(1, mockReq)).rejects.toThrow(ForbiddenException);
    });

    it('retourne 404 si userId inconnu', async () => {
      (usersService as any).disableUser.mockRejectedValue(
        new NotFoundException('Utilisateur 999 introuvable'),
      );

      await expect(controller.disableUser(999, mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    const mockReq = { user: { id: 1 } } as Request & { user: { id: number } };

    it('retourne 204 (void) quand le compte est supprimé', async () => {
      (usersService as any).deleteUser.mockResolvedValue(undefined);

      const result = await controller.deleteUser(2, mockReq);

      expect((usersService as any).deleteUser).toHaveBeenCalledWith(2, 1);
      expect(result).toBeUndefined();
    });

    it('retourne 403 si targetId === requestingId', async () => {
      (usersService as any).deleteUser.mockRejectedValue(
        new ForbiddenException('Impossible de supprimer son propre compte'),
      );

      await expect(controller.deleteUser(1, mockReq)).rejects.toThrow(ForbiddenException);
    });

    it('retourne 404 si userId inconnu', async () => {
      (usersService as any).deleteUser.mockRejectedValue(
        new NotFoundException('Utilisateur 999 introuvable'),
      );

      await expect(controller.deleteUser(999, mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableUser', () => {
    it('retourne 204 (void) quand le compte est réactivé', async () => {
      (usersService as any).enableUser.mockResolvedValue(undefined);

      const result = await controller.enableUser(2);

      expect((usersService as any).enableUser).toHaveBeenCalledWith(2);
      expect(result).toBeUndefined();
    });

    it('retourne 404 si userId inconnu', async () => {
      (usersService as any).enableUser.mockRejectedValue(
        new NotFoundException('Utilisateur 999 introuvable'),
      );

      await expect(controller.enableUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const newUser: Partial<UserEntity> = {
      id: 2,
      username: 'newuser',
      name: 'New User',
      passwordHash: '$2b$12$hashedtemp',
      role: 'user',
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date('2026-05-12'),
      updatedAt: new Date('2026-05-12'),
    };

    it('should create a user and return CreateUserResponseDto with temporaryPassword', async () => {
      const tempPassword = 'TempPass1234XY';
      (usersService as any).createUserWithTempPassword.mockResolvedValue({
        user: newUser as UserEntity,
        temporaryPassword: tempPassword,
      });

      const dto: CreateUserDto = { username: 'newuser', name: 'New User' };
      const result = await controller.create(dto);

      expect(
        (usersService as any).createUserWithTempPassword,
      ).toHaveBeenCalledWith('newuser', 'New User');
      expect(result.user).toBeInstanceOf(UserListItemDto);
      expect(result.temporaryPassword).toBe(tempPassword);
    });

    it('should never include passwordHash in the response', async () => {
      const tempPassword = 'TempPass1234XY';
      (usersService as any).createUserWithTempPassword.mockResolvedValue({
        user: newUser as UserEntity,
        temporaryPassword: tempPassword,
      });

      const dto: CreateUserDto = { username: 'newuser' };
      const result = await controller.create(dto);

      expect(
        (result.user as Record<string, unknown>)['passwordHash'],
      ).toBeUndefined();
    });

    it('should set mustChangePassword=true and role=user in the response', async () => {
      (usersService as any).createUserWithTempPassword.mockResolvedValue({
        user: newUser as UserEntity,
        temporaryPassword: 'somepassword',
      });

      const dto: CreateUserDto = { username: 'newuser' };
      const result = await controller.create(dto);

      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user.role).toBe('user');
    });

    it('should propagate ConflictException when username already exists', async () => {
      (usersService as any).createUserWithTempPassword.mockRejectedValue(
        new ConflictException('Cet identifiant est déjà utilisé'),
      );

      const dto: CreateUserDto = { username: 'admin' };

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});

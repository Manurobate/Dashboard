import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
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
          useValue: { findAll: jest.fn(), createUserWithTempPassword: jest.fn() },
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

      expect((result[0] as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('should never include refreshTokens in the response', async () => {
      usersService.findAll.mockResolvedValue([mockUser as UserEntity]);

      const result = await controller.findAll();

      expect((result[0] as Record<string, unknown>)['refreshTokens']).toBeUndefined();
    });

    it('should return empty array when no users', async () => {
      usersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toHaveLength(0);
    });

    it('should map name to empty string when null', async () => {
      const userWithNoName = { ...mockUser, name: null } as unknown as UserEntity;
      usersService.findAll.mockResolvedValue([userWithNoName]);

      const result = await controller.findAll();

      expect(result[0].name).toBe('');
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

      expect((usersService as any).createUserWithTempPassword).toHaveBeenCalledWith('newuser', 'New User');
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

      expect((result.user as Record<string, unknown>)['passwordHash']).toBeUndefined();
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

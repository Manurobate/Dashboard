import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { UserListItemDto } from './dto/user-list-item.dto';

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
          useValue: { findAll: jest.fn() },
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
});

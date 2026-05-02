import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';

const mockUser: Partial<UserEntity> = {
  id: 1,
  username: 'admin',
  passwordHash: '$2b$10$hashedpassword',
  role: 'admin',
  mustChangePassword: false,
  isActive: true,
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(UserEntity));
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

      expect((repo as any).count).toHaveBeenCalledWith({ where: { role: 'admin' } });
      expect(result).toBe(1);
    });
  });

  describe('createUser', () => {
    it('should create and save user with isActive=true', async () => {
      const userData = {
        username: 'newuser',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: false,
      };
      const createdUser = { ...userData, isActive: true, id: 2 };
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect((repo as any).create).toHaveBeenCalledWith({ ...userData, isActive: true });
      expect((repo as any).save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('findByUsername', () => {
    it('should return user when username exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      const result = await service.findByUsername('admin');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { username: 'admin' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when username does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('unknown');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { username: 'unknown' } });
      expect(result).toBeNull();
    });
  });
});

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
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(UserEntity));
  });

  describe('updatePasswordHash', () => {
    it('should update passwordHash and return entity', async () => {
      const updatedUser = { ...mockUser, passwordHash: 'new-hash' } as UserEntity;
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updatedUser);

      const result = await service.updatePasswordHash(1, 'new-hash');

      expect((repo as any).update).toHaveBeenCalledWith({ id: 1 }, { passwordHash: 'new-hash' });
      expect(result.passwordHash).toBe('new-hash');
    });

    it('should throw NotFoundException when userId not found', async () => {
      (repo as any).update = jest.fn().mockResolvedValue({ affected: 0 });
      repo.findOne.mockResolvedValue(null);

      await expect(service.updatePasswordHash(999, 'new-hash')).rejects.toThrow('Not Found');
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

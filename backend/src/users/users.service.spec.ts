import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';

const mockUser: Partial<UserEntity> = {
  id: 1,
  username: 'admin',
  name: '',
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
            find: jest.fn(),
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

  describe('findAll', () => {
    it('should return all users', async () => {
      (repo as any).find.mockResolvedValue([mockUser as UserEntity]);

      const result = await service.findAll();

      expect((repo as any).find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('admin');
    });

    it('should return empty array when no users', async () => {
      (repo as any).find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
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

    it('should create user with optional name', async () => {
      const userData = {
        username: 'newuser',
        name: 'John Doe',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
      };
      const createdUser = { ...userData, isActive: true, id: 3 };
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect((repo as any).create).toHaveBeenCalledWith({ ...userData, isActive: true });
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

      const result = await service.createUserWithTempPassword('newuser', 'New User');

      expect(result.user).toEqual(createdUser);
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    });

    it('should set mustChangePassword=true and role=user', async () => {
      repo.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 6,
        username: 'testuser',
        name: undefined,
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
        isActive: true,
      } as unknown as UserEntity;
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUserWithTempPassword('testuser');

      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user.role).toBe('user');
      expect(result.user.isActive).toBe(true);
    });

    it('should generate a temporary password with base64url encoding (16 chars)', async () => {
      repo.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 7,
        username: 'passuser',
        passwordHash: 'hashed',
        role: 'user' as const,
        mustChangePassword: true,
        isActive: true,
      } as UserEntity;
      (repo as any).create.mockReturnValue(createdUser);
      (repo as any).save.mockResolvedValue(createdUser);

      const result = await service.createUserWithTempPassword('passuser');

      // base64url from 12 bytes = 16 chars
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{16}$/);
    });

    it('should throw ConflictException when username already exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      await expect(
        service.createUserWithTempPassword('admin'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with correct message', async () => {
      repo.findOne.mockResolvedValue(mockUser as UserEntity);

      await expect(
        service.createUserWithTempPassword('admin'),
      ).rejects.toThrow('Cet identifiant est déjà utilisé');
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

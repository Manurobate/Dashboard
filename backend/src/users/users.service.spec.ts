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
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(UserEntity));
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

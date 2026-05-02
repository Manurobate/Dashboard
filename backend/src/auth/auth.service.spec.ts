import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/user.entity';

const mockUser: UserEntity = {
  id: 1,
  username: 'admin',
  passwordHash: '',
  role: 'admin',
  mustChangePassword: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: [],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let refreshTokenRepo: { save: jest.Mock };

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockUser.passwordHash = hashedPassword;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockImplementation((key: string, def?: unknown) => def) },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: { save: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin', 'password123');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByUsername.mockResolvedValue(inactiveUser as UserEntity);

      const result = await service.validateUser('admin', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken', async () => {
      const result = await service.login(mockUser);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBe(64);
    });

    it('should save hashed refresh token (not raw) in repository', async () => {
      await service.login(mockUser);

      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });

    it('should sign JWT with correct payload', async () => {
      await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
    });
  });

  describe('me', () => {
    it('should return user without passwordHash', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.me(1);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokens');
      expect(result).toHaveProperty('username', 'admin');
    });

    it('should return null when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      const result = await service.me(999);

      expect(result).toBeNull();
    });
  });
});

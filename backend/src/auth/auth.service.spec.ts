import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
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
  let refreshTokenRepo: { save: jest.Mock; findOne: jest.Mock; delete: jest.Mock };

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
          useValue: {
            save: jest.fn().mockResolvedValue({}),
            findOne: jest.fn(),
            delete: jest.fn().mockResolvedValue({}),
          },
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

  describe('logout', () => {
    it('should delete hashed token when rawToken is provided', async () => {
      const rawToken = 'a'.repeat(64);
      refreshTokenRepo.delete.mockResolvedValue({});

      await service.logout(rawToken);

      const deletedHash = (refreshTokenRepo.delete.mock.calls[0][0] as { token: string }).token;
      expect(deletedHash).toMatch(/^[a-f0-9]{64}$/);

      refreshTokenRepo.delete.mockClear();
      await service.logout('b'.repeat(64));
      const secondHash = (refreshTokenRepo.delete.mock.calls[0][0] as { token: string }).token;
      expect(secondHash).toMatch(/^[a-f0-9]{64}$/);
      expect(secondHash).not.toBe(deletedHash);
    });

    it('should not call delete when rawToken is undefined', async () => {
      await service.logout(undefined);

      expect(refreshTokenRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiredDate = new Date(Date.now() - 1000);
    const rawToken = 'a'.repeat(64);

    it('should return new tokens and user on valid token with rotation', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ id: 10, token: 'hashed', userId: 1, expiresAt: futureDate });
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh(rawToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith(10);
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is expired and clean it up', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ id: 11, token: 'hashed', userId: 1, expiresAt: expiredDate });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith(11);
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ id: 12, token: 'hashed', userId: 1, expiresAt: futureDate });
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false } as UserEntity);

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});

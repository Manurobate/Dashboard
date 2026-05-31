import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/user.entity';

const mockUser: UserEntity = {
  id: 1,
  username: 'admin',
  name: 'Admin',
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
  let usersService: jest.Mocked<UsersService> & {
    updatePasswordAndClearFlag: jest.Mock;
    updatePasswordHash: jest.Mock;
  };
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenRepo: {
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            findById: jest.fn(),
            updatePasswordAndClearFlag: jest.fn(),
            updatePasswordHash: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((_key: string, def?: unknown) => def),
          },
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
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
  });

  describe('changePassword', () => {
    it('should hash with cost ≥12, set mustChangePassword=false, and return safeUser', async () => {
      const updatedUser: UserEntity = {
        ...mockUser,
        mustChangePassword: false,
        passwordHash: 'new-hash',
      };
      usersService.updatePasswordAndClearFlag = jest
        .fn()
        .mockResolvedValue(updatedUser);

      const result = await service.changePassword(
        1,
        'newPassword1',
        'newPassword1',
      );

      const callArgs = (usersService.updatePasswordAndClearFlag as jest.Mock)
        .mock.calls[0];
      const storedHash = callArgs[1] as string;
      const isHashValid = await bcrypt.compare('newPassword1', storedHash);
      expect(isHashValid).toBe(true);

      const cost = parseInt(storedHash.split('$')[2], 10);
      expect(cost).toBeGreaterThanOrEqual(12);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokens');
      expect(result).toHaveProperty('mustChangePassword', false);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.changePassword(1, 'password1', 'password2'),
      ).rejects.toThrow(
        new BadRequestException('Les mots de passe ne correspondent pas'),
      );
    });

    it('should return safeUser with correct fields after updatePasswordAndClearFlag', async () => {
      const updatedUser: UserEntity = {
        ...mockUser,
        mustChangePassword: false,
        passwordHash: 'hashed',
      };
      usersService.updatePasswordAndClearFlag = jest
        .fn()
        .mockResolvedValue(updatedUser);

      const result = await service.changePassword(1, 'samePass1', 'samePass1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          username: 'admin',
          mustChangePassword: false,
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokens');
    });
  });

  describe('updatePassword', () => {
    it('should hash with cost 12, keep mustChangePassword unchanged, and return safeUser', async () => {
      const userWithPwd = { ...mockUser, mustChangePassword: false };
      userWithPwd.passwordHash = await bcrypt.hash('currentPass1', 10);
      usersService.findById.mockResolvedValue(userWithPwd);

      const updatedUser: UserEntity = {
        ...userWithPwd,
        passwordHash: 'new-hash',
      };
      usersService.updatePasswordHash = jest
        .fn()
        .mockResolvedValue(updatedUser);

      const result = await service.updatePassword(
        1,
        'currentPass1',
        'newPass123',
        'newPass123',
      );

      const callArgs = (usersService.updatePasswordHash as jest.Mock).mock
        .calls[0];
      const storedHash = callArgs[1] as string;
      const isValid = await bcrypt.compare('newPass123', storedHash);
      expect(isValid).toBe(true);

      const cost = parseInt(storedHash.split('$')[2], 10);
      expect(cost).toBeGreaterThanOrEqual(12);

      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({ userId: 1 });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokens');
      expect(result).toHaveProperty('mustChangePassword', false);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      await expect(
        service.updatePassword(1, 'wrongPass', 'newPass123', 'newPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new passwords do not match', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      await expect(
        service.updatePassword(1, 'password123', 'newPass123', 'differentPass'),
      ).rejects.toThrow(
        new BadRequestException('Les mots de passe ne correspondent pas'),
      );
    });

    it('should throw BadRequestException when new password equals current password', async () => {
      const hashedCurrentPass = await bcrypt.hash('currentPass1', 10);
      usersService.findById.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedCurrentPass,
      });

      await expect(
        service.updatePassword(
          1,
          'currentPass1',
          'currentPass1',
          'currentPass1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Le nouveau mot de passe doit être différent du mot de passe actuel',
        ),
      );
    });

    it('should throw UnauthorizedException when userId not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.updatePassword(999, 'currentPass1', 'newPass123', 'newPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });
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
      usersService.findByUsername.mockResolvedValue(inactiveUser);

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

      const deletedHash = (
        refreshTokenRepo.delete.mock.calls[0][0] as { token: string }
      ).token;
      expect(deletedHash).toMatch(/^[a-f0-9]{64}$/);

      refreshTokenRepo.delete.mockClear();
      await service.logout('b'.repeat(64));
      const secondHash = (
        refreshTokenRepo.delete.mock.calls[0][0] as { token: string }
      ).token;
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
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 10,
        token: 'hashed',
        userId: 1,
        expiresAt: futureDate,
      });
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh(rawToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith(10);
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is expired and clean it up', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 11,
        token: 'hashed',
        userId: 1,
        expiresAt: expiredDate,
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith(11);
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 12,
        token: 'hashed',
        userId: 1,
        expiresAt: futureDate,
      });
      usersService.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

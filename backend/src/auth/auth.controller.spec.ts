import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from '../users/user.entity';

const mockUser: Partial<UserEntity> = {
  id: 1,
  username: 'admin',
  role: 'admin',
  mustChangePassword: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 5 }] }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 'mock-jwt',
              refreshToken: 'mock-refresh',
            }),
            me: jest.fn().mockResolvedValue(mockUser),
            refresh: jest.fn().mockResolvedValue({
              accessToken: 'new-jwt',
              refreshToken: 'new-refresh',
              user: mockUser,
            }),
            logout: jest.fn().mockResolvedValue(undefined),
            changePassword: jest.fn().mockResolvedValue({ ...mockUser, mustChangePassword: false }),
            updatePassword: jest.fn().mockResolvedValue({ ...mockUser, mustChangePassword: false }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, def?: unknown) => {
              if (key === 'JWT_EXPIRY') return '15m';
              if (key === 'REFRESH_TOKEN_EXPIRY_DAYS') return 30;
              return def;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('should call authService.login and set cookies', async () => {
      const mockReq = { user: { ...mockUser, passwordHash: 'hash', refreshTokens: [] } } as any;
      const mockRes = { cookie: jest.fn() } as any;

      const result = await controller.login(mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(mockReq.user);
      expect(mockRes.cookie).toHaveBeenCalledWith('jwt', 'mock-jwt', expect.objectContaining({ httpOnly: true }));
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'mock-refresh', expect.objectContaining({ httpOnly: true, path: '/api/auth' }));
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokens');
    });
  });

  describe('me', () => {
    it('should return user from authService.me', async () => {
      const result = await controller.me({ id: 1 } as any);

      expect(authService.me).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and set new cookies on success', async () => {
      const mockReq = { cookies: { refresh_token: 'raw-token' } } as any;
      const mockRes = { cookie: jest.fn() } as any;

      const result = await controller.refresh(mockReq, mockRes);

      expect(authService.refresh).toHaveBeenCalledWith('raw-token');
      expect(mockRes.cookie).toHaveBeenCalledWith('jwt', 'new-jwt', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        path: '/',
      }));
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        path: '/api/auth',
      }));
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when refresh_token cookie is absent', async () => {
      const mockReq = { cookies: {} } as any;
      const mockRes = { cookie: jest.fn() } as any;

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate UnauthorizedException from authService.refresh', async () => {
      authService.refresh.mockRejectedValue(new UnauthorizedException());
      const mockReq = { cookies: { refresh_token: 'expired-token' } } as any;
      const mockRes = { cookie: jest.fn() } as any;

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should return 200 with safeUser (mustChangePassword=false) on success', async () => {
      const dto = { newPassword: 'newPass123', confirmPassword: 'newPass123' };
      const result = await controller.changePassword({ id: 1 } as any, dto as any);

      expect(authService.changePassword).toHaveBeenCalledWith(1, 'newPass123', 'newPass123');
      expect(result).toEqual(expect.objectContaining({ mustChangePassword: false }));
    });

    it('should propagate BadRequestException on password mismatch (delegated to service)', async () => {
      authService.changePassword.mockRejectedValue(
        new BadRequestException('Les mots de passe ne correspondent pas'),
      );
      const dto = { newPassword: 'pass1234', confirmPassword: 'pass5678' };

      await expect(
        controller.changePassword({ id: 1 } as any, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePassword', () => {
    it('should return 200 with safeUser on success', async () => {
      const dto = { currentPassword: 'currentPass1', newPassword: 'newPass123', confirmPassword: 'newPass123' };
      const result = await controller.updatePassword({ id: 1 } as any, dto as any);

      expect(authService.updatePassword).toHaveBeenCalledWith(1, 'currentPass1', 'newPass123', 'newPass123');
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('should propagate UnauthorizedException on incorrect current password', async () => {
      authService.updatePassword.mockRejectedValue(new UnauthorizedException('Mot de passe actuel incorrect'));
      const dto = { currentPassword: 'wrong', newPassword: 'newPass123', confirmPassword: 'newPass123' };

      await expect(
        controller.updatePassword({ id: 1 } as any, dto as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate BadRequestException on passwords mismatch', async () => {
      authService.updatePassword.mockRejectedValue(
        new BadRequestException('Les mots de passe ne correspondent pas'),
      );
      const dto = { currentPassword: 'currentPass1', newPassword: 'newPass123', confirmPassword: 'different' };

      await expect(
        controller.updatePassword({ id: 1 } as any, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear both cookies on success', async () => {
      const mockReq = { cookies: { refresh_token: 'raw-token' } } as any;
      const mockRes = { clearCookie: jest.fn() } as any;

      await controller.logout(mockReq, mockRes);

      expect(authService.logout).toHaveBeenCalledWith('raw-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt', expect.objectContaining({ httpOnly: true, path: '/' }));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.objectContaining({ httpOnly: true, path: '/api/auth' }));
    });

    it('should clear cookies even without refresh_token cookie', async () => {
      const mockReq = { cookies: {} } as any;
      const mockRes = { clearCookie: jest.fn() } as any;

      await controller.logout(mockReq, mockRes);

      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});

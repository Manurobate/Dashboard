import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from '../users/user.entity';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function parseJwtExpiry(expiry: string): number {
  const n = parseInt(expiry, 10);
  if (isNaN(n) || n <= 0) return 15 * 60 * 1000;
  if (expiry.endsWith('s')) return n * 1000;
  if (expiry.endsWith('m')) return n * 60 * 1000;
  if (expiry.endsWith('h')) return n * 60 * 60 * 1000;
  if (expiry.endsWith('d')) return n * 24 * 60 * 60 * 1000;
  return n * 1000;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @Throttle({
    default: {
      ttl: parseInt(process.env.THROTTLER_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLER_LIMIT ?? '5', 10),
    },
  })
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiBody({ type: LoginDto })
  async login(
    @Req() req: Request & { user: UserEntity },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');
    const refreshDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30);

    res.cookie('jwt', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseJwtExpiry(jwtExpiry),
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    const { passwordHash: _, refreshTokens: __, ...safeUser } = req.user;
    return safeUser;
  }

  @Post('refresh')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({ summary: 'Rafraîchissement silencieux du JWT via cookie refresh_token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.refresh_token as string | undefined;
    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const { accessToken, refreshToken, user } = await this.authService.refresh(rawToken);

    const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');
    const refreshDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30);

    res.cookie('jwt', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseJwtExpiry(jwtExpiry),
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion — invalide le refresh token et efface les cookies' })
  async logout(
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.refresh_token;
    await this.authService.logout(rawToken);
    res.clearCookie('jwt', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', { ...COOKIE_OPTIONS, path: '/api/auth' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Récupérer l'utilisateur courant" })
  async me(@CurrentUser() user: { id: number }) {
    return this.authService.me(user.id);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiOperation({ summary: 'Changement de mot de passe temporaire forcé' })
  async changePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.newPassword, dto.confirmPassword);
  }

  @Patch('update-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiOperation({ summary: 'Changement volontaire de mot de passe' })
  async updatePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(user.id, dto.currentPassword, dto.newPassword, dto.confirmPassword);
  }
}

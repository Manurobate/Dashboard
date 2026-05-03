import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/user.entity';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  async validateUser(username: string, password: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async login(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30),
    );

    await this.refreshTokenRepository.save({
      token: tokenHash,
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = sha256(rawToken);
    await this.refreshTokenRepository.delete({ token: tokenHash });
  }

  async me(userId: number): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'> | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const { passwordHash: _, refreshTokens: __, ...safeUser } = user;
    return safeUser;
  }

  async refresh(rawToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Omit<UserEntity, 'passwordHash' | 'refreshTokens'>;
  }> {
    const tokenHash = sha256(rawToken);

    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException();
    }

    if (tokenRecord.expiresAt < new Date()) {
      try { await this.refreshTokenRepository.delete(tokenRecord.id); } catch { /* best effort */ }
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    await this.refreshTokenRepository.delete(tokenRecord.id);
    const { accessToken, refreshToken } = await this.login(user);

    const { passwordHash: _, refreshTokens: __, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }
}

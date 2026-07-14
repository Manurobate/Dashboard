import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity, UserRole } from './user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { UpdateNotesSettingsDto } from './dto/update-notes-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findAdminCount(): Promise<number> {
    return this.userRepository.count({ where: { role: 'admin' } });
  }

  async updatePasswordHash(
    userId: number,
    passwordHash: string,
  ): Promise<UserEntity> {
    await this.userRepository.update({ id: userId }, { passwordHash });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException();
    return user;
  }

  async updatePasswordAndClearFlag(
    userId: number,
    passwordHash: string,
  ): Promise<UserEntity> {
    await this.userRepository.update(
      { id: userId },
      { passwordHash, mustChangePassword: false },
    );
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException();
    return user;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find();
  }

  async createUser(data: {
    username: string;
    name: string;
    passwordHash: string;
    role: UserRole;
    mustChangePassword: boolean;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({
      ...data,
      username: data.username.toLowerCase(),
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async resetPasswordByAdmin(userId: number): Promise<string> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
    if (user.role === 'admin')
      throw new ForbiddenException(
        "Impossible de réinitialiser le mot de passe d'un administrateur",
      );

    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await this.userRepository.update(
      { id: userId },
      { passwordHash, mustChangePassword: true },
    );
    await this.refreshTokenRepository.delete({ userId });

    return temporaryPassword;
  }

  async disableUser(targetId: number, requestingId: number): Promise<void> {
    if (targetId === requestingId) {
      throw new ForbiddenException(
        'Impossible de désactiver son propre compte',
      );
    }
    const user = await this.findById(targetId);
    if (!user)
      throw new NotFoundException(`Utilisateur ${targetId} introuvable`);

    if (user.role === 'admin') {
      const activeAdminCount = await this.userRepository.count({
        where: { role: 'admin', isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Impossible de désactiver le dernier administrateur actif',
        );
      }
    }

    await this.userRepository.update({ id: targetId }, { isActive: false });
    await this.refreshTokenRepository.delete({ userId: targetId });
  }

  async enableUser(targetId: number): Promise<void> {
    const user = await this.findById(targetId);
    if (!user)
      throw new NotFoundException(`Utilisateur ${targetId} introuvable`);

    await this.userRepository.update({ id: targetId }, { isActive: true });
  }

  async deleteUser(targetId: number, requestingId: number): Promise<void> {
    if (targetId === requestingId) {
      throw new ForbiddenException('Impossible de supprimer son propre compte');
    }
    const user = await this.findById(targetId);
    if (!user)
      throw new NotFoundException(`Utilisateur ${targetId} introuvable`);

    if (user.role === 'admin') {
      const activeAdminCount = await this.userRepository.count({
        where: { role: 'admin', isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Impossible de supprimer le dernier administrateur actif',
        );
      }
    }

    await this.refreshTokenRepository.delete({ userId: targetId });
    await this.userRepository.delete({ id: targetId });
  }

  async updateProfile(userId: number, name: string): Promise<UserEntity> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
    await this.userRepository.update({ id: userId }, { name });
    return { ...user, name };
  }

  async getNotesSettings(
    userId: number,
  ): Promise<{ triliumUrl: string | null; notesEnabled: boolean }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
    return { triliumUrl: user.triliumUrl, notesEnabled: user.notesEnabled };
  }

  async updateNotesSettings(
    userId: number,
    dto: UpdateNotesSettingsDto,
  ): Promise<{ triliumUrl: string | null; notesEnabled: boolean }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
    if (Object.keys(dto).length > 0) {
      await this.userRepository.update({ id: userId }, dto);
    }
    return this.getNotesSettings(userId);
  }

  async createUserWithTempPassword(
    username: string,
    name: string,
  ): Promise<{ user: UserEntity; temporaryPassword: string }> {
    const existing = await this.findByUsername(username);
    if (existing)
      throw new ConflictException('Cette adresse email est déjà utilisée');

    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    try {
      const user = await this.createUser({
        username,
        name,
        passwordHash,
        role: 'user',
        mustChangePassword: true,
      });
      return { user, temporaryPassword };
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Cette adresse email est déjà utilisée');
      }
      throw err;
    }
  }
}

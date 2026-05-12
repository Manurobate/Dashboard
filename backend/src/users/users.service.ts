import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findAdminCount(): Promise<number> {
    return this.userRepository.count({ where: { role: 'admin' } });
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<UserEntity> {
    await this.userRepository.update({ id: userId }, { passwordHash });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException();
    return user;
  }

  async updatePasswordAndClearFlag(userId: number, passwordHash: string): Promise<UserEntity> {
    await this.userRepository.update({ id: userId }, { passwordHash, mustChangePassword: false });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException();
    return user;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find();
  }

  async createUser(data: {
    username: string;
    name?: string;
    passwordHash: string;
    role: UserRole;
    mustChangePassword: boolean;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({ ...data, isActive: true });
    return this.userRepository.save(user);
  }

  async createUserWithTempPassword(
    username: string,
    name?: string,
  ): Promise<{ user: UserEntity; temporaryPassword: string }> {
    const existing = await this.findByUsername(username);
    if (existing) throw new ConflictException('Cet identifiant est déjà utilisé');

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
      if (err instanceof QueryFailedError && (err as any).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Cet identifiant est déjà utilisé');
      }
      throw err;
    }
  }
}

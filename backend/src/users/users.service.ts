import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async createUser(data: {
    username: string;
    passwordHash: string;
    role: UserRole;
    mustChangePassword: boolean;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({ ...data, isActive: true });
    return this.userRepository.save(user);
  }
}

import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const adminCount = await this.usersService.findAdminCount();
      if (adminCount > 0) {
        this.logger.log('Admin account already exists — skipping seed');
        return;
      }

      const username = this.configService.get<string>('ADMIN_USERNAME')!;
      const rawPassword = this.configService.get<string>(
        'ADMIN_INITIAL_PASSWORD',
      )!;
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      await this.usersService.createUser({
        username,
        name: username,
        passwordHash,
        role: 'admin',
        mustChangePassword: true,
      });
      this.logger.log(
        `Admin account "${username}" created (mustChangePassword=true)`,
      );
    } catch (err: unknown) {
      this.logger.error(
        'Admin seed failed — check DB connection and schema',
        err,
      );
    }
  }
}

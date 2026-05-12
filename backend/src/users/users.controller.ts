import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UserListItemDto } from './dto/user-list-item.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@SkipThrottle()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les comptes utilisateurs' })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs sans passwordHash',
    type: [UserListItemDto],
  })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle admin requis' })
  async findAll(): Promise<UserListItemDto[]> {
    const users = await this.usersService.findAll();
    return users.map((u) => new UserListItemDto(u));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un compte utilisateur avec mot de passe temporaire',
  })
  @ApiResponse({
    status: 201,
    description:
      'Compte créé — mot de passe temporaire retourné une seule fois',
    type: CreateUserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Identifiant déjà utilisé' })
  async create(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    const { user, temporaryPassword } =
      await this.usersService.createUserWithTempPassword(
        dto.username,
        dto.name,
      );
    return {
      user: new UserListItemDto(user),
      temporaryPassword,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
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
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';

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

  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Réinitialiser le mot de passe d'un utilisateur (génère un nouveau mot de passe temporaire)",
  })
  @ApiResponse({
    status: 200,
    description: 'Nouveau mot de passe temporaire — retourné une seule fois',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Impossible de réinitialiser le mot de passe d\'un administrateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResetPasswordResponseDto> {
    const temporaryPassword = await this.usersService.resetPasswordByAdmin(id);
    return { temporaryPassword };
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

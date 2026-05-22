import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';
import { UserListItemDto } from './dto/user-list-item.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@SkipThrottle()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'admin')
  @SkipThrottle()
  @ApiOperation({ summary: "Mettre à jour le profil de l'utilisateur courant" })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async updateProfile(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: UpdateProfileDto,
  ): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'>> {
    const user = await this.usersService.updateProfile(req.user.id, dto.name);
    const { passwordHash: _, refreshTokens: __, ...safeUser } = user;
    return safeUser;
  }

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
  @ApiResponse({
    status: 403,
    description:
      "Impossible de réinitialiser le mot de passe d'un administrateur",
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResetPasswordResponseDto> {
    const temporaryPassword = await this.usersService.resetPasswordByAdmin(id);
    return { temporaryPassword };
  }

  @Patch(':id/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un compte utilisateur' })
  @ApiResponse({ status: 204, description: 'Compte désactivé' })
  @ApiResponse({
    status: 403,
    description: 'Impossible de désactiver son propre compte',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async disableUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ): Promise<void> {
    await this.usersService.disableUser(id, req.user.id);
  }

  @Patch(':id/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réactiver un compte utilisateur' })
  @ApiResponse({ status: 204, description: 'Compte réactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async enableUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.enableUser(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un compte utilisateur (hard delete)' })
  @ApiResponse({ status: 204, description: 'Compte supprimé' })
  @ApiResponse({
    status: 403,
    description: 'Impossible de supprimer son propre compte',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ): Promise<void> {
    await this.usersService.deleteUser(id, req.user.id);
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

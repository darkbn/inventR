import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { clientContextFrom } from '../../common/utils/client-context';

import { AuthService } from './auth.service';
import { AuthThrottle } from './auth.throttle';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthTokensDto, LogoutResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @AuthThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion',
    description:
      "L'identifiant accepté est indifféremment l'adresse e-mail ou le nom " +
      "d'utilisateur. En cas d'échec, la réponse est volontairement identique " +
      'quelle que soit la cause (compte inconnu, mot de passe erroné, compte ' +
      "désactivé) afin de ne pas permettre d'énumérer les comptes.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Authentification réussie', type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives de connexion' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthTokensDto> {
    return this.authService.login(dto, clientContextFrom(request));
  }

  @Public()
  @AuthThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renouvellement des jetons',
    description:
      'Échange un jeton de rafraîchissement valide contre un nouveau couple de ' +
      "jetons. L'ancien jeton est immédiatement révoqué (rotation). Présenter un " +
      'jeton déjà révoqué est interprété comme un vol de session : toutes les ' +
      "sessions de l'utilisateur sont alors invalidées.",
  })
  @ApiResponse({ status: 200, description: 'Nouveaux jetons émis', type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Jeton invalide, expiré ou révoqué' })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken, clientContextFrom(request));
  }

  @ApiBearerAuth('bearer')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion de la session courante',
    description:
      'Révoque le jeton de rafraîchissement fourni. Opération idempotente : ' +
      "rejouer la déconnexion ne provoque pas d'erreur.",
  })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<LogoutResponseDto> {
    await this.authService.logout(dto.refreshToken, user.id, clientContextFrom(request));
    return { message: 'Déconnexion effectuée.' };
  }

  @ApiBearerAuth('bearer')
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion de toutes les sessions',
    description:
      "Révoque l'ensemble des jetons de rafraîchissement du compte, tous " +
      'appareils confondus. À utiliser en cas de perte ou de vol de terminal.',
  })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<LogoutResponseDto> {
    const revoked = await this.authService.logoutAll(user.id, clientContextFrom(request));
    return { message: `${revoked} session(s) révoquée(s).` };
  }

  @ApiBearerAuth('bearer')
  @Get('me')
  @ApiOperation({
    summary: 'Profil de l’utilisateur connecté',
    description:
      'Renvoie le profil à jour, rechargé depuis la base. Utilisé par le web et ' +
      'le mobile au démarrage pour vérifier la validité de la session.',
  })
  @ApiResponse({ status: 200, type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Jeton absent, expiré ou compte désactivé' })
  me(@CurrentUser('id') userId: string): Promise<UserProfileDto> {
    return this.authService.getProfile(userId);
  }
}

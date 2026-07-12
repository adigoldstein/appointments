import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@app/shared/types';
import type { AuthUser } from '@app/shared/types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';
import {
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from './interfaces';
import { AuthenticatedUserPayload } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  @Post('create-user')
  createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<AuthUser> {
    return this.authService.createUser(createUserDto, actor);
  }

  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshResponse> {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<LogoutResponse> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<AuthUser> {
    return this.authService.getProfile(actor);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:userId')
  updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<AuthUser> {
    return this.authService.updateUser(userId, updateUserDto, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  @Delete('users/:userId')
  deleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<void> {
    return this.authService.deleteUser(userId, actor);
  }
}

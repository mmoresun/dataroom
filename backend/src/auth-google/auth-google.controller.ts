import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  SerializeOptions,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthGoogleService } from './auth-google.service';
import { AuthGoogleLoginDto } from './dto/auth-google-login.dto';
import { LoginResponseDto } from '../auth/dto/login-response.dto';
import { setRefreshCookie } from '../auth/refresh-cookie.util';

@ApiTags('Auth')
@Controller({
  path: 'auth/google',
  version: '1',
})
export class AuthGoogleController {
  constructor(
    private readonly authService: AuthService,
    private readonly authGoogleService: AuthGoogleService,
  ) {}

  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: AuthGoogleLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<LoginResponseDto, 'refreshToken'>> {
    const socialData = await this.authGoogleService.getProfileByToken(loginDto);
    const result = await this.authService.validateSocialLogin(
      'google',
      socialData,
    );
    setRefreshCookie(response, result.refreshToken);
    return {
      token: result.token,
      tokenExpires: result.tokenExpires,
      user: result.user,
    };
  }
}

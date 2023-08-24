import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { IUser } from 'src/users/users.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req, @Res({ passthrough: true }) response: any) {
    return this.authService.login(req.user, response);
  }

  @ResponseMessage('Get profile information')
  @Get('me')
  getMe(@User() user: IUser) {
    return { user };
  }

  @Public()
  @ResponseMessage('Register a new user')
  @Post('register')
  register(@Body() registerData: RegisterUserDto) {
    return this.authService.register(registerData);
  }

  @Public()
  @ResponseMessage('Get user by refresh token')
  @Get('refresh')
  refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: any,
  ) {
    const refresh_token = request.cookies['refresh_token'];
    return this.authService.refreshToken(refresh_token, response);
  }

  @ResponseMessage('Logout')
  @Get('logout')
  logout(@User() user: IUser, @Res({ passthrough: true }) response: any) {
    return this.authService.logout(user, response);
  }
}

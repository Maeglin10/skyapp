import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class DevTokenDto {
  @ApiProperty({ description: 'User ID to generate token for' })
  @IsString()
  userId!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('dev-token')
  @ApiOperation({ summary: 'Generate a dev JWT token (not for production)' })
  devToken(@Body() dto: DevTokenDto) {
    return this.authService.devToken(dto.userId);
  }
}

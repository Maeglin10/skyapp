import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  generateToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  /** For dev/testing — generates a token with the given userId */
  devToken(userId: string): { access_token: string } {
    return { access_token: this.generateToken({ sub: userId, email: `${userId}@skyapp.dev`, role: 'admin' }) };
  }
}

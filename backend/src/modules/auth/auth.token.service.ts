import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config/config';

export interface TokenPayload {
  id: number;
}

export class TokenService {
  sign(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwtExpire as any
    };
    return jwt.sign(payload, config.jwtSecret, options);
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return { id: Number(decoded.id) };
  }
}
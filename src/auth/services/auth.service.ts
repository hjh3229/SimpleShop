import { HttpStatus, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
    AccessLogRepository,
    AccessTokenRepository,
    RefreshTokenRepository,
    UserRepository,
} from '../repositories';
import { User } from '../entities';
import { BusinessException } from '../../exceptions';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequestInfo, TokenPayload } from '../types';

@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly userRepository: UserRepository,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly accessTokenRepository: AccessTokenRepository,
        private readonly accessLogRepository: AccessLogRepository
    ) { }

    async refreshAccessToken(refreshToken: string): Promise<string> {
        try {
            const { exp, ...payload } = await this.jwtService.verifyAsync(
                refreshToken,
                {
                    secret: this.configService.get<string>('JWT_SECRET'),
                },
            );

            const user = await this.userRepository.findOneBy({ id: payload.sub });
            if (!user) {
                throw new BusinessException(
                    'auth',
                    'user-not-found',
                    'User not found',
                    HttpStatus.UNAUTHORIZED,
                );
            }

            return this.createAccessToken(user, payload as TokenPayload);
        } catch (error) {
            throw new BusinessException(
                'auth',
                'invalid-refresh-token',
                'Invalid refresh token',
                HttpStatus.UNAUTHORIZED,
            );
        }
    }

    createTokenPayload(userId: string): TokenPayload {
        return {
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            jti: uuidv4(),
        };
    }

    async createAccessToken(user: User, payload: TokenPayload): Promise<string> {
        const expiresIn = this.configService.get<string>('ACCESS_TOKEN_EXPIRY');
        const token = this.jwtService.sign(payload, { expiresIn });
        const expiresAt = this.calculateExpiry(expiresIn);

        await this.accessTokenRepository.saveAccessToken(
            payload.jti,
            user,
            token,
            expiresAt,
        );

        return token;
    }

    async createRefreshToken(user: User, payload: TokenPayload): Promise<string> {
        const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRY');
        const token = this.jwtService.sign(payload, { expiresIn });
        const expiresAt = this.calculateExpiry(expiresIn);

        await this.refreshTokenRepository.saveRefreshToken(
            payload.jti,
            user,
            token,
            expiresAt,
        );

        return token;
    }

    private calculateExpiry(expiry: string): Date {
        let expiresInMilliseconds = 0;

        if (expiry.endsWith('d')) {
            const days = parseInt(expiry.slice(0, -1), 10);
            expiresInMilliseconds = days * 24 * 60 * 60 * 1000;
        } else if (expiry.endsWith('h')) {
            const hours = parseInt(expiry.slice(0, -1), 10);
            expiresInMilliseconds = hours * 60 * 60 * 1000;
        } else if (expiry.endsWith('m')) {
            const minutes = parseInt(expiry.slice(0, -1), 10);
            expiresInMilliseconds = minutes * 60 * 1000;
        } else if (expiry.endsWith('s')) {
            const seconds = parseInt(expiry.slice(0, -1), 10);
            expiresInMilliseconds = seconds * 1000;
        } else {
            throw new BusinessException(
                'auth',
                'invalid-expiry',
                'Invalid expiry time',
                HttpStatus.BAD_REQUEST,
            );
        }

        return new Date(Date.now() + expiresInMilliseconds);
    }
}

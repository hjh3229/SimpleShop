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
import { LoginResDto } from '../dto';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly userRepository: UserRepository,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly accessTokenRepository: AccessTokenRepository,
        private readonly accessLogRepository: AccessLogRepository,
        private readonly tokenBlacklistService: TokenBlacklistService,
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

    // 입력받은 이메일로 가입한 유저가 존재하는지 + 해당 유저의 비밀번호와 입력받은 비밀번호가 일치하는지(argon2로 해싱 후 비교)
    private async validateUser(
        email: string,
        plainPassword: string,
    ): Promise<User> {
        const user = await this.userRepository.findOne({ where: { email } }); // 해당 유저가 없다면 findOne 함수에서 throw
        if (user && (await argon2.verify(user.password, plainPassword))) { // 비밀번호가 같다면 해당 user 리턴
            return user;
        }
        throw new BusinessException( // 같지 않다면 throw
            'auth',
            'invalid-credentials',
            'Invalid credentials',
            HttpStatus.UNAUTHORIZED,
        );
    }

    private async addToBlacklist(
        token: string,
        jti: string,
        type: 'access' | 'refresh',
        expiryConfigKey: string,
    ): Promise<void> {
        const expiryTime = this.calculateExpiry( // 키의 만료일시를 현재시간 + 해당 키의 남은 만료시간으로 계산한다.
            this.configService.get<string>(expiryConfigKey),
        );
        await this.tokenBlacklistService.addToBlacklist(
            token,
            jti,
            type,
            expiryTime,
        );
    }

    async login(
        email: string,
        plainPassword: string,
        req: RequestInfo, // ip, endpoint, ua로 구성
    ): Promise<LoginResDto> {
        const user = await this.validateUser(email, plainPassword); // 먼저 이메일과 비밀번호가 일치하는 유저 확인
        const payload: TokenPayload = this.createTokenPayload(user.id); // 해당 유저의 id를 기본으로 토큰 payload 생성

        const [accessToken, refreshToken] = await Promise.all([ // 해당 payload를 기반으로 access token, refresh token 생성
            this.createAccessToken(user, payload),
            this.createRefreshToken(user, payload),
        ]);

        const { ip, endpoint, ua } = req;
        await this.accessLogRepository.createAccessLog(user, ua, endpoint, ip); // payload에 담았던 내용을 기반으로 접근 기록 생성

        return { // 로그인 후 토큰과 id, 이름, 이메일, 전화번호까지 반환(비밀번호는 노출 우려가 있으므로)
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        };
    }

    // 카카오, 네이버 등을 통한 Oauth 로그인에 사용하는 것으로 추정, 절차는 기본 login과 유사
    async loginOauth(user: User, req: RequestInfo): Promise<LoginResDto> {
        const payload: TokenPayload = this.createTokenPayload(user.id);

        const [accessToken, refreshToken] = await Promise.all([
            this.createAccessToken(user, payload),
            this.createRefreshToken(user, payload),
        ]);

        const { ip, endpoint, ua } = req;
        await this.accessLogRepository.createAccessLog(user, ua, endpoint, ip);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        };
    }

    async logout(accessToken: string, refreshToken: string): Promise<void> {
        const [jtiAccess, jtiRefresh] = await Promise.all([
            this.jwtService.verifyAsync(accessToken, { // 검증할 토큰을 넣는다.
                secret: this.configService.get<string>('JWT_SECRET'), // 이 토큰을 서명할 때 사용한 비밀키 JWT_SECTET을 가져온다.
            }),
            this.jwtService.verifyAsync(refreshToken, { // refresh token도 마찬가지
                secret: this.configService.get<string>('JWT_SECRET'),
            }),
        ]);
        await Promise.all([
            this.addToBlacklist(
                accessToken,
                jtiAccess,
                'access',
                'ACCESS_TOKEN_EXPIRY',
            ),
            this.addToBlacklist(
                refreshToken,
                jtiRefresh,
                'refresh',
                'REFRESH_TOKEN_EXPIRY',
            ),
        ]);
    }
}

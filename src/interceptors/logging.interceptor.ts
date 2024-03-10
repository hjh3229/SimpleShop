import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AccessLogRepository } from '../auth/repositories';
import { Request } from 'express';
import { User } from '../auth/entities';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);
    constructor(private readonly accessLogRepository: AccessLogRepository) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request: Request & { user?: User } = context.switchToHttp().getRequest(); // 아래 문제 해결을  위해 직접적으로 명시해 user를 찾도록 함
        const { ip, method, originalUrl } = request;
        const userAgent = request.headers['user-agent'] || '';
        const user = request.user as User; // AuthGuard 가 이 값을 설정할 것 // request.user에서 에러 메시지 발생 (request에서 user 정보를 찾지 못함)

        return next.handle().pipe(
            tap(async () => {
                try {
                    if (
                        !userAgent.includes('ELB-HealthChecker') &&
                        originalUrl !== '/auth/login'
                    ) {
                        await this.accessLogRepository.createAccessLog(
                            user,
                            userAgent,
                            `${method} ${originalUrl}`,
                            ip,
                        );
                    }
                } catch (err) {
                    this.logger.error('Failed to create access log');
                }
            }),
            catchError((err) => {
                this.logger.error(`Error in request: ${err}`);
                return throwError(err);
            }),
        );
    }
}

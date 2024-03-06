import { BaseEntity } from 'src/common/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class TokenBlacklist extends BaseEntity {
    @Column()
    token: string;

    @Column()
    jti: string;

    @Column()
    tokenType: 'access' | 'refresh';

    @Column({ type: 'timestamp' })
    expiresAt: Date;
}
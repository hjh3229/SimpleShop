import { BaseEntity } from 'src/common/entity';
import { Column, Entity, OneToMany, Relation } from 'typeorm';
import { AccessToken } from './access-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { AccessLog } from './access-log.entity';
import { Order } from 'src/payment/entities/order.entity';
import { Point } from 'src/payment/entities/point.entity';
import { IssuedCoupon } from 'src/payment/entities';

export type UserRole = 'admin' | 'user';

@Entity()
export class User extends BaseEntity {
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar' })
    email: string;

    @Column({ type: 'varchar' })
    password: string;

    @Column({ type: 'varchar', length: 50 })
    phone: string;

    @Column({ type: 'varchar', length: 50 })
    role: UserRole;

    @Column({ nullable: true })
    regNo: string;

    @Column({ default: false })
    isPersonalInfoVerified: boolean;

    @OneToMany(() => AccessToken, (token) => token.user)
    accessToken: Relation<AccessToken[]>;

    @OneToMany(() => RefreshToken, (token) => token.user)
    refreshToken: Relation<RefreshToken[]>;

    @OneToMany(() => AccessLog, (log) => log.user)
    accessLogs: Relation<AccessLog[]>;

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    @OneToMany(() => Point, (point) => point.user)
    point: Point;

    @OneToMany(() => IssuedCoupon, (coupon) => coupon.user)
    coupon: IssuedCoupon;
}
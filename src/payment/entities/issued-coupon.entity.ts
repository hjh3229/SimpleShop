import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    Relation,
} from 'typeorm';
import { BaseEntity } from '../../common/entity';
import { Coupon } from './coupon.entity';
import { User } from '../../auth/entities';
import { Order } from './order.entity';

@Entity()
export class IssuedCoupon extends BaseEntity {
    @ManyToOne(() => User)
    @JoinColumn()
    user: Relation<User>;

    @ManyToOne(() => Coupon)
    @JoinColumn()
    coupon: Relation<Coupon>;

    @OneToOne(() => Order, (order) => order.usedIssuedCoupon, { nullable: true })
    usedOrder: Relation<Order>;

    @Column({ type: 'boolean', default: false })
    isValid: boolean; // 유효여부

    @Column({ type: 'timestamp', nullable: false })
    validFrom: Date; // 발행일자

    @Column({ type: 'timestamp', nullable: false })
    validUntil: Date; // 유효기간

    @Column({ type: 'boolean', default: false })
    isUsed: boolean; // 사용여부

    @Column({ type: 'timestamp', nullable: true })
    usedAt: Date; //사용된 날짜

    use() {
        this.isUsed = true;
        this.isValid = false;
        this.usedAt = new Date();
    }

    give(user: User, coupon: Coupon) {
        this.user = user;
        this.coupon = coupon;
        this.isValid = true;
        this.validFrom = new Date();
        this.validUntil = new Date(this.validFrom.getFullYear() + 2) // 유효기간은 2년으로
    }
}
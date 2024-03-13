import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Order, OrderItem, ShippingInfo } from '../entities';
import { UserRepository } from '../../auth/repositories';
import { IssuedCouponRepository } from './issued-coupon.repository';
import { PointRepository } from './point.repository';

@Injectable()
export class OrderRepository extends Repository<Order> {
    constructor(
        @InjectRepository(Order)
        private readonly repo: Repository<Order>,
        @InjectEntityManager()
        private readonly entityManager: EntityManager,
        private readonly userRepository: UserRepository,
        private readonly pointRepository: PointRepository,
        private readonly issuedCouponRepository: IssuedCouponRepository,
    ) {
        super(repo.target, repo.manager, repo.queryRunner);
    }

    async createOrder( // 주문 생성
        userId: string,
        orderItems: OrderItem[],
        finalAmount: number,
        shippingInfo?: ShippingInfo,
    ): Promise<Order> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const order = new Order();
        order.user = user;
        order.amount = finalAmount;
        order.status = 'started';
        order.items = orderItems;
        order.shippingInfo = shippingInfo;
        return this.save(order);
    }

    async completeOrder(orderId: string): Promise<Order> { // 주문 완료
        const order = await this.findOne({ where: { id: orderId } });
        order.status = 'paid';

        await Promise.all([
            this.issuedCouponRepository.use(order.usedIssuedCoupon),
            this.pointRepository.use(
                order.user.id,
                order.pointAmountUsed,
                '주문 사용',
            ),
            this.pointRepository.add( // 포인트 적립
                order.user.id,
                Math.floor(order.amount / 100), // 소수점은 버림
                '결제 금액 1% 적립'
            ),
        ]);
        return this.save(order);
    }
}
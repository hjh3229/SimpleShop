import { HttpStatus, Injectable } from '@nestjs/common';
import { IssuedCoupon, Order, OrderItem, PointLog } from '../entities';
import { CreateOrderDto } from '../dto/create-order.dto';
import { BusinessException } from '../../exceptions';
import { ProductService } from './product.service';
import {
    CouponRepository,
    IssuedCouponRepository,
    OrderRepository,
    PointRepository,
    ShippingInfoRepository,
} from '../repositories';
import { Transactional } from 'typeorm-transactional';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { User } from 'src/auth/entities';
import { PointLogResDto } from '../dto/point-res.dto';
import { UserRepository } from 'src/auth/repositories';
import { PointLogDto } from '../dto/point-log.dto';
import { getConnection } from 'typeorm';

@Injectable()
export class PaymentService {
    constructor(
        private readonly issuedCouponRepository: IssuedCouponRepository,
        private readonly pointRepository: PointRepository,
        private readonly productService: ProductService,
        private readonly shippingInfoRepository: ShippingInfoRepository,
        private readonly orderRepository: OrderRepository,
        private readonly couponRepository: CouponRepository,
        private readonly userRepository: UserRepository,
    ) { }

    @Transactional()
    async initOrder(dto: CreateOrderDto): Promise<Order> {
        // 주문 금액 계산
        const totalAmount = await this.calculateTotalAmount(dto.orderItems);

        // 할인 적용
        const finalAmount = await this.applyDiscounts(
            totalAmount,
            dto.userId,
            dto.couponId,
            dto.pointAmountToUse,
        );

        // 주문 생성
        return this.createOrder(
            dto.userId,
            dto.orderItems,
            finalAmount,
            dto.shippingAddress,
        );
    }

    @Transactional()
    async completeOrder(orderId: string): Promise<Order> {
        return this.orderRepository.completeOrder(orderId);
    }

    private async createOrder(
        userId: string,
        orderItems: OrderItem[],
        finalAmount: number,
        shippingAddress?: string,
    ): Promise<Order> {
        const shippingInfo = shippingAddress
            ? await this.shippingInfoRepository.createShippingInfo(shippingAddress)
            : null;
        return await this.orderRepository.createOrder(
            userId,
            orderItems,
            finalAmount,
            shippingInfo,
        );
    }

    private async calculateTotalAmount(orderItems: OrderItem[]): Promise<number> {
        let totalAmount = 0;

        const productIds = orderItems.map((item) => item.productId);
        const products = await this.productService.getProductsByIds(productIds);
        for (const item of orderItems) {
            const product = products.find((p) => p.id === item.productId);
            if (!product) {
                throw new BusinessException(
                    'payment',
                    `Product with ID ${item.productId} not found`,
                    'Invalid product',
                    HttpStatus.BAD_REQUEST,
                );
            }
            totalAmount += product.price * item.quantity;
        }

        return totalAmount;
    }

    private async applyDiscounts(
        totalAmount: number,
        userId: string,
        couponId?: string,
        pointAmountToUse?: number,
    ): Promise<number> {
        const couponDiscount = couponId
            ? await this.applyCoupon(couponId, userId, totalAmount)
            : 0;
        const pointDiscount = pointAmountToUse
            ? await this.applyPoints(pointAmountToUse, userId)
            : 0;

        // 최종 금액 계산
        const finalAmount = totalAmount - (couponDiscount + pointDiscount);
        return finalAmount < 0 ? 0 : finalAmount;
    }

    private async applyCoupon(
        couponId: string,
        userId: string,
        totalAmount: number,
    ): Promise<number> {
        const issuedCoupon = await this.issuedCouponRepository.findOne({
            where: {
                coupon: { id: couponId },
                user: { id: userId },
            },
        });

        if (!issuedCoupon) {
            throw new BusinessException(
                'payment',
                `user doesn't have coupon. couponId: ${couponId} userId: ${userId}`,
                'Invalid coupon',
                HttpStatus.BAD_REQUEST,
            );
        }

        const isValid =
            issuedCoupon?.isValid &&
            issuedCoupon?.validFrom <= new Date() &&
            issuedCoupon?.validUntil > new Date();
        if (!isValid) {
            throw new BusinessException(
                'payment',
                `Invalid coupon type. couponId: ${couponId} userId: ${userId}`,
                'Invalid coupon',
                HttpStatus.BAD_REQUEST,
            );
        }

        const { coupon } = issuedCoupon;
        if (coupon.type === 'percent') { // % 할인 쿠폰이면 전체 금액에서 할인 금액 계산
            return (totalAmount * coupon.value) / 100;
        } else if (coupon.type === 'fixed') { // 고정 할인 쿠폰이면 값 그대로 반환
            return coupon.value;
        }
        return 0;
    }

    private async applyPoints(
        pointAmountToUse: number,
        userId: string,
    ): Promise<number> {
        const point = await this.pointRepository.findOne({
            where: { user: { id: userId } },
        });
        if (point.availableAmount < 0 || point.availableAmount < pointAmountToUse) {
            throw new BusinessException(
                'payment',
                `Invalid points amount ${point.availableAmount}`,
                'Invalid points',
                HttpStatus.BAD_REQUEST,
            );
        }

        return pointAmountToUse;
    }

    async createCoupon(createCouponDto: CreateCouponDto, isAdmin: User): Promise<IssuedCoupon> {
        const coupon = await this.couponRepository.findOne({ where: { id: createCouponDto.couponId } });
        const issuedCoupon = await this.issuedCouponRepository.give(createCouponDto.userEmail, coupon, isAdmin);
        return issuedCoupon;
    }

    async checkPointLog(phone: string): Promise<PointLogResDto> { // 핸드폰 번호를 통해 유저의 포인트 조회
        const user = await this.userRepository.findOne({ where: { phone: phone } });
        const availableAmount = user.point.availableAmount;
        const pointInfo: PointLogResDto = { user: user, availableAmount: availableAmount, logs: [] }
        const pointLogs = await getConnection()
            .getRepository(PointLog)
            .createQueryBuilder("pointLog")
            .leftJoinAndSelect("pointLog.point", "point")
            .where("point.user = :phone", { phone }) // user의 번호가 phone 인 것만을 찾는다.
            .getMany();

        pointLogs.forEach(log => { // pointLogs에서 각 정보를 원하는 형태로 가져와 
            const logDto: PointLogDto = {
                amount: log.amount,
                reason: log.reason,
                type: log.type,
            };
            pointInfo.logs.push(logDto); // push로 저장
        });

        return pointInfo;
    }
}
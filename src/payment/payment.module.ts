import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    CouponRepository,
    IssuedCouponRepository,
    OrderItemRepository,
    OrderRepository,
    PointLogRepository,
    PointRepository,
    ProductRepository,
    ShippingInfoRepository,
} from './repositories';
import {
    Coupon,
    IssuedCoupon,
    Order,
    OrderItem,
    Point,
    PointLog,
    Product,
    ShippingInfo,
} from './entities';
import { AuthModule } from '../auth/auth.module';
import { PaymentService, ProductService } from './services';
import { paymentController } from './controllers';

@Module({
    imports: [
        AuthModule,
        TypeOrmModule.forFeature([
            Order,
            OrderItem,
            ShippingInfo,
            Point,
            PointLog,
            Coupon,
            IssuedCoupon,
            Product,
        ]),
    ],
    providers: [
        PaymentService,
        ProductService,

        OrderRepository,
        OrderItemRepository,
        ShippingInfoRepository,
        ProductRepository,
        CouponRepository,
        IssuedCouponRepository,
        PointRepository,
        PointLogRepository,
    ],
    controllers: [
        paymentController,
    ],
    exports: [ // payment.module 밖에서 사용할 수 있도록 exports
        PaymentService,
        ProductService,

        OrderRepository,
        OrderItemRepository,
        ShippingInfoRepository,
        ProductRepository,
        CouponRepository,
        IssuedCouponRepository,
        PointRepository,
        PointLogRepository,
    ]
})
export class PaymentModule { }
import { Body, Controller, Param, Post, Request, UseGuards } from "@nestjs/common";
import { PaymentService, ProductService } from "../services";
import { CreateOrderDto } from "../dto/create-order.dto";
import { OrderResDto } from "../dto/order-res.dto";
import { CreateCouponDto } from "../dto/create-coupon.dto";
import { CouponResDto } from "../dto/coupon-res.dto";
import { User } from "src/auth/entities";
import { JwtStrategy } from "src/auth/strategies";

@Controller('payment')
export class paymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly productService: ProductService,
    ) { }

    @Post('order')
    async order(@Body() createOrderDto: CreateOrderDto): Promise<OrderResDto> {
        const order = await this.paymentService.initOrder(createOrderDto);
        return {
            userEmail: order.user.email,
            orderNo: order.orderNo,
            amount: order.amount,
            status: order.status,
            items: order.items,
            pointAmountUsed: order.pointAmountUsed,
            pointAmountHave: order.user.point,
            usedIssuedCoupon: order.usedIssuedCoupon,
            shippingInfo: order.shippingInfo,
        }
    }

    @Post('completOrder')
    async completeOrder(@Body() orderId: string): Promise<OrderResDto> {
        const order = await this.paymentService.completeOrder(orderId);
        return {
            userEmail: order.user.email,
            orderNo: order.orderNo,
            amount: order.amount,
            status: order.status,
            items: order.items,
            pointAmountUsed: order.pointAmountUsed,
            pointAmountHave: order.user.point,
            usedIssuedCoupon: order.usedIssuedCoupon,
            shippingInfo: order.shippingInfo,
        }
    }

    @Post('createCoupon/:id')
    async createCoupon(@Body() createCouponDto: CreateCouponDto, @Param('id') id: string): Promise<CouponResDto> {
        const isAdminId = id;
        const issuedCoupon = await this.paymentService.createCoupon(createCouponDto, isAdminId);
        return {
            user: issuedCoupon.user,
            coupon: issuedCoupon.coupon,
            validFrom: issuedCoupon.validFrom,
            validUntil: issuedCoupon.validUntil,
        }
    }
}
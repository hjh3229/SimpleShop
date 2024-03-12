import { Relation } from "typeorm";
import { IssuedCoupon, OrderItem, OrderStatus, Point, ShippingInfo } from "../entities";

export type OrderResDto = {
    userEmail: string;
    orderNo: string;
    amount: number;
    status: OrderStatus;
    items: Relation<OrderItem[]>;
    pointAmountUsed: number;
    pointAmountHave: Point; // 쓰고 남은 포인트
    usedIssuedCoupon: Relation<IssuedCoupon>;
    shippingInfo: Relation<ShippingInfo>;
}
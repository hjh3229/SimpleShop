import { CouponType } from "../entities";

export type CreateCouponDto = {
    userEmail: string;
    couponId: string;
    couponType: CouponType;
    couponValue: number;
}
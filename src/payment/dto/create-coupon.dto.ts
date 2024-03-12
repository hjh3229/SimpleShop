import { CouponType } from "../entities";

export type CreateCouponDto = {
    userEmail: string;
    couponType: CouponType;
    couponValue: number;
}
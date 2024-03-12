import { User } from "src/auth/entities";
import { Coupon } from "../entities";

export type CouponResDto = {
    user: User;
    coupon: Coupon;
    validFrom: Date;
    validUntil: Date;
}
import { PointLogType } from "../entities";

export type PointLogDto = {
    amount: number;
    reason: string;
    type: PointLogType;
}
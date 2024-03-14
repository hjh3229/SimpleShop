import { User } from "src/auth/entities";
import { PointLogDto } from "./point-log.dto";

export type PointLogResDto = {
    user: User;
    availableAmount: number;
    logs: PointLogDto[];
}
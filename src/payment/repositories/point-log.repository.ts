import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Point, PointLog } from '../entities';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PointLogRepository extends Repository<PointLog> {
    constructor(
        @InjectRepository(PointLog)
        private readonly repo: Repository<PointLog>,
        @InjectEntityManager()
        private readonly entityManager: EntityManager,
    ) {
        super(repo.target, repo.manager, repo.queryRunner);
    }

    use(point: Point, amountToUse: number, reason: string): Promise<PointLog> { // 포인트 사용
        const pointLog = new PointLog();
        pointLog.point = point;
        pointLog.use(amountToUse, reason);
        return this.save(pointLog);
    }

    add(point: Point, amountToAdd: number, reason: string): Promise<PointLog> { // 포인트 추가
        const pointLog = new PointLog();
        pointLog.point = point;
        pointLog.add(amountToAdd, reason);
        return this.save(pointLog)
    }
}
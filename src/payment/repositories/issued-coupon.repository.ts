import { HttpStatus, Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { IssuedCoupon } from '../entities';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UserRepository } from 'src/auth/repositories';
import { CouponRepository } from './coupon.repository';
import { BusinessException } from 'src/exceptions/BusinessException';
import { User } from 'src/auth/entities';

@Injectable()
export class IssuedCouponRepository extends Repository<IssuedCoupon> {
    constructor(
        @InjectRepository(IssuedCoupon)
        private readonly repo: Repository<IssuedCoupon>,
        @InjectEntityManager()
        private readonly entityManager: EntityManager,
        private readonly userRepository: UserRepository,
        private readonly couponRepository: CouponRepository,
    ) {
        super(repo.target, repo.manager, repo.queryRunner);
    }

    use(issuedCoupon: IssuedCoupon): Promise<IssuedCoupon> { // 쿠폰 사용
        issuedCoupon.use();
        return this.save(issuedCoupon);
    }

    async give(createCouponDto: CreateCouponDto, isAdmin: User): Promise<IssuedCoupon> { // isAdmin이 user에게 coupon 전달
        if (isAdmin.role !== 'admin') { // admin만 쿠폰을 배포할 수 있도록
            throw new BusinessException(
                'auth',
                'not admin',
                'not admin',
                HttpStatus.UNAUTHORIZED,
            );
        }

        const user = await this.userRepository.findOneByEmail(createCouponDto.userEmail);
        const coupon = await this.couponRepository.create({
            type: createCouponDto.couponType,
            value: createCouponDto.couponValue,
        });

        this.couponRepository.save(coupon);

        const newCoupon = new IssuedCoupon();
        newCoupon.give(user, coupon);

        return await this.entityManager.save(IssuedCoupon, newCoupon);
    }
}
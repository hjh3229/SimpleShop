import { UserRole } from '../entities';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateUserDto {
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(20)
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/)
    password: string;

    @IsString()
    @Matches(/^\d{2,3}-\d{3,4}-\d{4}$/)
    phone: string;
    role: UserRole;
};

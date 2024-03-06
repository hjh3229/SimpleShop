import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService, UserService } from '../services';
import {
    CreateUserDto,
    RefreshReqDto,
    SignupResDto,
} from '../dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) { }

    @Post('signup')
    async signup(@Body() createUserDto: CreateUserDto): Promise<SignupResDto> {
        const user = await this.userService.createUser(createUserDto);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
        };
    }

    @Post('refresh')
    async refresh(@Body() dto: RefreshReqDto): Promise<string> {
        return this.authService.refreshAccessToken(dto.refreshToken);
    }
}

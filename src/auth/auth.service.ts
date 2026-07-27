import * as jwt from 'jsonwebtoken';
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, nickname } = signupDto;

    // 1. 이메일 중복 체크
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. DB 저장
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      nickname,
      provider: 'local',
    });
    await this.usersRepository.save(user);

    // 4. 비밀번호 제외하고 응답
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
  const { email, password } = loginDto;

  // 1. 이메일로 유저 조회
  const user = await this.usersRepository.findOne({ where: { email, provider: 'local' } });
  if (!user) {
    throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // 2. 비밀번호 검증
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // 3. JWT 발급 (accessToken + refreshToken)
  const payload = { sub: user.id, email: user.email };
  const accessToken = this.jwtService.sign(payload);
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET ?? '', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '14d',
  } as any);

  // 4. refreshToken DB에 저장
  user.refreshToken = refreshToken;
  await this.usersRepository.save(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    },
  };
}

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET ?? '');
    } catch (e) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 일치하지 않습니다.');
    }

    const newAccessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return { accessToken: newAccessToken };
  }
  async kakaoLogin(code: string) {
  // 1. 인가 코드로 카카오 access_token 요청
  const tokenResponse = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    null,
    {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

  const kakaoAccessToken = tokenResponse.data.access_token;

  // 2. access_token으로 카카오 사용자 정보 요청
  const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });

  const kakaoId = String(userResponse.data.id);
  const nickname = userResponse.data.kakao_account?.profile?.nickname ?? '카카오유저';

  // 3. 기존 유저인지 확인, 없으면 자동 회원가입
  let user = await this.usersRepository.findOne({
    where: { provider: 'kakao', providerId: kakaoId },
  });

  if (!user) {
    user = this.usersRepository.create({
      provider: 'kakao',
      providerId: kakaoId,
      nickname,
    });
    await this.usersRepository.save(user);
  }

  // 4. 우리 서비스 JWT 발급
  const payload = { sub: user.id, email: user.email };
  const accessToken = this.jwtService.sign(payload);

  return {
    accessToken,
    user: {
      id: user.id,
      nickname: user.nickname,
      provider: user.provider,
    },
  };
}
}
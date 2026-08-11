import * as jwt from 'jsonwebtoken';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

 async signup(signupDto: SignupDto) {
  const { email, password, nickname } = signupDto;

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await this.usersRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ConflictException('이미 가입된 이메일입니다.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // 메일로 보낼 실제 인증 토큰
  const verificationToken = randomBytes(32).toString('hex');

  // DB에는 실제 토큰 대신 SHA-256 해시만 저장
  const verificationTokenHash = createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // 인증 토큰 유효기간: 현재부터 30분
  const verificationExpiresAt = new Date(
    Date.now() + 30 * 60 * 1000,
  );

  const user = this.usersRepository.create({
    email: normalizedEmail,
    password: hashedPassword,
    nickname,
    provider: 'local',
    emailVerified: false,
    emailVerificationTokenHash: verificationTokenHash,
    emailVerificationExpiresAt: verificationExpiresAt,
  });

  await this.usersRepository.save(user);

  await this.mailService.sendVerificationEmail(
    normalizedEmail,
    verificationToken,
  );

  return {
    message: '회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.',
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      provider: user.provider,
      emailVerified: user.emailVerified,
    },
  };
}
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({
      where: {
        email,
        provider: 'local',
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        '이메일 인증 후 로그인할 수 있습니다.',
      );
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const user = await this.validateRefreshToken(refreshToken);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
    };
  }

  async autoLogin(refreshToken: string) {
    const user = await this.validateRefreshToken(refreshToken);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      autoLogin: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider,
      },
    };
  }

  async verifyEmail(token: string) {
  if (!token) {
    throw new BadRequestException('이메일 인증 토큰이 필요합니다.');
  }

  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await this.usersRepository.findOne({
    where: {
      emailVerificationTokenHash: tokenHash,
    },
  });

  if (!user) {
    throw new BadRequestException(
      '유효하지 않은 이메일 인증 토큰입니다.',
    );
  }

  if (
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    throw new BadRequestException(
      '이메일 인증 토큰이 만료되었습니다.',
    );
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;

  await this.usersRepository.save(user);

  return {
    message: '이메일 인증이 완료되었습니다.',
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      emailVerified: user.emailVerified,
    },
  };
}

  async resendVerification(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await this.usersRepository.findOne({
    where: {
      email: normalizedEmail,
      provider: 'local',
    },
  });

  // 가입 여부가 외부에 노출되지 않도록 동일한 응답 반환
  if (!user) {
    return {
      message:
        '인증이 필요한 계정이라면 이메일을 발송했습니다.',
    };
  }

  if (user.emailVerified) {
    return {
      message:
        '인증이 필요한 계정이라면 이메일을 발송했습니다.',
    };
  }

  const verificationToken = randomBytes(32).toString('hex');

  const verificationTokenHash = createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  const verificationExpiresAt = new Date(
    Date.now() + 30 * 60 * 1000,
  );

  user.emailVerificationTokenHash =
    verificationTokenHash;
  user.emailVerificationExpiresAt =
    verificationExpiresAt;

  await this.usersRepository.save(user);

  await this.mailService.sendVerificationEmail(
    user.email,
    verificationToken,
  );

  return {
    message:
      '인증이 필요한 계정이라면 이메일을 발송했습니다.',
  };
}

  async kakaoLogin(code: string) {
    if (!code) {
      throw new UnauthorizedException('카카오 인가 코드가 필요합니다.');
    }

    try {
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
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const kakaoAccessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
          },
        },
      );

      const kakaoId = String(userResponse.data.id);
      const nickname =
        userResponse.data.kakao_account?.profile?.nickname ?? '카카오유저';

      let user = await this.usersRepository.findOne({
        where: {
          provider: 'kakao',
          providerId: kakaoId,
        },
      });

      if (!user) {
        user = this.usersRepository.create({
          provider: 'kakao',
          providerId: kakaoId,
          nickname,
        });

        await this.usersRepository.save(user);
      }

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('카카오 로그인에 실패했습니다.');
    }
  }

  private async validateRefreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 필요합니다.');
    }

    let payload: jwt.JwtPayload;

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET ?? '',
      ) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 리프레시 토큰입니다.',
      );
    }

    const userId = Number(payload.sub);

    if (!userId) {
      throw new UnauthorizedException(
        '유효하지 않은 리프레시 토큰입니다.',
      );
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException(
        '리프레시 토큰이 일치하지 않습니다.',
      );
    }

    return user;
  }

  private async issueTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET ?? '',
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '14d',
      } as jwt.SignOptions,
    );

    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider,
      },
    };
  }
}
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
import { createHash, randomBytes, randomInt, timingSafeEqual, } from 'crypto';
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

  private hashPasswordResetValue(
    value: string,
  ) {
    const pepper =
      process.env.PASSWORD_RESET_PEPPER;

    if (!pepper) {
      throw new Error(
        'PASSWORD_RESET_PEPPER 환경변수가 필요합니다.',
      );
    }

    return createHash('sha256')
      .update(`${value}:${pepper}`)
      .digest('hex');
  }

  async forgotPassword(email: string) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const commonResponse = {
    message:
      '가입된 이메일이라면 비밀번호 재설정 인증번호를 발송했습니다.',
  };

  const user =
    await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
        provider: 'local',
      },
    });

  /*
   * 가입 여부가 외부에 노출되지 않도록
   * 존재하지 않는 계정에도 동일한 응답을 반환합니다.
   */
  if (!user) {
    return commonResponse;
  }

  const code = randomInt(
    0,
    1_000_000,
  )
    .toString()
    .padStart(6, '0');

  user.passwordResetCodeHash =
    this.hashPasswordResetValue(code);

  user.passwordResetCodeExpiresAt =
    new Date(Date.now() + 10 * 60 * 1000);

  user.passwordResetCodeAttempts = 0;

  // 새로운 인증번호 발급 시 이전 reset token 무효화
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;

  await this.usersRepository.save(user);

  await this.mailService.sendPasswordResetCode(
    user.email,
    code,
  );

  return commonResponse;
}

private isSameHash(
  first: string,
  second: string,
) {
  const firstBuffer = Buffer.from(
    first,
    'hex',
  );

  const secondBuffer = Buffer.from(
    second,
    'hex',
  );

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer,
  );
}

async verifyPasswordResetCode(
  email: string,
  code: string,
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
        provider: 'local',
      },
    });

  if (
    !user ||
    !user.passwordResetCodeHash ||
    !user.passwordResetCodeExpiresAt
  ) {
    throw new BadRequestException(
      '인증번호가 유효하지 않거나 만료되었습니다.',
    );
  }

  if (
    user.passwordResetCodeExpiresAt.getTime() <
    Date.now()
  ) {
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetCodeAttempts = 0;

    await this.usersRepository.save(user);

    throw new BadRequestException(
      '인증번호가 유효하지 않거나 만료되었습니다.',
    );
  }

  if (user.passwordResetCodeAttempts >= 5) {
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetCodeAttempts = 0;

    await this.usersRepository.save(user);

    throw new BadRequestException(
      '인증번호 입력 횟수를 초과했습니다. 새 인증번호를 요청해주세요.',
    );
  }

  const submittedCodeHash =
    this.hashPasswordResetValue(code);

  const codeMatches = this.isSameHash(
    user.passwordResetCodeHash,
    submittedCodeHash,
  );

  if (!codeMatches) {
    user.passwordResetCodeAttempts += 1;

    const attemptsRemaining =
      5 - user.passwordResetCodeAttempts;

    if (attemptsRemaining <= 0) {
      user.passwordResetCodeHash = null;
      user.passwordResetCodeExpiresAt = null;
    }

    await this.usersRepository.save(user);

    if (attemptsRemaining <= 0) {
      throw new BadRequestException(
        '인증번호 입력 횟수를 초과했습니다. 새 인증번호를 요청해주세요.',
      );
    }

    throw new BadRequestException(
      `인증번호가 올바르지 않습니다. 남은 횟수: ${attemptsRemaining}회`,
    );
  }

  const resetToken =
    randomBytes(32).toString('hex');

  user.passwordResetTokenHash =
    this.hashPasswordResetValue(
      resetToken,
    );

  user.passwordResetTokenExpiresAt =
    new Date(Date.now() + 15 * 60 * 1000);

  // 인증 성공 후 인증번호는 즉시 폐기
  user.passwordResetCodeHash = null;
  user.passwordResetCodeExpiresAt = null;
  user.passwordResetCodeAttempts = 0;

  await this.usersRepository.save(user);

  return {
    message:
      '인증번호 확인이 완료되었습니다.',
    resetToken,
    expiresInSeconds: 900,
  };
}

  async resetPassword(
    resetToken: string,
    newPassword: string,
  ) {
    const resetTokenHash =
      this.hashPasswordResetValue(
        resetToken,
      );

    const user =
      await this.usersRepository.findOne({
        where: {
          passwordResetTokenHash:
            resetTokenHash,
          provider: 'local',
        },
      });

    if (
      !user ||
      !user.passwordResetTokenExpiresAt
    ) {
      throw new BadRequestException(
        '비밀번호 재설정 요청이 유효하지 않거나 만료되었습니다.',
      );
    }

    if (
      user.passwordResetTokenExpiresAt.getTime() <
      Date.now()
    ) {
      user.passwordResetTokenHash = null;
      user.passwordResetTokenExpiresAt = null;

      await this.usersRepository.save(user);

      throw new BadRequestException(
        '비밀번호 재설정 요청이 유효하지 않거나 만료되었습니다.',
      );
    }

    const isSamePassword =
      await bcrypt.compare(
        newPassword,
        user.password,
      );

    if (isSamePassword) {
      throw new BadRequestException(
        '기존 비밀번호와 다른 비밀번호를 입력해주세요.',
      );
    }

    user.password = await bcrypt.hash(
      newPassword,
      10,
    );

    // reset token은 한 번 사용 후 폐기
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;

    // 혹시 남아 있을 수 있는 인증번호도 폐기
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetCodeAttempts = 0;

    // 기존 refresh token을 폐기해 모든 기기에서 로그아웃
    user.refreshToken = null;

    await this.usersRepository.save(user);

    return {
      message:
        '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.',
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
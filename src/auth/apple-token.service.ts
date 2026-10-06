import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  timingSafeEqual,
} from 'crypto';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface AppleIdentityTokenPayload
  extends jwt.JwtPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  nonce?: string;
  is_private_email?: boolean | string;
}

@Injectable()
export class AppleTokenService {
  private readonly client = jwksClient({
    jwksUri:
      'https://appleid.apple.com/auth/keys',
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 60 * 60 * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  constructor(
    private readonly configService:
      ConfigService,
  ) {}

  async verifyIdentityToken(
    identityToken: string,
    rawNonce: string,
  ): Promise<AppleIdentityTokenPayload> {
    const clientId =
      this.configService.get<string>(
        'APPLE_CLIENT_ID',
      );

    if (!clientId) {
      throw new Error(
        'APPLE_CLIENT_ID 환경변수가 필요합니다.',
      );
    }

    try {
      const decoded = jwt.decode(
        identityToken,
        {
          complete: true,
        },
      );

      if (
        !decoded ||
        typeof decoded === 'string' ||
        !decoded.header.kid
      ) {
        throw new UnauthorizedException(
          '유효하지 않은 Apple identity token입니다.',
        );
      }

      const key =
        await this.client.getSigningKey(
          decoded.header.kid,
        );

      const publicKey = key.getPublicKey();

      const payload = jwt.verify(
        identityToken,
        publicKey,
        {
          algorithms: ['RS256'],
          issuer:
            'https://appleid.apple.com',
          audience: clientId,
        },
      ) as AppleIdentityTokenPayload;

      if (!payload.sub) {
        throw new UnauthorizedException(
          'Apple 사용자 식별자가 없습니다.',
        );
      }

      this.verifyNonce(
        payload.nonce,
        rawNonce,
      );

      return payload;
    } catch (error) {
      if (
        error instanceof
        UnauthorizedException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        'Apple 로그인 토큰 검증에 실패했습니다.',
      );
    }
  }

  private verifyNonce(
    tokenNonce: string | undefined,
    rawNonce: string,
  ) {
    if (!tokenNonce) {
      throw new UnauthorizedException(
        'Apple 토큰에 nonce가 없습니다.',
      );
    }

    const expectedNonce = createHash(
      'sha256',
    )
      .update(rawNonce)
      .digest('hex');

    const actualBuffer = Buffer.from(
      tokenNonce,
      'utf8',
    );

    const expectedBuffer = Buffer.from(
      expectedNonce,
      'utf8',
    );

    if (
      actualBuffer.length !==
        expectedBuffer.length ||
      !timingSafeEqual(
        actualBuffer,
        expectedBuffer,
      )
    ) {
      throw new UnauthorizedException(
        'Apple nonce가 일치하지 않습니다.',
      );
    }
  }
}
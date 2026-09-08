import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const port = Number(
      this.configService.get<string>('SMTP_PORT') ?? '2525',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl =
      this.configService.get<string>('EMAIL_VERIFICATION_URL') ??
      'http://localhost:3000/auth/email/verify';

    const link = `${verificationUrl}?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from:
        this.configService.get<string>('SMTP_FROM') ??
        'PillMate <no-reply@pillmate.local>',
      to: email,
      subject: '[PillMate] 이메일 인증을 완료해주세요.',
      text: [
        'PillMate 회원가입 이메일 인증 메일입니다.',
        '',
        `인증 링크: ${link}`,
        '',
        '이 링크는 30분 동안 유효합니다.',
      ].join('\n'),
      html: `
        <h2>PillMate 이메일 인증</h2>
        <p>아래 버튼을 눌러 이메일 인증을 완료해주세요.</p>
        <p>
          <a
            href="${link}"
            style="
              display: inline-block;
              padding: 12px 20px;
              color: #ffffff;
              background-color: #4f46e5;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            이메일 인증하기
          </a>
        </p>
        <p>이 링크는 30분 동안 유효합니다.</p>
      `,
    });
  }
}
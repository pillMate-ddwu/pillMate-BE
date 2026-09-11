import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsEmail(
    {},
    {
      message: '올바른 이메일 형식이어야 합니다.',
    },
  )
  email!: string;

  @IsString()
  @MinLength(8, {
    message: '비밀번호는 8자 이상이어야 합니다.',
  })
  @MaxLength(72, {
    message: '비밀번호는 72자 이하여야 합니다.',
  })
  @Matches(/^\S+$/, {
    message: '비밀번호에는 공백을 사용할 수 없습니다.',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/,
    {
      message:
        '비밀번호는 영문 대문자, 소문자, 숫자, 특수문자(!@#$%^&*)를 각각 하나 이상 포함해야 합니다.',
    },
  )
  password!: string;

  @IsString()
  nickname!: string;
}
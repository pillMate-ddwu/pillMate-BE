import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @IsString()
  @IsNotEmpty()
  rawNonce!: string;

  // Apple은 이름을 최초 로그인에서만 제공할 수 있음
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;
}
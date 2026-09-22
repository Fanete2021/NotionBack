import { IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  label?: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class PagePresenceDto {
  @IsString()
  @IsNotEmpty()
  pageId!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceMemberUserEntity {
    @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
    readonly id: string;
  
    @ApiProperty({ example: 'Иван Иванов' })
    readonly name: string;
  
    @ApiProperty({ example: 'user@example.com' })
    readonly email: string;
  
    @ApiPropertyOptional({
      example: 'https://example.com/avatar.jpg',
      nullable: true,
    })
    readonly avatarUrl?: string | null;
  
    constructor(props: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    }) {
      this.id = props.id;
      this.name = props.name;
      this.email = props.email;
      this.avatarUrl = props.avatarUrl;
    }
  }
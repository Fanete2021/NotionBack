export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly avatarUrl?: string | null;

  constructor(props: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    avatarUrl?: string | null;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.avatarUrl = props.avatarUrl;
  }
}

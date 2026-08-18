export class UserEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly name: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly avatarUrl?: string | null,
  ) {}
}

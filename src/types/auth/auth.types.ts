export type RegisterData = {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
};

export type CreateUserData = Omit<RegisterData, 'password'> & {
  passwordHash: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type RefreshData = {
  userId: string;
  oldRefreshToken: string;
};

export type LogoutData = {
  userId: string;
  refreshToken?: string;
};

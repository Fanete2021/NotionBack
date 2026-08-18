export type RegisterData = {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type LogoutData = {
  userId: string;
  token?: string;
};

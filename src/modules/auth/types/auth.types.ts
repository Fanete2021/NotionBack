export type RegisterData = {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
};

export type LoginData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type LogoutData = {
  userId: string;
  token?: string;
};

export type LogoutResult = {
  message: string;
};

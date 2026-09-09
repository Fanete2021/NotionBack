type RegisterData = {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
};

type LoginData = {
  email: string;
  password: string;
};

type LogoutData = {
  userId: string;
  token?: string;
};

type LogoutResult = {
  message: string;
};

export type { RegisterData, LoginData, LogoutData, LogoutResult };

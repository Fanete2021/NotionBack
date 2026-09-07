export type TokenData = {
  userId: string;
  email: string;
  rememberMe: boolean;
};

export type RefreshData = {
  token: string;
};

export type RevokeData = {
  userId: string;
  token?: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
  user: {
    id: string;
    email: string;
  };
};

export type RefreshSession = {
  userId: string;
  refreshTokenId: string;
  rememberMe: boolean;
};

export type TokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  email: string;
  jti: string;
};

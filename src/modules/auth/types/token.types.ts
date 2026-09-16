type TokenData = {
  userId: string;
  email: string;
  rememberMe: boolean;
};

type RefreshData = {
  token: string;
};

type RevokeData = {
  userId: string;
  token?: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
  user: {
    id: string;
    email: string;
  };
};

type RefreshSession = {
  userId: string;
  refreshTokenId: string;
  rememberMe: boolean;
};

type TokenPayload = {
  sub: string;
  email: string;
};

type RefreshTokenPayload = {
  sub: string;
  email: string;
  jti: string;
};

export type {
  TokenData,
  RefreshData,
  RevokeData,
  TokenPair,
  RefreshSession,
  TokenPayload,
  RefreshTokenPayload,
};

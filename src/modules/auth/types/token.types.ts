export type TokenData = {
  userId: string;
  email: string;
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
  user: {
    id: string;
    email: string;
  };
};

export type RefreshSession = {
  userId: string;
  refreshTokenId: string;
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

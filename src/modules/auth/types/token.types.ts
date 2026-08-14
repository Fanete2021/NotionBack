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

export type TokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  email: string;
  jti: string;
};

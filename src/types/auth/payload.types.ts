export type UserPayload = {
  id: string;
  email: string;
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

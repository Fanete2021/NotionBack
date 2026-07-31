export interface UserPayload {
  id: string;
  email: string;
}

export type TokenPayload = {
  sub: string;
  email: string;
};

function buildInviteUrl(frontUrl: string, token: string): string {
  return `${frontUrl.replace(/\/+$/, '')}/join/${token}`;
}

export { buildInviteUrl };

const TIME_RE = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

export const isValidTime = (
  value: string | null | undefined,
): value is string => typeof value === 'string' && TIME_RE.test(value);

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const isWithinQuietHours = (
  now: Date,
  start: string,
  end: string,
): boolean => {
  if (!isValidTime(start) || !isValidTime(end)) {
    return false;
  }

  const startM = toMinutes(start);
  const endM = toMinutes(end);
  if (startM === endM) {
    return false;
  }

  const cur = now.getHours() * 60 + now.getMinutes();

  return startM < endM
    ? cur >= startM && cur < endM
    : cur >= startM || cur < endM;
};

export const nextQuietHoursEnd = (now: Date, end: string): Date => {
  const [h, m] = end.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target;
};

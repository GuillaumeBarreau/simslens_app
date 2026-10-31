export const MODE = {
  SELECT: 'select',
  CREATE: 'create',
} as const;

export type Mode = (typeof MODE)[keyof typeof MODE];

export type EnvShape = Record<string, string | undefined>;

export const parseEnv = (env: EnvShape) => env;

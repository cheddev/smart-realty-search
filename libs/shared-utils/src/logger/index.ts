export type Logger = {
  info: (message: string) => void;
  error: (message: string) => void;
};

export const createLogger = (): Logger => ({
  info: () => undefined,
  error: () => undefined,
});

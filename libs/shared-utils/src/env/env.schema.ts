import { z } from 'zod';

export const createEnv = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  rawEnv: unknown,
): z.infer<TSchema> => {
  const result = schema.safeParse(rawEnv);

  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });

  const message = `Env validation failed:\n${issues.join('\n')}`;
  throw new Error(message);
};

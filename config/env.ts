import dotenv from 'dotenv';
import { z } from 'zod';

// Loads .env if present (gitignored, local-only). Values already set in
// process.env (e.g. injected by CI) always take precedence over .env.
dotenv.config();

const EnvSchema = z.object({
  // Playwright resolves relative request paths against `baseURL` using the
  // URL() constructor: a trailing slash here (paired with no leading slash
  // on client paths) is required for the base path (e.g. `/v2`) to be kept
  // rather than replaced.
  BASE_URL: z
    .string()
    .url()
    .default('https://petstore.swagger.io/v2')
    .transform((url) => (url.endsWith('/') ? url : `${url}/`)),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();

import type { APIRequestContext, APIResponse } from '@playwright/test';

import { env } from '../../config/env';

/**
 * Thrown when an API response is not in the 2xx range. Captures the status
 * and raw body so test failures show exactly what the API returned.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Shared HTTP plumbing for domain-specific API clients. Concrete clients
 * (e.g. PetClient) extend this and expose typed, resource-oriented methods —
 * test files should never call `request.get/post` directly.
 */
export abstract class BaseClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async get(
    url: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<APIResponse> {
    const response = await this.request.get(url, { params, headers: this.authHeaders() });
    return this.assertOk(response);
  }

  protected async post(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.post(url, { data, headers: this.authHeaders() });
    return this.assertOk(response);
  }

  protected async put(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.put(url, { data, headers: this.authHeaders() });
    return this.assertOk(response);
  }

  // Separate from post(): multipart/form-data bodies (file uploads) are a
  // distinct Playwright request option from the JSON `data` used everywhere
  // else, not something post() can express.
  protected async postMultipart(
    url: string,
    multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>,
  ): Promise<APIResponse> {
    const response = await this.request.post(url, { multipart, headers: this.authHeaders() });
    return this.assertOk(response);
  }

  // Separate from post(): x-www-form-urlencoded bodies are a distinct
  // Playwright request option (`form`) from the JSON `data` used elsewhere.
  protected async postForm(url: string, form: Record<string, string>): Promise<APIResponse> {
    const response = await this.request.post(url, { form, headers: this.authHeaders() });
    return this.assertOk(response);
  }

  protected async delete(url: string): Promise<APIResponse> {
    const response = await this.request.delete(url, { headers: this.authHeaders() });
    return this.assertOk(response);
  }

  // Optional, opt-in auth-header injection (see config/env.ts). Returns
  // undefined — a no-op for Playwright's request options — unless both
  // API_AUTH_HEADER_NAME and API_AUTH_HEADER_VALUE are configured. Playwright
  // merges these per-request headers with playwright.config.ts's
  // extraHTTPHeaders rather than replacing them. Deliberately never logged or
  // included in ApiError — only the header *name* would ever be useful in a
  // failure message, and this doesn't even do that, to keep the value out of
  // every code path on principle.
  private authHeaders(): Record<string, string> | undefined {
    if (!env.API_AUTH_HEADER_NAME || !env.API_AUTH_HEADER_VALUE) {
      return undefined;
    }
    return { [env.API_AUTH_HEADER_NAME]: env.API_AUTH_HEADER_VALUE };
  }

  private async assertOk(response: APIResponse): Promise<APIResponse> {
    if (!response.ok()) {
      const body: unknown = await response.text().catch(() => undefined);
      throw new ApiError(
        `Request failed: ${response.status()} ${response.url()}`,
        response.status(),
        body,
      );
    }
    return response;
  }
}

import type { APIRequestContext, APIResponse } from '@playwright/test';

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
    const response = await this.request.get(url, { params });
    return this.assertOk(response);
  }

  protected async post(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.post(url, { data });
    return this.assertOk(response);
  }

  protected async put(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.put(url, { data });
    return this.assertOk(response);
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

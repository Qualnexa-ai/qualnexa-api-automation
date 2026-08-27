import { z } from 'zod';

/**
 * Generic success/error envelope shared across several operations (e.g.
 * `DELETE /pet/{petId}`, `POST /user`, `POST /pet/{petId}/uploadImage`) per
 * the OpenAPI spec's `definitions.ApiResponse`. Not specific to any one
 * resource, so it lives here rather than in a per-resource schema file.
 */
export const ApiResponseSchema = z.object({
  code: z.number(),
  type: z.string(),
  message: z.string(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

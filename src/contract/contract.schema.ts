import { z } from 'zod';

/**
 * Typed, normalized representation of the OpenAPI/Swagger 2.0 contract facts
 * that Days 25-26's deterministic drift-detection and negative-test
 * candidate logic have a concrete, named need for — NOT a general-purpose
 * OpenAPI model.
 *
 * This is deliberately kept separate from `src/schemas/*.ts`: those Zod
 * schemas are this project's *curated, live-verified* contract (e.g.
 * `OrderSchema.id` is optional not because the spec says so, but because
 * live verification proved the server never enforces it). The model here is
 * the *raw, as-declared* contract — a mechanical transcription of what the
 * spec literally claims, before anyone checked it against reality. The two
 * are meant to disagree in places; that disagreement is exactly what a
 * future drift engine needs two distinct sources to compute. See
 * docs/API-BEHAVIOR-NOTES.md for the disagreements already found by hand.
 */

export const ContractParamLocationSchema = z.enum(['path', 'query', 'header', 'formData']);

export const ContractParameterSchema = z.object({
  name: z.string(),
  in: ContractParamLocationSchema,
  required: z.boolean(),
  type: z.string().optional(),
  format: z.string().optional(),
  enum: z.array(z.string()).optional(),
  collectionFormat: z.string().optional(),
});

/**
 * A `$ref`, an array of a `$ref`, or an inline (non-`$ref`) schema — the only
 * three shapes this spec's request/response schemas actually use.
 */
export const ContractSchemaRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ref'), name: z.string() }),
  z.object({ kind: z.literal('arrayOfRef'), name: z.string() }),
  z.object({ kind: z.literal('inline'), type: z.string() }),
]);

export const ContractRequestBodySchema = z.object({
  required: z.boolean(),
  schema: ContractSchemaRefSchema,
});

export const ContractResponseSchema = z.object({
  statusCode: z.string(),
  schema: ContractSchemaRefSchema.optional(),
  headerNames: z.array(z.string()).optional(),
});

export const ContractOperationSchema = z.object({
  path: z.string(),
  method: z.enum(['get', 'post', 'put', 'delete', 'patch']),
  operationId: z.string(),
  parameters: z.array(ContractParameterSchema),
  requestBody: ContractRequestBodySchema.optional(),
  responses: z.array(ContractResponseSchema),
  // Flattened security-scheme names declared on this operation (e.g.
  // ["petstore_auth"], ["api_key"]) — empty if none declared.
  security: z.array(z.string()),
  consumes: z.array(z.string()),
  deprecated: z.boolean(),
});

export const ContractPropertySchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  format: z.string().optional(),
  enum: z.array(z.string()).optional(),
  // Derived from the definition's own `required` array, per-property.
  required: z.boolean(),
});

export const ContractDefinitionSchema = z.object({
  name: z.string(),
  properties: z.array(ContractPropertySchema),
});

export const ContractModelSchema = z.object({
  operations: z.array(ContractOperationSchema),
  definitions: z.array(ContractDefinitionSchema),
});

export type ContractParamLocation = z.infer<typeof ContractParamLocationSchema>;
export type ContractParameter = z.infer<typeof ContractParameterSchema>;
export type ContractSchemaRef = z.infer<typeof ContractSchemaRefSchema>;
export type ContractRequestBody = z.infer<typeof ContractRequestBodySchema>;
export type ContractResponse = z.infer<typeof ContractResponseSchema>;
export type ContractOperation = z.infer<typeof ContractOperationSchema>;
export type ContractProperty = z.infer<typeof ContractPropertySchema>;
export type ContractDefinition = z.infer<typeof ContractDefinitionSchema>;
export type ContractModel = z.infer<typeof ContractModelSchema>;

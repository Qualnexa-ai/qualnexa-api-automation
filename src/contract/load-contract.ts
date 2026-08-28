import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ContractModelSchema,
  type ContractDefinition,
  type ContractModel,
  type ContractOperation,
  type ContractParamLocation,
  type ContractParameter,
  type ContractProperty,
  type ContractResponse,
  type ContractSchemaRef,
} from './contract.schema';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

// Minimal shape of the raw Swagger 2.0 JSON this loader actually reads —
// only the fields the Contract Model needs, not a general-purpose OpenAPI
// type. `unknown`/optional-heavy on purpose: this is untrusted file input,
// mapped defensively rather than assumed.
interface RawSchema {
  $ref?: string;
  type?: string;
  items?: RawSchema;
  enum?: string[];
}

interface RawParameter {
  name: string;
  in: string;
  required?: boolean;
  type?: string;
  format?: string;
  enum?: string[];
  collectionFormat?: string;
  items?: RawSchema;
  schema?: RawSchema;
}

interface RawResponse {
  schema?: RawSchema;
  headers?: Record<string, unknown>;
}

interface RawOperation {
  operationId: string;
  parameters?: RawParameter[];
  responses?: Record<string, RawResponse>;
  security?: Record<string, string[]>[];
  consumes?: string[];
  deprecated?: boolean;
}

interface RawProperty {
  type?: string;
  format?: string;
  enum?: string[];
}

interface RawDefinition {
  required?: string[];
  properties?: Record<string, RawProperty>;
}

interface RawSpec {
  paths: Record<string, Record<string, RawOperation>>;
  definitions?: Record<string, RawDefinition>;
}

/** `#/definitions/Pet` -> `Pet`. */
function refName(ref: string): string {
  return ref.replace('#/definitions/', '');
}

function toSchemaRef(schema: RawSchema | undefined): ContractSchemaRef | undefined {
  if (!schema) {
    return undefined;
  }
  if (schema.$ref) {
    return { kind: 'ref', name: refName(schema.$ref) };
  }
  if (schema.type === 'array' && schema.items?.$ref) {
    return { kind: 'arrayOfRef', name: refName(schema.items.$ref) };
  }
  return { kind: 'inline', type: schema.type ?? 'unknown' };
}

function toParameter(param: RawParameter): ContractParameter {
  // Array-typed params (e.g. findByStatus's `status`) carry their enum
  // nested under `items`, not on the parameter itself.
  const enumValues = param.enum ?? param.items?.enum;
  return {
    name: param.name,
    in: param.in as ContractParamLocation,
    required: param.required ?? false,
    type: param.type,
    format: param.format,
    enum: enumValues,
    collectionFormat: param.collectionFormat,
  };
}

function toResponses(responses: Record<string, RawResponse> | undefined): ContractResponse[] {
  return Object.entries(responses ?? {}).map(([statusCode, response]) => ({
    statusCode,
    schema: toSchemaRef(response.schema),
    headerNames: response.headers ? Object.keys(response.headers) : undefined,
  }));
}

function toOperation(path: string, method: HttpMethod, op: RawOperation): ContractOperation {
  const bodyParam = op.parameters?.find((p) => p.in === 'body');
  const otherParams = (op.parameters ?? []).filter((p) => p.in !== 'body').map(toParameter);

  return {
    path,
    method,
    operationId: op.operationId,
    parameters: otherParams,
    requestBody: bodyParam
      ? { required: bodyParam.required ?? false, schema: toSchemaRef(bodyParam.schema)! }
      : undefined,
    responses: toResponses(op.responses),
    security: (op.security ?? []).flatMap((entry) => Object.keys(entry)),
    consumes: op.consumes ?? [],
    deprecated: op.deprecated ?? false,
  };
}

function toDefinition(name: string, def: RawDefinition): ContractDefinition {
  const required = new Set(def.required ?? []);
  const properties = Object.entries(def.properties ?? {}).map(
    ([propName, prop]): ContractProperty => ({
      name: propName,
      type: prop.type,
      format: prop.format,
      enum: prop.enum,
      required: required.has(propName),
    }),
  );
  return { name, properties };
}

/**
 * Loads and normalizes the cached OpenAPI/Swagger 2.0 spec into a
 * `ContractModel`. Deterministic (no network, no clock) and Zod-validated on
 * the way out. Defaults to this repo's cached spec; `specPath` exists so the
 * same loader can be pointed at a different spec if this repo is ever
 * reused against a different API.
 */
export function loadContractModel(specPath?: string): ContractModel {
  const resolvedPath = specPath ?? resolve(process.cwd(), 'openapi/petstore.swagger.json');
  const raw = JSON.parse(readFileSync(resolvedPath, 'utf-8')) as RawSpec;

  const operations: ContractOperation[] = [];
  for (const [path, methods] of Object.entries(raw.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if ((HTTP_METHODS as readonly string[]).includes(method)) {
        operations.push(toOperation(path, method as HttpMethod, op));
      }
    }
  }

  const definitions = Object.entries(raw.definitions ?? {}).map(([name, def]) =>
    toDefinition(name, def),
  );

  return ContractModelSchema.parse({ operations, definitions });
}

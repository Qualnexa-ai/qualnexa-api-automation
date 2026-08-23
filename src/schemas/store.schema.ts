import { z } from 'zod';

/**
 * `GET /store/inventory` returns a map of pet status → count. Per the
 * OpenAPI spec (openapi/petstore.swagger.json, paths./store.inventory.get),
 * it takes no parameters and its schema is `{ additionalProperties: integer }`
 * — an open-ended record, not a fixed set of keys.
 */
export const StoreInventorySchema = z.record(z.string(), z.number().int());

export type StoreInventory = z.infer<typeof StoreInventorySchema>;

import { z } from 'zod';

/**
 * `GET /store/inventory` returns a map of pet status → count. Per the
 * OpenAPI spec (openapi/petstore.swagger.json, paths./store.inventory.get),
 * it takes no parameters and its schema is `{ additionalProperties: integer }`
 * — an open-ended record, not a fixed set of keys.
 */
export const StoreInventorySchema = z.record(z.string(), z.number().int());

export type StoreInventory = z.infer<typeof StoreInventorySchema>;

export const OrderStatusSchema = z.enum(['placed', 'approved', 'delivered']);

/**
 * `POST /store/order` request/response shape. Per the OpenAPI spec
 * (openapi/petstore.swagger.json, definitions.Order), every property is
 * optional — the `Order` definition declares no `required` array, and this
 * was live-verified: posting `{}` returns 200 with server-defaulted fields
 * rather than a validation error.
 */
export const OrderSchema = z.object({
  id: z.number().int().optional(),
  petId: z.number().optional(),
  quantity: z.number().int().optional(),
  shipDate: z.string().optional(),
  status: OrderStatusSchema.optional(),
  complete: z.boolean().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

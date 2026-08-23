import { z } from 'zod';

export const PetStatusSchema = z.enum(['available', 'pending', 'sold']);

export const PetSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  category: z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
    })
    .optional(),
  photoUrls: z.array(z.string()),
  tags: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  status: PetStatusSchema.optional(),
});

export type Pet = z.infer<typeof PetSchema>;
export type PetStatus = z.infer<typeof PetStatusSchema>;

export const PetListSchema = z.array(PetSchema);

import { z } from "zod";
import { NextResponse } from "next/server";

export function validationError(error: z.ZodError) {
  return NextResponse.json({ error: error.flatten() }, { status: 422 });
}

// Users
export const CreateUserSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email().max(255),
  password: z.string().min(8).max(128),
  role:     z.enum(["ADMIN", "STAFF"]).default("STAFF"),
}).strict();

export const PatchUserSchema = z.object({
  name:     z.string().min(1).max(100).trim().optional(),
  email:    z.string().email().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
  role:     z.enum(["ADMIN", "STAFF"]).optional(),
}).strict();

// Tables
export const CreateTableSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  capacity: z.number().int().min(1).max(100).default(4),
}).strict();

export const PatchTableSchema = z.object({
  name:     z.string().min(1).max(100).trim().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
}).strict();

// Sessions
export const CreateSessionSchema = z.object({
  tableId:   z.string().min(1),
  consumers: z.number().int().min(1).max(100),
}).strict();

export const PatchSessionSchema = z.object({
  status:    z.literal("CLOSED").optional(),
  consumers: z.number().int().min(1).max(100).optional(),
}).strict();

// Order Items
export const CreateOrderItemSchema = z.object({
  sessionId: z.string().min(1),
  productId: z.string().min(1),
  quantity:  z.number().int().min(1).max(999).default(1),
}).strict();

export const PatchOrderItemSchema = z.object({
  quantity: z.number().int().min(0).max(999),
}).strict();

// Products
export const CreateProductSchema = z.object({
  name:       z.string().min(1).max(200).trim(),
  categoryId: z.string().min(1),
  finalPrice: z.number().positive().max(9999),
}).strict();

export const PatchProductSchema = z.object({
  name:       z.string().min(1).max(200).trim().optional(),
  active:     z.boolean().optional(),
  finalPrice: z.number().positive().max(9999).optional(),
  categoryId: z.string().min(1).optional(),
}).strict();

// Categories
export const CreateCategorySchema = z.object({
  name:      z.string().min(1).max(100).trim(),
  vatRateId: z.string().min(1),
}).strict();

export const PatchCategorySchema = z.object({
  name:      z.string().min(1).max(100).trim().optional(),
  vatRateId: z.string().min(1).optional(),
}).strict();

// VAT Rates
export const CreateVatRateSchema = z.object({
  label: z.string().min(1).max(100).trim(),
  rate:  z.number().min(0).max(1),
}).strict();

export const PatchVatRateSchema = z.object({
  label: z.string().min(1).max(100).trim().optional(),
  rate:  z.number().min(0).max(1).optional(),
}).strict();

// Export date params
export const ExportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

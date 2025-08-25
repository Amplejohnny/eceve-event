import { z } from "zod";

// Nigerian phone number validation
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

// Custom ID validation that accepts both UUIDs and your custom format
const customIdSchema = z
  .string()
  .min(1, "ID is required")
  .refine((val) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customIdRegex = /^[a-z0-9]{20,30}$/i;
    return uuidRegex.test(val) || customIdRegex.test(val);
  }, "Invalid ID format");

// Attendee info schema
export const attendeeInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens and apostrophes"
    )
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val.trim() === "" || phoneRegex.test(val.replace(/\s/g, "")),
      "Please enter a valid Nigerian phone number"
    )
    .transform((val) => val?.trim() || undefined),
});

// Ticket order schema
export const ticketOrderSchema = z.object({
  ticketTypeId: customIdSchema,
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum 10 tickets per type"),
  attendeeName: attendeeInfoSchema.shape.fullName,
  attendeeEmail: attendeeInfoSchema.shape.email,
  attendeePhone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val.trim() === "" || phoneRegex.test(val.replace(/\s/g, "")),
      "Please enter a valid Nigerian phone number"
    )
    .transform((val) => val?.trim() || undefined),
});

// Payment initialization schema
export const paymentInitSchema = z.object({
  eventId: customIdSchema,
  tickets: z.array(ticketOrderSchema).min(1, "At least one ticket is required"),
  amount: z.number().int().min(0, "Amount must be non-negative"),
  customerEmail: attendeeInfoSchema.shape.email,
});

// Free ticket booking schema
export const freeTicketBookingSchema = z.object({
  eventId: customIdSchema,
  tickets: z.array(ticketOrderSchema).min(1, "At least one ticket is required"),
});

export type AttendeeInfo = z.infer<typeof attendeeInfoSchema>;
export type TicketOrder = z.infer<typeof ticketOrderSchema>;
export type PaymentInitRequest = z.infer<typeof paymentInitSchema>;
export type FreeTicketBookingRequest = z.infer<typeof freeTicketBookingSchema>;

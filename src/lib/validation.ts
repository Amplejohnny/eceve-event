import { z } from "zod";

// Nigerian phone number validation
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

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
  ticketTypeId: z.string().uuid("Invalid ticket type ID"),
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum 10 tickets per type"),
  attendeeName: attendeeInfoSchema.shape.fullName,
  attendeeEmail: attendeeInfoSchema.shape.email,
  attendeePhone: attendeeInfoSchema.shape.phone,
});

// Payment initialization schema
export const paymentInitSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  tickets: z.array(ticketOrderSchema).min(1, "At least one ticket is required"),
  amount: z.number().int().min(0, "Amount must be non-negative"),
  customerEmail: attendeeInfoSchema.shape.email,
});

// Free ticket booking schema
export const freeTicketBookingSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  tickets: z.array(ticketOrderSchema).min(1, "At least one ticket is required"),
});

export type AttendeeInfo = z.infer<typeof attendeeInfoSchema>;
export type TicketOrder = z.infer<typeof ticketOrderSchema>;
export type PaymentInitRequest = z.infer<typeof paymentInitSchema>;
export type FreeTicketBookingRequest = z.infer<typeof freeTicketBookingSchema>;

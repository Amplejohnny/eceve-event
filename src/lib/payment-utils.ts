import type { PaymentStatus, Prisma } from "@/generated/prisma";
import { db } from "./db";

export interface PaymentBreakdown {
  ticketSubtotal: number;
  paystackFee: number;
  totalAmount: number;
  organizerAmount: number;
  platformAmount: number;
}

// 1.5% + ₦100 for amounts less than ₦2,500 according to Paystack's fee structure
export function calculatePaystackFee(amount: number): number {
  if (amount < 250000) {
    return Math.round(amount * 0.015);
  }
  const fee = Math.round(amount * 0.015) + 10000; // 1.5% + ₦100
  return Math.min(fee, 200000); // Cap at ₦2,000
}

export function calculatePaymentBreakdown(
  ticketSubtotal: number
): PaymentBreakdown {
  const paystackFee = calculatePaystackFee(ticketSubtotal);

  // Platform takes 7% of ticket subtotal, organizer gets 93%
  const platformAmount = Math.round(ticketSubtotal * 0.07);
  const organizerAmount = ticketSubtotal - platformAmount;

  // Total amount customer pays = tickets + paystack fee
  const totalAmount = ticketSubtotal + paystackFee;

  return {
    ticketSubtotal,
    paystackFee,
    totalAmount,
    organizerAmount,
    platformAmount,
  };
}

//format price in kobo to Nigerian Naira string
export function formatPrice(priceInKobo: number): string {
  return `₦${(priceInKobo / 100).toLocaleString()}`;
}

//Validate payment amounts
export function validatePaymentAmount(
  clientAmount: number,
  calculatedAmount: number,
  tolerance: number = 100 // 1 naira tolerance
): boolean {
  return Math.abs(clientAmount - calculatedAmount) <= tolerance;
}

export async function createPayment(data: {
  paystackRef: string;
  amount: number;
  platformFee: number;
  organizerAmount: number;
  customerEmail: string;
  eventId: string;
  status?: PaymentStatus;
  metadata?: Prisma.InputJsonValue;
}) {
  return await db.payment.create({
    data: {
      ...data,
      status: data.status ?? "PENDING",
    },
  });
}

export async function updatePayment(
  paystackRef: string,
  data: Prisma.PaymentUpdateInput | Prisma.PaymentUncheckedUpdateInput
) {
  return await db.payment.update({
    where: { paystackRef },
    data,
  });
}

export async function getPaymentByReference(paystackRef: string) {
  return await db.payment.findUnique({
    where: { paystackRef },
    include: {
      event: true,
      tickets: true,
    },
  });
}

// In your payment-utils.ts file

export async function findPaymentWithRelations(paystackRef: string) {
  return await db.payment.findUnique({
    where: { paystackRef },
    include: {
      event: {
        include: {
          ticketTypes: true,
          organizer: true,
        },
      },
    },
  });
}

export async function deletePayment(paymentId: string) {
  return await db.payment.delete({
    where: { id: paymentId },
  });
}

export async function createTicketsBatch(
  ticketsData: Prisma.TicketCreateManyInput[]
) {
  return await db.ticket.createMany({
    data: ticketsData,
  });
}

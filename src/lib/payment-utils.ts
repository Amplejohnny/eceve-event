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

export function calculatePaymentBreakdown(ticketSubtotal: number): PaymentBreakdown {
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
    platformAmount
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
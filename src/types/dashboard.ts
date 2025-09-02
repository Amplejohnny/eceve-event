export interface Attendee {
  id: string;
  eventId: string;
  userId: string;
  ticketId: string;
  status: "confirmed" | "pending" | "cancelled" | "refunded";
  registrationDate: string;
  checkInDate?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    type: string;
    price: number;
  };
  event: {
    id: string;
    title: string;
    date: string;
  };
}

export interface Withdrawal {
  id: string;
  organizerId: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "cancelled" | "failed";
  requestDate: string;
  processedDate?: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber?: string;
  };
  notes?: string;
  transactionId?: string;
}

export interface EarningsData {
  totalRevenue: number;
  totalEarnings: number;
  totalPlatformFees: number;
  availableBalance: number;
  pendingWithdrawals: number;
  recentEarnings: number;
  monthlyData: Record<string, number>;
  currency: string;
}

export interface AttendeesData {
  attendees: Attendee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

export interface WithdrawalsData {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalWithdrawn: number;
    pendingAmount: number;
    statusSummary: Record<string, { count: number; totalAmount: number }>;
  };
}







// types/dashboard.ts

export interface Attendee {
  id: string;
  eventId: string;
  userId: string;
  ticketId: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'refunded';
  registrationDate: string;
  checkInDate?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    type: string;
    price: number;
  };
  event: {
    id: string;
    title: string;
    date: string;
  };
}

export interface Withdrawal {
  id: string;
  organizerId: string;
  amount: number;
  currency: string;
//   status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
  processedAt?: string;
  accountName: string;
  bankAccount?: string;
  paystackRef?: string;
  notes?: string;
}

export interface EarningsData {
  totalRevenue: number;
  totalEarnings: number;
  totalPlatformFees: number;
  availableBalance: number;
  pendingWithdrawals: number;
  recentEarnings: number;
  monthlyData: Record<string, number>;
  currency: string;
}

export interface AttendeesData {
  attendees: Attendee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

export interface WithdrawalsData {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalWithdrawn: number;
    pendingAmount: number;
    statusSummary: Record<string, { count: number; totalAmount: number }>;
  };
}
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting for Naira
export function formatCurrency(
  amount: number,
  currency: string = "NGN"
): string {
  // Convert from kobo to naira for display
  const nairaAmount = amount / 100;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(nairaAmount);
}

// Convert Naira to Kobo for Paystack
export function toKobo(nairaAmount: number): number {
  return Math.round(nairaAmount * 100);
}

// Convert Kobo to Naira
export function fromKobo(koboAmount: number): number {
  return parseFloat((koboAmount / 100).toFixed(2));
}

// Date formatting utilities
export function formatDate(
  date: Date | string,
  formatStr: string = "PPP"
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatDateRange(
  startDate: Date | string,
  endDate?: Date | string
): string {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;

  if (!endDate) {
    return format(start, "PPP 'at' p");
  }

  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  // Same day
  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return `${format(start, "PPP")} from ${format(start, "p")} to ${format(
      end,
      "p"
    )}`;
  }

  // Different days
  return `${format(start, "PPP 'at' p")} - ${format(end, "PPP 'at' p")}`;
}

export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function isEventActive(eventDate: Date | string): boolean {
  const dateObj =
    typeof eventDate === "string" ? parseISO(eventDate) : eventDate;
  return isAfter(dateObj, new Date());
}

export function isEventPast(eventDate: Date | string): boolean {
  const dateObj =
    typeof eventDate === "string" ? parseISO(eventDate) : eventDate;
  return isBefore(dateObj, new Date());
}

// String utilities
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function getUserAvatarUrl(imageUrl?: string, email?: string): string {
  if (imageUrl) return imageUrl;

  if (email) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      email
    )}&color=fff&size=128`;
  }

  return `https://ui-avatars.com/api/?name=pp&background=6B7280&color=fff&size=128`;
}

// Image utilities
export function getEventImageUrl(imageUrl?: string): string {
  if (imageUrl && imageUrl.trim() !== "") return imageUrl;
  return `https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGV2ZW50c3xlbnwwfHwwfHx8MA%3D%3D`;
}


//To call different fallback images
export function getEventImage(
  imageUrl?: string | null,
  fallbackUrl: string = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=400&fit=crop"
): string {
  return imageUrl && imageUrl.trim() !== "" ? imageUrl : fallbackUrl;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export function generateConfirmationId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (Nigerian format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Format phone number
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }

  return phone;
}

// Array utilities
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getEventUrl(slug: string): string {
  return `${getBaseUrl()}/events/${slug}`;
}

export function getEventShareUrl(slug: string): string {
  return `${getBaseUrl()}/e/${slug}`;
}

// Email masking utility for verification page
export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;

  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${"*".repeat(localPart.length)}@${domain}`;
  }

  const visibleStart = localPart.slice(0, 1);
  const visibleEnd = localPart.slice(-1);
  const maskedMiddle = "*".repeat(Math.max(localPart.length - 2, 1));

  return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
};

// Server-side request rate limiting helper
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return {
    checkLimit: (
      identifier: string
    ): { allowed: boolean; remaining: number } => {
      const now = Date.now();
      const current = requests.get(identifier);

      if (!current || now > current.resetTime) {
        requests.set(identifier, {
          count: 1,
          resetTime: now + windowMs,
        });
        return { allowed: true, remaining: maxRequests - 1 };
      }

      if (current.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }

      current.count++;
      return { allowed: true, remaining: maxRequests - current.count };
    },

    reset: (identifier: string): void => {
      requests.delete(identifier);
    },
  };
}

// Location utilities
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)}km away`;
}

// Error handling
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Local storage utilities (with error handling)
export function safeLocalStorage() {
  const isClient = typeof window !== "undefined";

  return {
    getItem: (key: string): string | null => {
      if (!isClient) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      if (!isClient) return;
      try {
        localStorage.setItem(key, value);
      } catch {
        // Silently fail
      }
    },
    removeItem: (key: string): void => {
      if (!isClient) return;
      try {
        localStorage.removeItem(key);
      } catch {
        // Silently fail
      }
    },
  };
}

// Debounce function
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Random utilities
export function getRandomColor(): string {
  const colors = [
    "bg-red-100 text-red-800",
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-gray-100 text-gray-800",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

// Validation utilities
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

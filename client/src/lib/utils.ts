import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUzbekPhone(phone: string): string {
  // Normalize: remove non-numeric chars
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid Uzbek number length (9 digits without prefix, or 12 with 998)
  // Format: +998 90 123-45-67

  let mainPart = cleaned;
  if (cleaned.startsWith('998')) {
    mainPart = cleaned.slice(3);
  } else if (cleaned.length > 9) {
    mainPart = cleaned.slice(-9); // Take last 9
  }

  if (mainPart.length !== 9) return phone; // Return original if not valid

  const p1 = mainPart.slice(0, 2);
  const p2 = mainPart.slice(2, 5);
  const p3 = mainPart.slice(5, 7);
  const p4 = mainPart.slice(7, 9);

  return `+998 ${p1} ${p2}-${p3}-${p4}`;
}

export function formatUzbekDate(date: string | Date): string {
  if (!date) return "";
  const d = new Date(date);
  // DD.MM.YYYY
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
export function formatUzbekCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

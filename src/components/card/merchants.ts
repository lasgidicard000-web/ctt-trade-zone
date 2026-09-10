export interface MerchantOption {
  name: string;
  category: string;
  hint: string;
}

export const MERCHANTS: MerchantOption[] = [
  { name: "Binance", category: "Exchange", hint: "Buy crypto with your card" },
  { name: "Bybit", category: "Exchange", hint: "Fund your derivatives account" },
  { name: "Amazon", category: "Retail", hint: "Checkout worldwide" },
  { name: "Apple", category: "Digital", hint: "App Store & iCloud" },
  { name: "Netflix", category: "Subscription", hint: "Monthly billing" },
  { name: "Steam", category: "Gaming", hint: "Wallet top-up" },
  { name: "Uber", category: "Travel", hint: "Rides & Uber Eats" },
  { name: "Booking.com", category: "Travel", hint: "Hotels & flights" },
];

export const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

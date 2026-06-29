import type { Period } from "@/components/period-tabs";

export function getDateFrom(period: Period | string): string | null {
  const now = new Date();
  switch (period) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "season": {
      const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      return new Date(year, 8, 1).toISOString();
    }
    default:
      return null;
  }
}

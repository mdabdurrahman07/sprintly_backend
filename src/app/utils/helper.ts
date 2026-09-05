import { isBefore, isAfter } from "date-fns";

export function isSubscriptionActive(
  subscription:
    | {
        status: string;
        startDate: Date | null;
        endDate: Date | null;
      }
    | null
    | undefined,
): boolean {
  if (!subscription || subscription.status !== "ACTIVE") {
    return false;
  }

  if (!subscription.startDate || !subscription.endDate) {
    return false;
  }

  const now = new Date();
  return (
    isBefore(now, subscription.endDate) && isAfter(now, subscription.startDate)
  );
}

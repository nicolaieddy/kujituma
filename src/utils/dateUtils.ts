/**
 * Get a date in YYYY-MM-DD format using local timezone.
 * This is crucial for features like daily check-ins where "today"
 * should match the user's local day, not UTC.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateFromPeriod = (period: string) => {
  if (period === "all") return null;
  
  const now = new Date();
  const daysMap: Record<string, number> = {
    "1day": 1,
    "3days": 3,
    "7days": 7,
    "14days": 14,
    "30days": 30
  };
  
  const daysAgo = new Date();
  daysAgo.setDate(now.getDate() - daysMap[period]);
  return daysAgo;
};

export const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

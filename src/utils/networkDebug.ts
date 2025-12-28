type NetworkFailure = {
  url: string;
  status: number;
  statusText: string;
  time: string;
  method: string;
};

const STORAGE_KEY = "app:networkFailures";
const MAX_ITEMS = 25;

function safeRead(): NetworkFailure[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(items: NetworkFailure[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

function recordFailure(failure: NetworkFailure) {
  const existing = safeRead();
  const next = [failure, ...existing].slice(0, MAX_ITEMS);
  safeWrite(next);
  try {
    window.dispatchEvent(new CustomEvent("app:networkFailure", { detail: failure }));
  } catch {
    // ignore
  }
}

export function installNetworkFailureLogger() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__networkFailureLoggerInstalled) return;
  w.__networkFailureLoggerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : String(input);

    try {
      const res = await originalFetch(input as any, init);

      // Only record failures
      if (!res.ok) {
        recordFailure({
          url,
          method,
          status: res.status,
          statusText: res.statusText || "",
          time: new Date().toISOString(),
        });
      }

      return res;
    } catch (err) {
      recordFailure({
        url,
        method,
        status: 0,
        statusText: err instanceof Error ? err.message : "Network error",
        time: new Date().toISOString(),
      });
      throw err;
    }
  };
}

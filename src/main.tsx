import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNetworkFailureLogger } from "@/utils/networkDebug";

declare global {
  interface Window {
    __pwaRefreshing?: boolean;
  }
}

installNetworkFailureLogger();

// Force a single canonical domain in production so Supabase auth cookies
// (and Strava OAuth flows) don't break when switching between www/non-www.
// You can override this via VITE_CANONICAL_HOST.
const CANONICAL_HOST = (import.meta.env.VITE_CANONICAL_HOST as string | undefined) ||
  (window.location.hostname === "kujituma.com" ? "www.kujituma.com" : undefined);

if (CANONICAL_HOST && window.location.hostname !== CANONICAL_HOST) {
  const url = new URL(window.location.href);
  url.hostname = CANONICAL_HOST;
  window.location.replace(url.toString());
} else {
  // Ensure users always get the latest published version when the service worker updates.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (window.__pwaRefreshing) return;
      window.__pwaRefreshing = true;
      window.location.reload();
    });

    // Best-effort: ask the SW registration to check for updates on load.
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        // ignore
      });
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

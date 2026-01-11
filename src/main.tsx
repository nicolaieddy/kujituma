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

// Service worker update handling.
// Previously we forced a hard reload on `controllerchange` to ensure the latest version.
// That can cause surprising full-page refreshes ~seconds after load (especially right after install/update).
// Instead, we avoid auto-reloading; the new version will be used on the next navigation/reload.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Prevent noisy repeated logs.
    if (window.__pwaRefreshing) return;
    window.__pwaRefreshing = true;
    console.info("[PWA] New version activated. Reload to update.");
  });

  // NOTE: We intentionally do NOT force `registration.update()` on load.
  // Forcing an update can trigger `controllerchange` shortly after first paint.
}

createRoot(document.getElementById("root")!).render(<App />);

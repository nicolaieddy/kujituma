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


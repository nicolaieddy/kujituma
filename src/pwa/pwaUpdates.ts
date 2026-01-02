import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

declare global {
  interface Window {
    __pwaCheckForUpdate?: () => void;
    __pwaApplyUpdate?: () => void;
  }
}

/**
 * Registers the PWA service worker and provides a reliable "update available" prompt.
 * This avoids the common PWA issue where users stay on an old cached version after publishing.
 */
export function setupPwaUpdates() {
  // Only runs in browsers that support SW
  if (!("serviceWorker" in navigator)) return;

  try {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW: (_swUrl, reg) => {
        // Expose a simple manual check to the Debug page.
        window.__pwaCheckForUpdate = () => {
          reg?.update().catch(() => {
            /* ignore */
          });
        };
      },
      onNeedRefresh: () => {
        toast("Update available", {
          description: "Reload to get the latest published version.",
          duration: Infinity,
          action: {
            label: "Reload",
            onClick: () => updateSW(true),
          },
          cancel: {
            label: "Later",
            onClick: () => {},
          },
        });
      },
    });

    // Expose an "apply update now" helper for Debug.
    window.__pwaApplyUpdate = () => updateSW(true);
  } catch {
    // ignore: SW registration is best-effort.
  }
}

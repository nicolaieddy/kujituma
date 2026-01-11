import { lazy } from "react";

const ProfileFull = lazy(() => import("./Profile"));
const ProfileLite = lazy(() => import("./ProfileLite"));

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform || "";
  const maxTouchPoints = (navigator as any).maxTouchPoints || 0;
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
};

/**
 * Entry route for /profile that can switch implementations without importing
 * the full profile module on iOS.
 */
const ProfileEntry = () => {
  // Avoid react-router search param hooks here—some iOS builds were still
  // crashing even in safe mode; parsing directly is the simplest/most robust.
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const safe = params.get("safe") === "1";
  const forceFull = params.get("full") === "1";

  // Default: iOS uses the lightweight version to avoid stack overflows.
  const useLite = (safe || isIOS()) && !forceFull;

  return useLite ? <ProfileLite /> : <ProfileFull />;
};

export default ProfileEntry;


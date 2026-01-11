import { lazy } from "react";
import { useSearchParams } from "react-router-dom";

const ProfileFull = lazy(() => import("./Profile"));
const ProfileLite = lazy(() => import("./ProfileLite"));

/**
 * Entry route for /profile that can switch implementations without importing
 * the full profile module on iOS safe-mode.
 */
const ProfileEntry = () => {
  const [searchParams] = useSearchParams();
  const safeMode = searchParams.get("safe") === "1";

  // IMPORTANT: In safe mode we render ProfileLite to avoid importing Profile.tsx
  // and its Radix-heavy dependency graph, which can trigger iOS stack overflows.
  return safeMode ? <ProfileLite /> : <ProfileFull />;
};

export default ProfileEntry;

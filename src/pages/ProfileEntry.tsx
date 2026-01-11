import { lazy } from "react";

// The rewritten Profile.tsx avoids Radix Tabs and useSearchParams, so it
// should work on iOS. We still keep ProfileLite as a fallback via ?lite=1.
const ProfileFull = lazy(() => import("./Profile"));
const ProfileLite = lazy(() => import("./ProfileLite"));

/**
 * Entry point for /profile route.
 * - Default: renders the full (now iOS-safe) Profile page.
 * - ?lite=1: renders the minimal debug ProfileLite page.
 */
const ProfileEntry = () => {
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const useLite = params.get("lite") === "1";

  return useLite ? <ProfileLite /> : <ProfileFull />;
};

export default ProfileEntry;


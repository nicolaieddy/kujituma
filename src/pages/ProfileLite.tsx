import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LiteProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  about_me: string | null;
  created_at: string;
};

/**
 * Minimal profile page for iOS debugging.
 * Intentionally avoids Radix components, tooltips, menus, tabs, and heavy subcomponents.
 */
export default function ProfileLite() {
  const { user } = useAuth();
  const { userId } = useParams();

  const targetUserId = useMemo(() => userId || user?.id || null, [userId, user?.id]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LiteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!targetUserId) {
        if (mounted) {
          setError("No user context (not logged in)");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, about_me, created_at")
          .eq("id", targetUserId)
          .maybeSingle();

        if (error) throw error;

        if (mounted) {
          setProfile((data as LiteProfile) || null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[ProfileLite] Failed to load profile:", e);
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [targetUserId]);

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Profile Lite</h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>
        Debug route: if this works on iPhone/iPad, the crash is in the full profile UI (Radix components / subcomponents), not
        Supabase auth.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <div>
          <strong>targetUserId:</strong> {targetUserId || "null"}
        </div>
        <div>
          <strong>loggedIn:</strong> {user ? "true" : "false"}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && error && (
        <pre style={{ whiteSpace: "pre-wrap", padding: 12, background: "#111", color: "#eee", borderRadius: 8 }}>{error}</pre>
      )}

      {!loading && !error && !profile && <div>No profile found.</div>}

      {!loading && profile && (
        <div style={{ padding: 12, border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.full_name}</div>
          <div style={{ opacity: 0.75 }}>Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
          {profile.about_me && (
            <div style={{ marginTop: 10 }}>
              <strong>About:</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{profile.about_me}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

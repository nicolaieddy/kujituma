import { useEffect, useState } from "react";

const KEY = "social.showGoalLine";

/** Persisted toggle for showing goal projection lines on charts. */
export function useShowGoalLine(): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(KEY);
    return raw == null ? true : raw === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, val ? "1" : "0");
    // Notify other hook instances in the same tab.
    window.dispatchEvent(new CustomEvent("social-show-goal-line", { detail: val }));
  }, [val]);

  useEffect(() => {
    const handler = (e: Event) => {
      const v = (e as CustomEvent<boolean>).detail;
      setVal(v);
    };
    window.addEventListener("social-show-goal-line", handler as EventListener);
    return () => window.removeEventListener("social-show-goal-line", handler as EventListener);
  }, []);

  return [val, setVal];
}

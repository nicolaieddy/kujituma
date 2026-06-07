import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UseKeyboardShortcutsOptions {
  onNewContact: () => void;
  onShowHelp: () => void;
}

const isTyping = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((e.target as HTMLElement)?.isContentEditable) return true;
  return false;
};

const routes = ["/dashboard", "/contacts", "/calendar", "/tools"];

export const useKeyboardShortcuts = ({ onNewContact, onShowHelp }: UseKeyboardShortcutsOptions) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "n") {
        e.preventDefault();
        onNewContact();
        return;
      }

      if (mod && e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        navigate(routes[parseInt(e.key) - 1]);
        return;
      }

      if (e.key === "?" && !mod && !isTyping(e)) {
        e.preventDefault();
        onShowHelp();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, onNewContact, onShowHelp]);
};

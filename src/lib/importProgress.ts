import { toast } from "sonner";

/**
 * Unified progress lifecycle for any import flow.
 *
 *   const p = createImportProgress("LinkedIn import");
 *   p.update("Parsing file…");
 *   p.update("Uploading metrics…");
 *   p.success("Import complete", "1 created · 0 updated");
 *   // or: p.error("Import failed", err.message);
 *
 * Success toasts auto-dismiss after 3s. Errors stay until dismissed.
 */
export interface ImportProgress {
  /** Update the loading-stage message. */
  update: (label: string, description?: string) => void;
  /** Mark success; auto-dismisses. */
  success: (label: string, description?: string) => void;
  /** Mark failure; persists until dismissed. */
  error: (label: string, description?: string) => void;
  /** Mark a soft warning; auto-dismisses. */
  warning: (label: string, description?: string) => void;
  /** Cancel/dismiss without a final state. */
  cancel: () => void;
  /** The toast id, if callers need to compose further. */
  id: string | number;
}

const SUCCESS_AUTOCLOSE_MS = 3000;
const WARNING_AUTOCLOSE_MS = 4000;

export function createImportProgress(initialLabel: string, description?: string): ImportProgress {
  const id = toast.loading(initialLabel, { description });
  return {
    id,
    update: (label, desc) => {
      toast.loading(label, { id, description: desc });
    },
    success: (label, desc) => {
      toast.success(label, { id, description: desc, duration: SUCCESS_AUTOCLOSE_MS });
    },
    error: (label, desc) => {
      toast.error(label, { id, description: desc, duration: Infinity });
    },
    warning: (label, desc) => {
      toast.warning(label, { id, description: desc, duration: WARNING_AUTOCLOSE_MS });
    },
    cancel: () => {
      toast.dismiss(id);
    },
  };
}

/** Human-readable error extraction for the description line. */
export function describeError(e: unknown): string {
  if (!e) return "Unknown error";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

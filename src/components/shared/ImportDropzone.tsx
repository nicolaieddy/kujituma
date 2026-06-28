import { useCallback, useRef, useState, type ReactNode } from "react";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Comma-separated extensions, e.g. ".xlsx,.csv". Used by both the file picker and drop filter. */
  accept: string;
  /** Allow selecting / dropping multiple files. */
  multiple?: boolean;
  /** Called for each accepted file (or once with all files when `multiple`). */
  onFiles: (files: File[]) => void;
  /** Optional headline. Defaults to "Drop files here or click to browse". */
  label?: string;
  /** Optional helper line under the headline. */
  hint?: string;
  /** External busy state (parsing/uploading). Disables interactions and shows spinner. */
  busy?: boolean;
  /** Currently selected file(s) to display. */
  selected?: File[] | File | null;
  /** Optional clear handler — when provided, shows an X to remove the selection. */
  onClear?: () => void;
  /** Override the inner content entirely (for custom previews). */
  children?: ReactNode;
  /** Extra classes for the dropzone container. */
  className?: string;
}

/**
 * Shared drag-and-drop + click-to-browse zone used across every import flow.
 * Visuals are intentionally identical so users learn one pattern.
 */
export function ImportDropzone({
  accept,
  multiple = false,
  onFiles,
  label = "Drop file here or click to browse",
  hint,
  busy = false,
  selected,
  onClear,
  children,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const acceptExts = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const matchesAccept = useCallback(
    (f: File) => {
      if (!acceptExts.length) return true;
      const name = f.name.toLowerCase();
      return acceptExts.some((ext) => {
        if (ext.startsWith(".")) return name.endsWith(ext);
        if (ext.endsWith("/*")) return f.type.startsWith(ext.slice(0, -1));
        return f.type === ext;
      });
    },
    [acceptExts.join("|")],
  );

  const handleFiles = (list: FileList | null) => {
    if (!list || !list.length) return;
    const arr = Array.from(list).filter(matchesAccept);
    if (!arr.length) return;
    onFiles(multiple ? arr : [arr[0]]);
  };

  const selectedArr: File[] = Array.isArray(selected) ? selected : selected ? [selected] : [];

  return (
    <div
      onClick={() => !busy && inputRef.current?.click()}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          setHover(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (busy) return;
        handleFiles(e.dataTransfer?.files ?? null);
      }}
      className={cn(
        "w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer select-none",
        busy
          ? "border-border bg-muted/30 cursor-not-allowed"
          : hover
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 hover:bg-muted/40",
        className,
      )}
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      onKeyDown={(e) => {
        if (busy) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      {children ? (
        children
      ) : selectedArr.length > 0 ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium truncate max-w-[14rem]">
            {selectedArr.length === 1 ? selectedArr[0].name : `${selectedArr.length} files`}
          </span>
          {onClear && !busy && (
            <button
              type="button"
              aria-label="Clear selection"
              className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <>
          {busy ? (
            <Loader2 className="h-7 w-7 mx-auto mb-2 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
          {!hint && (
            <div className="text-xs text-muted-foreground mt-1">
              Accepts {acceptExts.join(", ") || "any file"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

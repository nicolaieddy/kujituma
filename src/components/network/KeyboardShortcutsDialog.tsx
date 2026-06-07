import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl+";

const shortcuts = [
  { keys: `${mod}K`, description: "Search" },
  { keys: `${mod}N`, description: "New Contact" },
  { keys: `${mod}1`, description: "Go to Dashboard" },
  { keys: `${mod}2`, description: "Go to Contacts" },
  { keys: `${mod}3`, description: "Go to Calendar" },
  { keys: `${mod}4`, description: "Go to Tools" },
  { keys: "?", description: "Show this help" },
  { keys: "Esc", description: "Go back" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsDialog = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogDescription>Available shortcuts across the app.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.keys} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{s.description}</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default KeyboardShortcutsDialog;

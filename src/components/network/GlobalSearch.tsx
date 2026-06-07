import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useContacts, useInteractions } from "@/hooks/useData";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users, MessageCircle, Search } from "lucide-react";

const GlobalSearch = ({ hideTrigger = false }: { hideTrigger?: boolean }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: interactions = [] } = useInteractions();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === " ") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const recentInteractions = useMemo(() => {
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    return interactions.slice(0, 20).map((i) => ({
      ...i,
      contactName: contactMap.get(i.contact_id)?.full_name ?? "Unknown",
    }));
  }, [interactions, contacts]);

  const select = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
            ⌘K
          </kbd>
        </button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search contacts, interactions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Contacts">
            {contacts.map((c) => (
              <CommandItem key={c.id} onSelect={() => select(`/contacts/${c.id}`)} value={`${c.full_name} ${c.influence_type} ${c.country || ""} ${c.sector || ""}`}>
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm">{c.full_name}</span>
                  <span className="text-xs text-muted-foreground">{c.influence_type}{c.country ? ` · ${c.country}` : ""}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {recentInteractions.length > 0 && (
            <CommandGroup heading="Recent Interactions">
              {recentInteractions.map((i) => (
                <CommandItem key={i.id} onSelect={() => select(`/contacts/${i.contact_id}`)} value={`${i.contactName} ${i.type} ${i.summary || ""}`}>
                  <MessageCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{i.contactName} — {i.type}</span>
                    {i.summary && <span className="text-xs text-muted-foreground line-clamp-1">{i.summary.replace(/<[^>]*>/g, "").slice(0, 60)}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;

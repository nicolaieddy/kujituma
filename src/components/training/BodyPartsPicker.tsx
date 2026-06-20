import { useState } from "react";
import { Check, ChevronsUpDown, X, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BODY_PARTS,
  BODY_PART_BY_KEY,
  type BodyPartEntry,
  type BodySide,
} from "@/lib/bodyParts";
import { BodyMap } from "./BodyMap";
import { List as ListLucide } from "lucide-react";

interface Props {
  value: BodyPartEntry[];
  onChange: (next: BodyPartEntry[]) => void;
}

const SIDES: { value: BodySide; label: string }[] = [
  { value: "left", label: "L" },
  { value: "right", label: "R" },
  { value: "both", label: "Both" },
  { value: "na", label: "N/A" },
];

export function BodyPartsPicker({ value, onChange }: Props) {
  const [listOpen, setListOpen] = useState(false);

  const toggle = (key: string) => {
    const exists = value.find((v) => v.part === key);
    if (exists) {
      onChange(value.filter((v) => v.part !== key));
    } else {
      onChange([...value, { part: key, side: "na" }]);
    }
  };

  const update = (key: string, patch: Partial<BodyPartEntry>) => {
    onChange(value.map((v) => (v.part === key ? { ...v, ...patch } : v)));
  };

  const remove = (key: string) => onChange(value.filter((v) => v.part !== key));

  return (
    <div className="space-y-3">
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="map" className="gap-1.5">
            <Map className="h-3.5 w-3.5" /> Body map
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <ListLucide className="h-3.5 w-3.5" /> Search list
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-3">
          <BodyMap value={value} onChange={onChange} />
        </TabsContent>

        <TabsContent value="list" className="mt-3">
          <Popover open={listOpen} onOpenChange={setListOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                {value.length === 0
                  ? "Add a body part…"
                  : `${value.length} part${value.length > 1 ? "s" : ""} selected`}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[300]" align="start">
              <Command
                filter={(itemValue, search) => {
                  const def = BODY_PART_BY_KEY[itemValue];
                  if (!def) return 0;
                  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
                  const haystack = norm([def.label, def.region, def.key, ...def.aliases].join(" "));
                  const q = norm(search);
                  if (!q) return 1;
                  const tokens = q.split(" ").filter(Boolean);
                  return tokens.every((t) => haystack.includes(t)) ? 1 : 0;
                }}
              >
                <CommandInput placeholder="Search e.g. 'leg', 'achilles', 'back'…" />
                <CommandList>
                  <CommandEmpty>No matches.</CommandEmpty>
                  {(["Leg", "Back", "Upper body", "Head", "Other"] as const).map((region) => {
                    const items = BODY_PARTS.filter((p) => p.region === region);
                    return (
                      <CommandGroup key={region} heading={region}>
                        {items.map((p) => {
                          const selected = !!value.find((v) => v.part === p.key);
                          return (
                            <CommandItem
                              key={p.key}
                              value={p.key}
                              onSelect={() => toggle(p.key)}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center",
                                  selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40",
                                )}
                              >
                                {selected && <Check className="h-3 w-3" />}
                              </div>
                              <span>{p.label}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TabsContent>
      </Tabs>

      {value.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Selected ({value.length}) — adjust side and add specifics:
          </div>
          {value.map((entry) => {
            const def = BODY_PART_BY_KEY[entry.part];
            return (
              <div
                key={entry.part}
                className="rounded-md border bg-muted/30 p-2 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {def?.label ?? entry.part}
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => remove(entry.part)}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-md border bg-background p-0.5">
                    {SIDES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update(entry.part, { side: s.value })}
                        className={cn(
                          "px-2 py-0.5 text-[11px] rounded-sm transition-colors",
                          entry.side === s.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={entry.specific ?? ""}
                    onChange={(e) =>
                      update(entry.part, { specific: e.target.value })
                    }
                    placeholder="Optional specific area (e.g. medial, plantar fascia)"
                    maxLength={80}
                    className="flex-1 min-w-[180px] h-8 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

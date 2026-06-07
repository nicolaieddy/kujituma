import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComboboxFieldProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export const ComboboxField = ({ options, value, onChange, placeholder = "Select...", allowCreate = true }: ComboboxFieldProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const showCreate = search && !options.some((o) => o.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type new..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? "" : option);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                  {option}
                </CommandItem>
              ))}
              {allowCreate && showCreate && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="text-primary">+ Add "{search}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface MultiComboboxFieldProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
  triggerClassName?: string;
}

export const MultiComboboxField = ({ options, values, onChange, placeholder = "Select...", allowCreate = true, className, triggerClassName }: MultiComboboxFieldProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const showCreate = search && !options.some((o) => o.toLowerCase() === search.toLowerCase());

  const toggle = (item: string) => {
    if (values.includes(item)) {
      onChange(values.filter((v) => v !== item));
    } else {
      onChange([...values, item]);
    }
  };

  const remove = (item: string) => {
    onChange(values.filter((v) => v !== item));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", triggerClassName)}>
            {values.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="truncate">{values.length} selected</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search or type new..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggle(option)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", values.includes(option) ? "opacity-100" : "opacity-0")} />
                    {option}
                  </CommandItem>
                ))}
                {allowCreate && showCreate && (
                  <CommandItem
                    value={search}
                    onSelect={() => {
                      onChange([...values, search]);
                      setSearch("");
                    }}
                  >
                    <span className="text-primary">+ Add "{search}"</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
              <button type="button" className="ml-1 hover:text-destructive" onClick={() => remove(v)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

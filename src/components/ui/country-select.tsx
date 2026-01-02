import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Country, ICountry } from "country-state-city";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CountrySelectProps {
  value: string;
  onChange: (value: string, isoCode: string) => void;
  placeholder?: string;
}

export function CountrySelect({ value, onChange, placeholder = "Select country" }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  // Get all countries from the package
  const countries = React.useMemo(() => Country.getAllCountries(), []);

  // Find country by name to get its ISO code
  const selectedCountry = React.useMemo(() => {
    return countries.find((c) => c.name === value);
  }, [countries, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="flex items-center gap-2">
              {selectedCountry?.flag && <span>{selectedCountry.flag}</span>}
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange("", "");
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  Clear selection
                </CommandItem>
              )}
              {countries.map((country) => (
                <CommandItem
                  key={country.isoCode}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.name, country.isoCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{country.flag}</span>
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

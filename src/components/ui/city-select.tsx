import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { City, ICity } from "country-state-city";
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

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  countryCode: string;
  placeholder?: string;
}

export function CitySelect({ value, onChange, countryCode, placeholder = "Select city" }: CitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Get cities for the selected country
  const cities = React.useMemo(() => {
    if (!countryCode) return [];
    return City.getCitiesOfCountry(countryCode) || [];
  }, [countryCode]);

  // Filter cities based on search (limit to 100 for performance)
  const filteredCities = React.useMemo(() => {
    if (!search) return cities.slice(0, 100);
    const searchLower = search.toLowerCase();
    return cities
      .filter((city) => city.name.toLowerCase().includes(searchLower))
      .slice(0, 100);
  }, [cities, search]);

  const isDisabled = !countryCode;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn(
            "w-full justify-between font-normal",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isDisabled ? (
            <span className="text-muted-foreground">Select country first</span>
          ) : value ? (
            value
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search city..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {cities.length === 0 
                ? "No cities available for this country." 
                : "No city found."}
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-muted-foreground"
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  Clear selection
                </CommandItem>
              )}
              {filteredCities.map((city) => (
                <CommandItem
                  key={`${city.name}-${city.stateCode}`}
                  value={city.name}
                  onSelect={() => {
                    onChange(city.name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city.name}
                  {city.stateCode && (
                    <span className="ml-1 text-muted-foreground text-xs">
                      ({city.stateCode})
                    </span>
                  )}
                </CommandItem>
              ))}
              {cities.length > 100 && !search && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                  Type to search more cities...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

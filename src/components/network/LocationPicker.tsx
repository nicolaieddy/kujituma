import { useState, useEffect, useMemo, useCallback } from "react";
import { Country, State, City, ICountry, ICity } from "country-state-city";
import { Linkedin, X, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Country combobox                                                   */
/* ------------------------------------------------------------------ */

interface CountrySelectProps {
  value: string;
  onChange: (name: string, isoCode: string) => void;
}

const allCountries = Country.getAllCountries();

function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      allCountries.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate flex items-center gap-1.5">
              {allCountries.find((c) => c.name === value)?.flag}{" "}
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">Select country…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search country…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 80).map((c) => (
                <CommandItem
                  key={c.isoCode}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.name, c.isoCode);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{c.flag}</span>
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  City combobox                                                      */
/* ------------------------------------------------------------------ */

interface CitySelectProps {
  countryCode: string;
  value: string;
  onChange: (city: ICity) => void;
}

function CitySelect({ countryCode, value, onChange }: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const cities = useMemo(() => {
    if (!countryCode) return [];
    const states = State.getStatesOfCountry(countryCode);
    const all: ICity[] = [];
    for (const s of states) {
      all.push(...City.getCitiesOfState(countryCode, s.isoCode));
    }
    // Deduplicate by name
    const seen = new Set<string>();
    return all.filter((c) => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [countryCode]);

  const filtered = useMemo(
    () =>
      cities
        .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 100),
    [cities, search]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
          disabled={!countryCode}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">
              {countryCode ? "Select city…" : "Select a country first"}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search city…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={`${c.name}-${c.stateCode}`}
                  value={c.name}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {c.name}
                  {c.stateCode && (
                    <span className="ml-1 text-muted-foreground text-xs">
                      ({c.stateCode})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  LocationPicker (composed)                                          */
/* ------------------------------------------------------------------ */

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinates?: (lat: number, lng: number) => void;
  placeholder?: string;
  enrichedFrom?: string | null;
}

export const LocationPicker = ({
  value,
  onChange,
  onCoordinates,
  placeholder,
  enrichedFrom,
}: LocationPickerProps) => {
  // Parse existing "City, Country" value
  const parsed = useMemo(() => {
    if (!value) return { city: "", country: "" };
    const parts = value.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      return { city: parts[0], country: parts.slice(1).join(", ") };
    }
    // Could be just a country or just a city
    const match = allCountries.find(
      (c) => c.name.toLowerCase() === value.toLowerCase()
    );
    if (match) return { city: "", country: match.name };
    return { city: value, country: "" };
  }, [value]);

  const [selectedCountryName, setSelectedCountryName] = useState(parsed.country);
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    if (!parsed.country) return "";
    const match = allCountries.find(
      (c) => c.name.toLowerCase() === parsed.country.toLowerCase()
    );
    return match?.isoCode || "";
  });
  const [selectedCity, setSelectedCity] = useState(parsed.city);

  // Sync from external value changes (e.g. enrichment)
  useEffect(() => {
    setSelectedCountryName(parsed.country);
    setSelectedCity(parsed.city);
    const match = allCountries.find(
      (c) => c.name.toLowerCase() === parsed.country.toLowerCase()
    );
    setSelectedCountryCode(match?.isoCode || "");
  }, [parsed.country, parsed.city]);

  const handleCountryChange = useCallback(
    (name: string, isoCode: string) => {
      setSelectedCountryName(name);
      setSelectedCountryCode(isoCode);
      setSelectedCity(""); // clear city when country changes
      onChange(name); // set value to just country until city is picked
    },
    [onChange]
  );

  const handleCityChange = useCallback(
    (city: ICity) => {
      setSelectedCity(city.name);
      const locationStr = `${city.name}, ${selectedCountryName}`;
      onChange(locationStr);
      if (onCoordinates && city.latitude && city.longitude) {
        onCoordinates(parseFloat(city.latitude), parseFloat(city.longitude));
      }
    },
    [selectedCountryName, onChange, onCoordinates]
  );

  const handleClear = useCallback(() => {
    setSelectedCountryName("");
    setSelectedCountryCode("");
    setSelectedCity("");
    onChange("");
  }, [onChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <CountrySelect
            value={selectedCountryName}
            onChange={handleCountryChange}
          />
        </div>
        {(selectedCountryName || selectedCity) && (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {selectedCountryCode && (
        <CitySelect
          countryCode={selectedCountryCode}
          value={selectedCity}
          onChange={handleCityChange}
        />
      )}
      {enrichedFrom && (
        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
          <Linkedin className="h-3 w-3" />
          From {enrichedFrom}
        </Badge>
      )}
    </div>
  );
};

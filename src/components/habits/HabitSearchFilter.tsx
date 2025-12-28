import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RecurrenceFrequency } from "@/types/goals";

export interface HabitFilters {
  search: string;
  frequencies: RecurrenceFrequency[];
  categories: string[];
  showPausedOnly: boolean;
  showActiveOnly: boolean;
}

interface HabitSearchFilterProps {
  filters: HabitFilters;
  onFiltersChange: (filters: HabitFilters) => void;
  availableCategories: string[];
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'monthly_last_week', label: 'Monthly (last week)' },
  { value: 'quarterly', label: 'Quarterly' },
];

export const HabitSearchFilter = ({
  filters,
  onFiltersChange,
  availableCategories
}: HabitSearchFilterProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = 
    filters.frequencies.length + 
    filters.categories.length + 
    (filters.showPausedOnly ? 1 : 0) +
    (filters.showActiveOnly ? 1 : 0);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const toggleFrequency = (frequency: RecurrenceFrequency) => {
    const newFrequencies = filters.frequencies.includes(frequency)
      ? filters.frequencies.filter(f => f !== frequency)
      : [...filters.frequencies, frequency];
    onFiltersChange({ ...filters, frequencies: newFrequencies });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const togglePausedOnly = () => {
    onFiltersChange({ 
      ...filters, 
      showPausedOnly: !filters.showPausedOnly,
      showActiveOnly: false // Mutually exclusive
    });
  };

  const toggleActiveOnly = () => {
    onFiltersChange({ 
      ...filters, 
      showActiveOnly: !filters.showActiveOnly,
      showPausedOnly: false // Mutually exclusive
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      frequencies: [],
      categories: [],
      showPausedOnly: false,
      showActiveOnly: false
    });
  };

  const hasActiveFilters = filters.search || activeFilterCount > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search habits..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Button */}
      <div className="flex gap-2">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      frequencies: [], 
                      categories: [], 
                      showPausedOnly: false,
                      showActiveOnly: false 
                    })}
                    className="text-xs h-7"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Status</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.showActiveOnly}
                    onCheckedChange={toggleActiveOnly}
                  />
                  <span className="text-sm text-foreground">Active habits only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.showPausedOnly}
                    onCheckedChange={togglePausedOnly}
                  />
                  <span className="text-sm text-foreground">Paused habits only</span>
                </label>
              </div>

              <Separator />

              {/* Frequency Filter */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Frequency</Label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.frequencies.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFrequency(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableCategories.map((category) => (
                        <Badge
                          key={category}
                          variant={filters.categories.includes(category) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

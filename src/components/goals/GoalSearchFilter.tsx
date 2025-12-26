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
import { GoalStatus, GoalTimeframe } from "@/types/goals";

export interface GoalFilters {
  search: string;
  statuses: GoalStatus[];
  categories: string[];
  timeframes: GoalTimeframe[];
}

interface GoalSearchFilterProps {
  filters: GoalFilters;
  onFiltersChange: (filters: GoalFilters) => void;
  availableCategories: string[];
}

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deprioritized', label: 'Deprioritized' },
];

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: '1 Month', label: '1 Month' },
  { value: '3 Months', label: '3 Months' },
  { value: 'Quarter', label: 'Quarter' },
  { value: '6 Months', label: '6 Months' },
  { value: 'End of Year', label: 'End of Year' },
  { value: 'Custom Date', label: 'Custom Date' },
];

export const GoalSearchFilter = ({
  filters,
  onFiltersChange,
  availableCategories
}: GoalSearchFilterProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = 
    filters.statuses.length + 
    filters.categories.length + 
    filters.timeframes.length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const toggleStatus = (status: GoalStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleTimeframe = (timeframe: GoalTimeframe) => {
    const newTimeframes = filters.timeframes.includes(timeframe)
      ? filters.timeframes.filter(t => t !== timeframe)
      : [...filters.timeframes, timeframe];
    onFiltersChange({ ...filters, timeframes: newTimeframes });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      statuses: [],
      categories: [],
      timeframes: []
    });
  };

  const hasActiveFilters = filters.search || activeFilterCount > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search goals..."
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
                    onClick={() => onFiltersChange({ ...filters, statuses: [], categories: [], timeframes: [] })}
                    className="text-xs h-7"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.statuses.includes(option.value)}
                        onCheckedChange={() => toggleStatus(option.value)}
                      />
                      <span className="text-sm text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <>
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
                  <Separator />
                </>
              )}

              {/* Timeframe Filter */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Timeframe</Label>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.timeframes.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTimeframe(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
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

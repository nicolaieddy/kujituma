
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import FilterDropdown, { FilterPeriod } from "@/components/FilterDropdown";

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterPeriod: FilterPeriod;
  onFilterChange: (period: FilterPeriod) => void;
  showFilters: boolean;
}

export const SearchAndFilter = ({
  searchQuery,
  onSearchChange,
  filterPeriod,
  onFilterChange,
  showFilters
}: SearchAndFilterProps) => {
  if (!showFilters) return null;

  return (
    <div className="mb-6 space-y-4">
      <FilterDropdown
        selectedPeriod={filterPeriod}
        onPeriodChange={onFilterChange}
      />
      <div className="max-w-md mx-auto px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
      </div>
    </div>
  );
};

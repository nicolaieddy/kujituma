
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronDown } from "lucide-react";

export type FilterPeriod = "1day" | "3days" | "7days" | "14days" | "30days" | "all";

interface FilterDropdownProps {
  selectedPeriod: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
}

const FilterDropdown = ({ selectedPeriod, onPeriodChange }: FilterDropdownProps) => {
  const getFilterLabel = (period: FilterPeriod) => {
    const labels: Record<FilterPeriod, string> = {
      "1day": "Last 24 hours",
      "3days": "Last 3 days", 
      "7days": "Last 7 days",
      "14days": "Last 14 days",
      "30days": "Last 30 days",
      "all": "All time"
    };
    return labels[period] || "Last 14 days";
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center space-x-2 bg-accent rounded-lg px-4 py-2 text-muted-foreground text-sm">
        <Calendar className="h-4 w-4" />
        <span>Showing posts from</span>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent text-foreground hover:text-foreground/80 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">
              Last 24 hours
            </SelectItem>
            <SelectItem value="3days">Last 3 days</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="14days">Last 14 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterDropdown;

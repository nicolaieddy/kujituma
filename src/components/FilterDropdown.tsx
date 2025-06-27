
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
    switch (period) {
      case "1day":
        return "Last 24 hours";
      case "3days":
        return "Last 3 days";
      case "7days":
        return "Last 7 days";
      case "14days":
        return "Last 14 days";
      case "30days":
        return "Last 30 days";
      case "all":
        return "All time";
      default:
        return "Last 14 days";
    }
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 text-white/80 text-sm">
        <Calendar className="h-4 w-4" />
        <span>Showing posts from</span>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent text-white hover:text-white/90 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="1day" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              Last 24 hours
            </SelectItem>
            <SelectItem value="3days" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              Last 3 days
            </SelectItem>
            <SelectItem value="7days" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              Last 7 days
            </SelectItem>
            <SelectItem value="14days" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              Last 14 days
            </SelectItem>
            <SelectItem value="30days" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              Last 30 days
            </SelectItem>
            <SelectItem value="all" className="text-white hover:bg-slate-700 focus:bg-slate-700">
              All time
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterDropdown;

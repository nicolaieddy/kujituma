import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PLACEHOLDER_YEAR = 1904;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

interface BirthdayInputProps {
  value: string; // ISO date string or ""
  onChange: (value: string) => void;
  className?: string;
}

export function parseBirthday(dateStr: string) {
  if (!dateStr) return { month: 0, day: 0, year: 0, yearUnknown: false };
  const [y, m, d] = dateStr.split("-").map(Number);
  return { month: m, day: d, year: y, yearUnknown: y === PLACEHOLDER_YEAR };
}

export function formatBirthdayDisplay(dateStr: string | null): string {
  if (!dateStr) return "";
  const { month, day, year, yearUnknown } = parseBirthday(dateStr);
  if (!month || !day) return "";
  const monthName = MONTHS[month - 1];
  return yearUnknown ? `${monthName} ${day}` : `${monthName} ${day}, ${year}`;
}

export default function BirthdayInput({ value, onChange, className }: BirthdayInputProps) {
  const parsed = parseBirthday(value);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);
  const [year, setYear] = useState(parsed.yearUnknown ? "" : parsed.year ? String(parsed.year) : "");
  const [yearUnknown, setYearUnknown] = useState(parsed.yearUnknown);

  useEffect(() => {
    const p = parseBirthday(value);
    setMonth(p.month);
    setDay(p.day);
    setYear(p.yearUnknown ? "" : p.year ? String(p.year) : "");
    setYearUnknown(p.yearUnknown);
  }, [value]);

  const emitChange = (m: number, d: number, y: string, noYear: boolean) => {
    if (!m || !d) {
      onChange("");
      return;
    }
    const effectiveYear = noYear ? PLACEHOLDER_YEAR : parseInt(y) || 0;
    if (!effectiveYear) {
      onChange("");
      return;
    }
    // Clamp day to valid range
    const maxDay = daysInMonth(m, effectiveYear);
    const clampedDay = Math.min(d, maxDay);
    const iso = `${String(effectiveYear).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    onChange(iso);
  };

  const maxDay = month ? daysInMonth(month, yearUnknown ? PLACEHOLDER_YEAR : parseInt(year) || 2000) : 31;

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Select
          value={month ? String(month) : "none"}
          onValueChange={(v) => {
            const m = v === "none" ? 0 : Number(v);
            setMonth(m);
            emitChange(m, day, year, yearUnknown);
          }}
        >
          <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Month</SelectItem>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={day ? String(day) : "none"}
          onValueChange={(v) => {
            const d = v === "none" ? 0 : Number(v);
            setDay(d);
            emitChange(month, d, year, yearUnknown);
          }}
        >
          <SelectTrigger className="h-8 w-20"><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Day</SelectItem>
            {Array.from({ length: maxDay }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!yearUnknown && (
          <Input
            type="number"
            placeholder="Year"
            className="h-8 w-20"
            min={1900}
            max={new Date().getFullYear()}
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              emitChange(month, day, e.target.value, false);
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <Checkbox
          id="year-unknown"
          checked={yearUnknown}
          onCheckedChange={(checked) => {
            const noYear = !!checked;
            setYearUnknown(noYear);
            if (noYear) {
              setYear("");
              emitChange(month, day, "", true);
            } else {
              emitChange(month, day, year, false);
            }
          }}
        />
        <Label htmlFor="year-unknown" className="text-xs text-muted-foreground cursor-pointer">Year unknown</Label>
      </div>
    </div>
  );
}

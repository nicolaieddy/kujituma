import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useGoalObjectives } from "@/hooks/useGoalObjectives";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CheckCircle, Plus, X, ChevronDown, History, CalendarClock, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface GoalDetailObjectivesSectionProps {
  goalId: string;
  goalStartDate?: string | null;
}

export const GoalDetailObjectivesSection = ({
  goalId,
  goalStartDate,
}: GoalDetailObjectivesSectionProps) => {
  const {
    objectives,
    isLoading,
    createObjective,
    updateObjective,
    deleteObjective,
    earliestObjectiveDate,
    needsStartDateExpansion,
    expandGoalStartDate,
  } = useGoalObjectives(goalId, goalStartDate);

  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [newObjectiveWeek, setNewObjectiveWeek] = useState<string>(WeeklyProgressService.getWeekStart());
  
  // Objective editing state
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingObjectiveText, setEditingObjectiveText] = useState("");
  const [editingObjectiveWeek, setEditingObjectiveWeek] = useState("");
  
  // Collapsible state
  const [isPastOpen, setIsPastOpen] = useState(false);
  const [isPlannedOpen, setIsPlannedOpen] = useState(false);

  // Auto-expand goal start date on mount if needed
  useEffect(() => {
    if (needsStartDateExpansion) {
      expandGoalStartDate();
    }
  }, [needsStartDateExpansion, expandGoalStartDate]);

  const currentWeekStart = WeeklyProgressService.getWeekStart();
  
  // Group objectives: current week, planned (future), and past
  const currentWeekObjectives = objectives
    .filter(obj => obj.week_start === currentWeekStart)
    .sort((a, b) => a.text.localeCompare(b.text));
  
  const plannedObjectives = objectives
    .filter(obj => obj.week_start > currentWeekStart)
    .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime());
  
  const pastObjectives = objectives
    .filter(obj => obj.week_start < currentWeekStart)
    .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());

  // Week options - include historical weeks based on earliest objective
  const generateWeekOptions = () => {
    const weeks = [];
    const currentDate = new Date();
    
    // Calculate how many past weeks to show
    let pastWeeksToShow = 4;
    if (earliestObjectiveDate) {
      const earliestDate = new Date(earliestObjectiveDate);
      const diffWeeks = Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      pastWeeksToShow = Math.max(4, diffWeeks + 2);
    }
    
    for (let i = pastWeeksToShow; i >= 1; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    for (let i = 0; i <= 8; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    return weeks;
  };
  const weekOptions = generateWeekOptions();
  
  const getWeekNumber = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (startDate.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const formatWeekRange = (weekStart: string) => WeeklyProgressService.formatWeekRange(weekStart);

  const handleAddObjective = () => {
    if (!newObjectiveText.trim()) return;
    createObjective(goalId, newObjectiveText.trim(), newObjectiveWeek);
    setNewObjectiveText("");
    setNewObjectiveWeek(WeeklyProgressService.getWeekStart());
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleStartEditObjective = (objective: any) => {
    setEditingObjectiveId(objective.id);
    setEditingObjectiveText(objective.text);
    setEditingObjectiveWeek(objective.week_start);
  };

  const handleSaveEditObjective = () => {
    if (!editingObjectiveId || !editingObjectiveText.trim()) return;
    updateObjective(editingObjectiveId, { 
      text: editingObjectiveText.trim(),
      week_start: editingObjectiveWeek
    });
    setEditingObjectiveId(null);
    setEditingObjectiveText("");
    setEditingObjectiveWeek("");
  };

  const handleCancelEditObjective = () => {
    setEditingObjectiveId(null);
    setEditingObjectiveText("");
    setEditingObjectiveWeek("");
  };

  // Render a single objective item
  const renderObjectiveItem = (objective: any, isCurrent: boolean) => {
    const isEditingThis = editingObjectiveId === objective.id;
    
    if (isEditingThis) {
      return (
        <div key={objective.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-primary/30">
          <Input
            value={editingObjectiveText}
            onChange={(e) => setEditingObjectiveText(e.target.value)}
            className="flex-1 h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSaveEditObjective(); }
              if (e.key === 'Escape') handleCancelEditObjective();
            }}
          />
          <Select value={editingObjectiveWeek} onValueChange={setEditingObjectiveWeek}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue>W{getWeekNumber(editingObjectiveWeek)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((week) => (
                <SelectItem key={week} value={week}>
                  W{getWeekNumber(week)} • {formatWeekRange(week)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={handleSaveEditObjective} className="h-8 px-2">
            <CheckCircle className="h-4 w-4 text-primary" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEditObjective} className="h-8 px-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    
    return (
      <div
        key={objective.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg group transition-colors cursor-pointer",
          isCurrent ? "bg-muted/30 hover:bg-muted/40" : "bg-muted/10 hover:bg-muted/20",
          objective.is_completed && "opacity-60"
        )}
        onClick={() => handleStartEditObjective(objective)}
      >
        <Checkbox
          checked={objective.is_completed}
          onCheckedChange={() => handleToggleObjective(objective.id, objective.is_completed)}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", objective.is_completed && "line-through text-muted-foreground")}>
            {objective.text}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isCurrent ? "outline" : "secondary"} className="text-xs">
            W{getWeekNumber(objective.week_start)}
          </Badge>
          {objective.is_completed && (
            <CheckCircle className="h-4 w-4 text-primary" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); deleteObjective(objective.id); }}
            className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Calculate date range info
  const getDateRangeInfo = () => {
    if (objectives.length === 0) return null;
    
    const sortedByDate = [...objectives].sort((a, b) => 
      new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
    );
    const earliest = sortedByDate[0].week_start;
    const latest = sortedByDate[sortedByDate.length - 1].week_start;
    
    return {
      earliest: format(parseISO(earliest), 'MMM d, yyyy'),
      latest: format(parseISO(latest), 'MMM d, yyyy'),
      totalCount: objectives.length,
      completedCount: objectives.filter(o => o.is_completed).length,
    };
  };

  const dateRangeInfo = getDateRangeInfo();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-foreground">Objectives</h3>
        <span className="text-xs text-muted-foreground ml-auto">One-time tasks</span>
      </div>

      {/* Date range info */}
      {dateRangeInfo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <History className="h-3.5 w-3.5" />
          <span>
            {dateRangeInfo.completedCount}/{dateRangeInfo.totalCount} completed
            {pastObjectives.length > 0 && (
              <> • History from {dateRangeInfo.earliest}</>
            )}
          </span>
        </div>
      )}

      {/* Current Week Objectives */}
      {currentWeekObjectives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">This Week</p>
          {currentWeekObjectives.map((objective) => renderObjectiveItem(objective, true))}
        </div>
      )}

      {objectives.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">No objectives yet. Add tasks scheduled for specific weeks.</p>
      )}

      {/* Planned (Future) Objectives - Collapsible */}
      {plannedObjectives.length > 0 && (
        <Collapsible open={isPlannedOpen} onOpenChange={setIsPlannedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/30 rounded-lg px-2 transition-colors">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Planned</span>
            <Badge variant="secondary" className="text-xs ml-1">{plannedObjectives.length}</Badge>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform", isPlannedOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {plannedObjectives.map((objective) => renderObjectiveItem(objective, true))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Past Objectives - Collapsible */}
      {pastObjectives.length > 0 && (
        <Collapsible open={isPastOpen} onOpenChange={setIsPastOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/30 rounded-lg px-2 transition-colors">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Past</span>
            <Badge variant="secondary" className="text-xs ml-1">{pastObjectives.length}</Badge>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform", isPastOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {pastObjectives.map((objective) => renderObjectiveItem(objective, false))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add objective inline */}
      <div className="flex items-center gap-2 pt-2">
        <Input
          value={newObjectiveText}
          onChange={(e) => setNewObjectiveText(e.target.value)}
          placeholder="Add an objective..."
          className="flex-1 h-9"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddObjective(); } }}
        />
        <Select value={newObjectiveWeek} onValueChange={setNewObjectiveWeek}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue>W{getWeekNumber(newObjectiveWeek)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {weekOptions.map((week) => (
              <SelectItem key={week} value={week}>
                W{getWeekNumber(week)} • {formatWeekRange(week)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAddObjective} disabled={!newObjectiveText.trim()} className="h-9 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Plus, CheckCircle2, Clock, Trash2, Calendar, Edit3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GoalObjectivesListProps {
  goal: Goal;
  objectives: WeeklyObjective[];
  onCreateObjective: (goalId: string, text: string, weekStart?: string) => void;
  onUpdateObjective: (id: string, updates: any) => void;
  onDeleteObjective: (id: string) => void;
}

export const GoalObjectivesList = ({
  goal,
  objectives,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
}: GoalObjectivesListProps) => {
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [newObjectiveWeek, setNewObjectiveWeek] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  const [isCreating, setIsCreating] = useState(false);

  // Generate week options (current week + 12 weeks forward and backward)
  const generateWeekOptions = () => {
    const weeks = [];
    const currentDate = new Date();
    
    // Add past weeks (12 weeks back)
    for (let i = 12; i >= 1; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    
    // Add current week and future weeks (12 weeks forward)
    for (let i = 0; i <= 12; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    
    return weeks;
  };

  const weekOptions = generateWeekOptions();

  // Sort objectives by creation date (newest first)
  const sortedObjectives = [...objectives].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleCreateObjective = async () => {
    if (!newObjectiveText.trim()) return;

    setIsCreating(true);
    try {
      onCreateObjective(goal.id, newObjectiveText.trim(), newObjectiveWeek);
      setNewObjectiveText("");
      setNewObjectiveWeek(WeeklyProgressService.getWeekStart());
      toast({
        title: "Success",
        description: "Weekly objective created successfully!",
      });
    } catch (error) {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = (objective: WeeklyObjective) => {
    onUpdateObjective(objective.id, {
      is_completed: !objective.is_completed
    });
  };

  const handleWeekChange = (objectiveId: string, newWeekStart: string) => {
    onUpdateObjective(objectiveId, {
      week_start: newWeekStart
    });
  };

  const formatWeekRange = (weekStart: string) => {
    return WeeklyProgressService.formatWeekRange(weekStart);
  };

  const getWeekNumber = (weekStart: string) => {
    const [y, m, d] = weekStart.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (startDate.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  return (
    <div className="space-y-6">
      {/* Create new objective */}
      <Card className="glass-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Add Weekly Objective</CardTitle>
          <p className="text-muted-foreground text-sm">
            Create a new objective and assign it to a specific week
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                value={newObjectiveText}
                onChange={(e) => setNewObjectiveText(e.target.value)}
                placeholder="What do you want to achieve?"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateObjective();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={newObjectiveWeek} onValueChange={setNewObjectiveWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((week) => (
                    <SelectItem key={week} value={week}>
                      Week {getWeekNumber(week)} • {formatWeekRange(week)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateObjective}
                disabled={!newObjectiveText.trim() || isCreating}
                className="gradient-primary"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives grid */}
      {sortedObjectives.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No weekly objectives created for this goal yet.
            </p>
            <p className="text-muted-foreground/60 text-sm mt-2">
              Create your first objective above to start working towards this goal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Weekly Objectives</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm">
              {sortedObjectives.filter(obj => obj.is_completed).length} of {sortedObjectives.length} completed
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pb-3 border-b">
                <div className="md:col-span-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Objective
                </div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Week
                </div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </div>
              </div>
              
              {/* Objectives */}
              {sortedObjectives.map((objective) => (
                <div
                  key={objective.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center"
                >
                  {/* Objective column */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <Checkbox
                      checked={objective.is_completed}
                      onCheckedChange={() => handleToggleComplete(objective)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1">
                      <p className={`text-foreground ${objective.is_completed ? 'line-through opacity-70' : ''}`}>
                        {objective.text}
                      </p>
                      {objective.is_completed && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Week column */}
                  <div>
                    <Select 
                      value={objective.week_start} 
                      onValueChange={(value) => handleWeekChange(objective.id, value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">Week {getWeekNumber(objective.week_start)}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatWeekRange(objective.week_start)}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map((week) => (
                          <SelectItem key={week} value={week}>
                            Week {getWeekNumber(week)} • {formatWeekRange(week)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Actions column */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteObjective(objective.id)}
                      className="text-destructive hover:bg-destructive/20 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
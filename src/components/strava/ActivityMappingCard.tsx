import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivityMappings, STRAVA_ACTIVITY_TYPES, ActivityMapping } from "@/hooks/useActivityMappings";
import { useGoals } from "@/hooks/useGoals";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react";

interface HabitItem {
  id: string;
  text: string;
  frequency: string;
}

export function ActivityMappingCard() {
  const { mappings, isLoading, createMapping, deleteMapping } = useActivityMappings();
  const { goals, isLoading: goalsLoading } = useGoals();
  
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedHabitItemId, setSelectedHabitItemId] = useState<string>("");
  const [minDuration, setMinDuration] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  // Get goals with habit items
  const goalsWithHabits = goals.filter(g => {
    const habitItems = (g.habit_items as HabitItem[] | null) || [];
    return habitItems.length > 0;
  });

  // Get habit items for selected goal
  const selectedGoal = goalsWithHabits.find(g => g.id === selectedGoalId);
  const habitItems: HabitItem[] = selectedGoal ? ((selectedGoal.habit_items as HabitItem[] | null) || []) : [];

  const handleAdd = async () => {
    if (!selectedActivityType || !selectedGoalId || !selectedHabitItemId) return;
    
    setIsAdding(true);
    await createMapping(selectedActivityType, selectedGoalId, selectedHabitItemId, minDuration);
    
    // Reset form
    setSelectedActivityType("");
    setSelectedGoalId("");
    setSelectedHabitItemId("");
    setMinDuration(0);
    setIsAdding(false);
  };

  const getGoalTitle = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || "Unknown Goal";
  };

  const getHabitItemText = (goalId: string, habitItemId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return "Unknown Habit";
    const items = (goal.habit_items as HabitItem[] | null) || [];
    const item = items.find(h => h.id === habitItemId);
    return item?.text || "Unknown Habit";
  };

  if (isLoading || goalsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Activity Mappings
        </CardTitle>
        <CardDescription>
          Map Strava activities to your habits for automatic tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing mappings */}
        {mappings.length > 0 && (
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div 
                key={mapping.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {STRAVA_ACTIVITY_TYPES.find(t => t.value === mapping.strava_activity_type)?.label || mapping.strava_activity_type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {getHabitItemText(mapping.goal_id, mapping.habit_item_id)}
                    {mapping.min_duration_minutes > 0 && ` (min ${mapping.min_duration_minutes}min)`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMapping(mapping.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new mapping */}
        {goalsWithHabits.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>No habits found. Create a goal with habits first to map Strava activities.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-medium">Add New Mapping</Label>
            
            <div className="grid gap-3">
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Strava activity type" />
                </SelectTrigger>
                <SelectContent>
                  {STRAVA_ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedGoalId} 
                onValueChange={(value) => {
                  setSelectedGoalId(value);
                  setSelectedHabitItemId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {goalsWithHabits.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedGoalId && habitItems.length > 0 && (
                <Select value={selectedHabitItemId} onValueChange={setSelectedHabitItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select habit" />
                  </SelectTrigger>
                  <SelectContent>
                    {habitItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.text}
                      </SelectItem>
                    ))
                  }</SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <Label htmlFor="minDuration" className="text-xs text-muted-foreground whitespace-nowrap">
                  Min duration:
                </Label>
                <Input
                  id="minDuration"
                  type="number"
                  min={0}
                  value={minDuration}
                  onChange={(e) => setMinDuration(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>

              <Button
                onClick={handleAdd}
                disabled={!selectedActivityType || !selectedGoalId || !selectedHabitItemId || isAdding}
                className="w-full"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Mapping
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { PreviousWeekSummary } from "@/components/goals/PreviousWeekSummary";

interface WeeklyProgressFormProps {
  onCancel: () => void;
}

const WeeklyProgressForm = ({ onCancel }: WeeklyProgressFormProps) => {
  const { user } = useAuth();
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(WeeklyProgressService.getWeekStart());
  const [newObjective, setNewObjective] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    weekRange,
    isCreating,
    isUpdating,
    isSavingNotes,
  } = useWeeklyProgress(selectedWeekStart);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation (form):', selectedWeekStart, '->', newWeekStart);
    setSelectedWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation (form):', selectedWeekStart, '->', newWeekStart);
    setSelectedWeekStart(newWeekStart);
  };

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      createObjective({
        text: newObjective.trim(),
        week_start: selectedWeekStart,
      });
      setNewObjective("");
    }
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    updateObjective(id, { text });
  };

  const handleDeleteObjective = (id: string) => {
    deleteObjective(id);
  };

  const handleSaveNotes = () => {
    updateProgressNotes(progressNotes);
  };

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousWeek}
            className="text-white/60 hover:text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <CardTitle className="text-white text-2xl">Weekly Progress</CardTitle>
            <div className="flex items-center justify-center gap-2 text-white/80 mt-2">
              <Calendar className="h-4 w-4" />
              <span>{weekRange}</span>
            </div>
            {totalCount > 0 && (
              <div className="mt-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-full h-2 w-full max-w-xs mx-auto">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-white/60 text-sm mt-1">
                  {completedCount} of {totalCount} objectives completed ({completionPercentage}%)
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextWeek}
            className="text-white/60 hover:text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <PreviousWeekSummary currentWeekStart={selectedWeekStart} />

        {/* Weekly Objectives Section */}
        <div>
          <Label className="text-white font-medium text-lg">
            🎯 This Week's Objectives
          </Label>
          <div className="mt-3 space-y-3">
            {objectives.map((objective) => (
              <div key={objective.id} className="flex items-center gap-3 group">
                <Checkbox
                  checked={objective.is_completed}
                  onCheckedChange={() => handleToggleObjective(objective.id, objective.is_completed)}
                  className="border-white/40 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <Input
                  value={objective.text}
                  onChange={(e) => handleUpdateObjectiveText(objective.id, e.target.value)}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  placeholder="Enter an objective..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteObjective(objective.id)}
                  className="text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Add new objective */}
            <div className="flex items-center gap-3">
              <Checkbox 
                disabled 
                className="border-white/40 opacity-50"
              />
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Add a new objective..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddObjective}
                disabled={!newObjective.trim() || isCreating}
                className="text-white/60 hover:text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Notes Section */}
        <div>
          <Label className="text-white font-medium text-lg">
            📝 Progress Notes & Reflections
          </Label>
          <p className="text-white/60 text-sm mt-1 mb-3">
            What did you accomplish? Any blockers or areas where you need help?
          </p>
          <Textarea
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px]"
            placeholder="Share your progress, accomplishments, challenges, and any help you need..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex-1"
          >
            {isSavingNotes ? "Saving..." : "Save Progress"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-white/20 text-black hover:bg-white/10 bg-white"
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyProgressForm;

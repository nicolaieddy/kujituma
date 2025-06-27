
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Calendar, ChevronLeft, ChevronRight, CheckCircle, Edit } from "lucide-react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { PreviousWeekSummary } from "./PreviousWeekSummary";

export const WeeklyProgressView = () => {
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
    completeWeek,
    uncompleteWeek,
    weekRange,
    weekNumber,
    isCreating,
    isUpdating,
    isSavingNotes,
    isCompletingWeek,
    isUncompletingWeek,
  } = useWeeklyProgress(selectedWeekStart);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation:', selectedWeekStart, '->', newWeekStart);
    setSelectedWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation:', selectedWeekStart, '->', newWeekStart);
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

  const handleCompleteWeek = () => {
    completeWeek();
  };

  const handleEditWeek = () => {
    uncompleteWeek();
  };

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

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
            {isWeekCompleted && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Week {weekNumber} Completed</span>
              </div>
            )}
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
                  disabled={isWeekCompleted}
                  className="border-white/40 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <Input
                  value={objective.text}
                  onChange={(e) => handleUpdateObjectiveText(objective.id, e.target.value)}
                  disabled={isWeekCompleted}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 disabled:opacity-50"
                  placeholder="Enter an objective..."
                />
                {!isWeekCompleted && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteObjective(objective.id)}
                    className="text-white/60 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Add new objective - only show if week is not completed */}
            {!isWeekCompleted && (
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
            )}
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
            disabled={isWeekCompleted}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px] disabled:opacity-50"
            placeholder="Share your progress, accomplishments, challenges, and any help you need..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          {isWeekCompleted ? (
            <Button
              onClick={handleEditWeek}
              disabled={isUncompletingWeek}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
            >
              <Edit className="h-4 w-4 mr-2" />
              {isUncompletingWeek ? "Reopening..." : "Edit Week"}
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent px-6"
              >
                {isSavingNotes ? "Saving..." : "Save Progress"}
              </Button>
              <Button
                onClick={handleCompleteWeek}
                disabled={isCompletingWeek}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCompletingWeek ? "Completing..." : `Complete Week ${weekNumber}`}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

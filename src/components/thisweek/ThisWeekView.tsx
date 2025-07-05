import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckCircle, Calendar } from "lucide-react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { unifiedPostsService } from "@/services/unifiedPostsService";
import { useQueryClient } from "@tanstack/react-query";

export const ThisWeekView = () => {
  const { user } = useAuth();
  const { goals } = useGoals();
  const queryClient = useQueryClient();
  const [newObjective, setNewObjective] = useState("");
  const [weeklyReflection, setWeeklyReflection] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  
  const {
    objectives,
    progressPost,
    feedPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    weekRange,
    weekNumber,
    weekStart,
  } = useWeeklyProgress();

  // Initialize reflection from progress post
  useEffect(() => {
    setWeeklyReflection(progressPost?.notes || "");
  }, [progressPost]);

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    createObjective({
      text: newObjective.trim(),
      week_start: weekStart,
    });
    setNewObjective("");
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleDeleteObjective = (id: string) => {
    deleteObjective(id);
  };

  const handleSaveReflection = () => {
    updateProgressNotes(weeklyReflection);
  };

  const handleShareWeek = async () => {
    if (!user) return;
    
    setIsSharing(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const completedObjectives = objectives?.filter(obj => obj.is_completed) || [];
      const pendingObjectives = objectives?.filter(obj => !obj.is_completed) || [];
      
      let accomplishments = '';
      
      if (completedObjectives.length > 0 || pendingObjectives.length > 0) {
        accomplishments += '🎯 This Week\'s Progress:\n\n';
        
        if (completedObjectives.length > 0) {
          accomplishments += '✅ Completed:\n';
          accomplishments += completedObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
        
        if (pendingObjectives.length > 0) {
          accomplishments += '🔄 In Progress:\n';
          accomplishments += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
      }
      
      if (weeklyReflection.trim()) {
        accomplishments += '💭 Weekly Reflection:\n';
        accomplishments += weeklyReflection;
        accomplishments += '\n\n';
      }

      if (!accomplishments.trim()) {
        accomplishments = 'Focused on personal growth this week.';
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completedCount = completedObjectives.length;
      const totalCount = objectives?.length || 0;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Create the feed post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          name: profile?.full_name || 'Anonymous',
          accomplishments: accomplishments,
          priorities: '',
          help: '',
          week_start: weekStart,
          week_end: weekEnd.toISOString().split('T')[0],
          objectives_completed: completedCount,
          total_objectives: totalCount,
          completion_percentage: completionPercentage,
        });

      if (error) {
        console.error('Error sharing week:', error);
        toast({
          title: "Error",
          description: "Failed to share your week. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your weekly progress has been shared with the community!",
        });
        // Mark week as completed
        await supabase
          .from('weekly_progress_posts')
          .upsert({
            user_id: user.id,
            week_start: weekStart,
            notes: weeklyReflection,
            is_completed: true,
            completed_at: new Date().toISOString(),
          });
        
        queryClient.invalidateQueries({ queryKey: ['week-feed-post'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      }
    } catch (error) {
      console.error('Error sharing week:', error);
      toast({
        title: "Error",
        description: "Failed to share your week. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;
  const hasShared = !!feedPost;

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">
                Week {weekNumber}
              </CardTitle>
              <p className="text-white/60 mt-1">{weekRange}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-white/60" />
              {totalCount > 0 && (
                <div className="text-white/80 text-sm">
                  {completedCount}/{totalCount} completed
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Objectives */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">This Week's Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Objective */}
          {!hasShared && (
            <div className="flex space-x-2">
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="What do you want to accomplish this week?"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
              />
              <Button
                onClick={handleAddObjective}
                disabled={!newObjective.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Objectives List */}
          <div className="space-y-3">
            {objectives?.map((objective) => (
              <div key={objective.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <Checkbox
                  checked={objective.is_completed}
                  onCheckedChange={() => handleToggleObjective(objective.id, objective.is_completed)}
                  disabled={hasShared}
                  className="border-white/20"
                />
                <span className={`flex-1 text-white ${objective.is_completed ? 'line-through opacity-60' : ''}`}>
                  {objective.text}
                </span>
                {objective.is_completed && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
                {!hasShared && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteObjective(objective.id)}
                    className="text-white/60 hover:text-white hover:bg-white/20 px-2"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          {objectives?.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <p>No objectives set for this week yet.</p>
              <p className="text-sm mt-1">Add your first objective above to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Reflection */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Weekly Reflection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={weeklyReflection}
            onChange={(e) => setWeeklyReflection(e.target.value)}
            placeholder="How did this week go? What did you learn? Any insights or challenges?"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
            disabled={hasShared}
          />
          {!hasShared && (
            <Button
              onClick={handleSaveReflection}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/20"
            >
              Save Reflection
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Share Week */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="pt-6">
          {hasShared ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-white text-lg font-medium">Week Shared!</p>
              <p className="text-white/60 text-sm mt-1">
                Your progress has been shared with the community.
              </p>
              <Button
                onClick={() => window.open('/community', '_blank')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/20 mt-3"
              >
                View in Community
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/80 mb-4">
                Ready to share your week's progress with the community?
              </p>
              <Button
                onClick={handleShareWeek}
                disabled={isSharing || (objectives?.length === 0 && !weeklyReflection.trim())}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isSharing ? "Sharing..." : "Share This Week"}
              </Button>
              {objectives?.length === 0 && !weeklyReflection.trim() && (
                <p className="text-white/40 text-xs mt-2">
                  Add some objectives or a reflection to share your week
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
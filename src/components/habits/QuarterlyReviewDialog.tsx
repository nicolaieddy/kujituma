import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { Loader2, Trophy, AlertCircle, Lightbulb, Rocket } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";

interface QuarterlyReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuarterlyReviewDialog = ({ open, onOpenChange }: QuarterlyReviewDialogProps) => {
  const { goals } = useGoals();
  const { 
    currentReview,
    year,
    quarter,
    saveReview, 
    completeReview, 
    isCompleting,
    isSaving 
  } = useQuarterlyReview();
  
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [nextQuarterFocus, setNextQuarterFocus] = useState("");
  
  useEffect(() => {
    if (currentReview) {
      setWins(currentReview.wins || "");
      setChallenges(currentReview.challenges || "");
      setLessonsLearned(currentReview.lessons_learned || "");
      setNextQuarterFocus(currentReview.next_quarter_focus || "");
    }
  }, [currentReview]);
  
  const handleComplete = async () => {
    await saveReview({
      year,
      quarter,
      wins,
      challenges,
      lessons_learned: lessonsLearned,
      next_quarter_focus: nextQuarterFocus,
      goals_review: goals?.map(g => ({ id: g.id, title: g.title, status: g.status })),
    });
    await completeReview();
    onOpenChange(false);
  };
  
  const handleSave = async () => {
    await saveReview({
      year,
      quarter,
      wins,
      challenges,
      lessons_learned: lessonsLearned,
      next_quarter_focus: nextQuarterFocus,
    });
  };
  
  const quarterNames = ['', 'Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Quarterly Review
          </DialogTitle>
          <DialogDescription>
            {quarterNames[quarter]} {year} — Reflect on your progress and plan ahead
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Goals Summary */}
          {goals && goals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Your Goals This Quarter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {goals.slice(0, 5).map(goal => (
                    <div key={goal.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{goal.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        goal.status === 'completed' 
                          ? 'bg-success/20 text-success' 
                          : goal.status === 'in_progress'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Wins */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              What were your biggest wins this quarter?
            </Label>
            <Textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="I'm proud that I..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Challenges */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              What challenges did you face?
            </Label>
            <Textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="The biggest obstacles were..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Lessons Learned */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              What lessons did you learn?
            </Label>
            <Textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="I learned that..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Next Quarter Focus */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              What will you focus on next quarter?
            </Label>
            <Textarea
              value={nextQuarterFocus}
              onChange={(e) => setNextQuarterFocus(e.target.value)}
              placeholder="Next quarter I will..."
              className="resize-none min-h-[80px]"
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Review ✨
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { useQuarterlyReviewTrigger } from "@/contexts/QuarterlyReviewContext";
import { QuarterlyReviewDetailModal } from "./QuarterlyReviewDetailModal";
import { Trophy, AlertCircle, Lightbulb, Rocket, Plus, CheckCircle, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

const quarterNames = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
const quarterFullNames = ['', 'Jan - Mar', 'Apr - Jun', 'Jul - Sep', 'Oct - Dec'];

export const QuarterlyReviewsTab = () => {
  const { allReviews, currentReview, year, quarter, isLoading } = useQuarterlyReview();
  const { openQuarterlyReview } = useQuarterlyReviewTrigger();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const stats = useMemo(() => {
    if (!allReviews) return { completed: 0, total: 0 };
    const completed = allReviews.filter(r => r.is_completed).length;
    return { completed, total: allReviews.length };
  }, [allReviews]);

  const pastReviews = allReviews?.filter(r => !(r.year === year && r.quarter === quarter)) || [];

  return (
    <div className="space-y-6">
      {/* Current Quarter Status */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 {quarterNames[quarter]} {year}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{quarterFullNames[quarter]}</p>
            </div>
            <Badge variant={currentReview?.is_completed ? "default" : "secondary"}>
              {currentReview?.is_completed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
              ) : currentReview ? (
                <><Clock className="h-3 w-3 mr-1" /> In Progress</>
              ) : (
                "Not Started"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentReview?.is_completed ? (
            <div className="space-y-4">
              {currentReview.wins && (
                <div className="flex gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Wins</p>
                    <p className="text-sm">{currentReview.wins}</p>
                  </div>
                </div>
              )}
              {currentReview.next_quarter_focus && (
                <div className="flex gap-3">
                  <Rocket className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next Quarter Focus</p>
                    <p className="text-sm">{currentReview.next_quarter_focus}</p>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={openQuarterlyReview}>
                View Full Review
              </Button>
            </div>
          ) : (
            <Button onClick={openQuarterlyReview}>
              <Plus className="h-4 w-4 mr-2" />
              {currentReview ? "Continue Review" : "Start Review"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Reviews Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">out of {stats.total} total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </p>
            <Progress 
              value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Past Reviews List */}
      {pastReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Quarterly Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastReviews
              .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.quarter - a.quarter;
              })
              .map((review) => (
                <div 
                  key={review.id} 
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group space-y-3"
                  onClick={() => {
                    setSelectedReview(review);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{quarterNames[review.quarter]} {review.year}</p>
                      <p className="text-xs text-muted-foreground">{quarterFullNames[review.quarter]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={review.is_completed ? "default" : "secondary"} className="text-xs">
                        {review.is_completed ? "Completed" : "Draft"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  {review.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completed {format(new Date(review.completed_at), 'MMM d, yyyy')}
                    </p>
                  )}
                  
                  <div className="grid gap-2 text-sm">
                    {review.wins && (
                      <div className="flex gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-muted-foreground line-clamp-1">{review.wins}</p>
                      </div>
                    )}
                    {review.challenges && (
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-muted-foreground line-clamp-1">{review.challenges}</p>
                      </div>
                    )}
                    {review.lessons_learned && (
                      <div className="flex gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-muted-foreground line-clamp-1">{review.lessons_learned}</p>
                      </div>
                    )}
                    {review.next_quarter_focus && (
                      <div className="flex gap-2">
                        <Rocket className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-muted-foreground line-clamp-1">{review.next_quarter_focus}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {pastReviews.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No past reviews yet. Complete your first quarterly review to see your history!
        </p>
      )}

      {/* Detail Modal */}
      <QuarterlyReviewDetailModal
        review={selectedReview}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};

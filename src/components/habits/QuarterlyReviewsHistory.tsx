import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { useQuarterlyReviewTrigger } from "@/contexts/QuarterlyReviewContext";
import { Trophy, AlertCircle, Lightbulb, Rocket, Plus, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export const QuarterlyReviewsHistory = () => {
  const { allReviews, currentReview, year, quarter, isLoading } = useQuarterlyReview();
  const { isHistoryOpen, setHistoryOpen, openQuarterlyReview } = useQuarterlyReviewTrigger();

  const quarterNames = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
  const quarterFullNames = ['', 'Jan - Mar', 'Apr - Jun', 'Jul - Sep', 'Oct - Dec'];

  const handleStartReview = () => {
    setHistoryOpen(false);
    openQuarterlyReview();
  };

  return (
    <Sheet open={isHistoryOpen} onOpenChange={setHistoryOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📊 Quarterly Reviews
          </SheetTitle>
          <SheetDescription>
            Track your progress and reflections each quarter
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current Quarter Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {quarterNames[quarter]} {year}
                </CardTitle>
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
              <p className="text-xs text-muted-foreground">{quarterFullNames[quarter]}</p>
            </CardHeader>
            <CardContent>
              {currentReview?.is_completed ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleStartReview}
                >
                  View Review
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleStartReview}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {currentReview ? "Continue Review" : "Start Review"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Past Reviews */}
          {allReviews && allReviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Past Reviews</h3>
              {allReviews
                .filter(r => !(r.year === year && r.quarter === quarter))
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  return b.quarter - a.quarter;
                })
                .map((review) => (
                  <Card key={review.id} className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {quarterNames[review.quarter]} {review.year}
                        </CardTitle>
                        <Badge variant={review.is_completed ? "default" : "secondary"} className="text-xs">
                          {review.is_completed ? "Completed" : "Draft"}
                        </Badge>
                      </div>
                      {review.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completed {format(new Date(review.completed_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {review.wins && (
                        <div className="flex gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <p className="text-muted-foreground line-clamp-2">{review.wins}</p>
                        </div>
                      )}
                      {review.challenges && (
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-muted-foreground line-clamp-2">{review.challenges}</p>
                        </div>
                      )}
                      {review.lessons_learned && (
                        <div className="flex gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-muted-foreground line-clamp-2">{review.lessons_learned}</p>
                        </div>
                      )}
                      {review.next_quarter_focus && (
                        <div className="flex gap-2">
                          <Rocket className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-muted-foreground line-clamp-2">{review.next_quarter_focus}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {(!allReviews || allReviews.filter(r => !(r.year === year && r.quarter === quarter)).length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No past reviews yet. Complete your first quarterly review to see your history!
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

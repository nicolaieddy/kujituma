import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Heart, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useValues } from "@/hooks/useValues";
import { useGoalLinks, useValueLinkMutations } from "@/hooks/useGoalValueAlignment";
import { useMemo } from "react";

interface Props {
  goalId: string;
}

export const GoalValuesEditor = ({ goalId }: Props) => {
  const { values, isLoading: valuesLoading } = useValues();
  const { data: links = [], isLoading: linksLoading } = useGoalLinks(goalId);
  const { upsertLink, removeLink, requestAiSuggest } = useValueLinkMutations(goalId);

  const linkByValue = useMemo(() => {
    const m = new Map<string, { weight: number; source: "ai" | "user" }>();
    links.forEach((l) => m.set(l.value_id, { weight: l.weight, source: l.source }));
    return m;
  }, [links]);

  const score = useMemo(() => {
    if (values.length === 0) return 0;
    const sum = links.reduce((acc, l) => acc + l.weight, 0);
    return Math.round((sum / (5 * values.length)) * 100);
  }, [values, links]);

  if (valuesLoading || linksLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">Loading values…</p>
        </CardContent>
      </Card>
    );
  }

  if (values.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center space-y-3">
          <Heart className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Define your values first — goals tied to values get done.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile?tab=values">Add my values</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const setWeight = (valueId: string, weight: number) => {
    if (weight < 1 || weight > 5) return;
    upsertLink.mutate({ valueId, weight });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Values alignment
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => requestAiSuggest.mutate()}
            disabled={requestAiSuggest.isPending}
          >
            {requestAiSuggest.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Re-suggest with AI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Alignment score</span>
            <span className="text-sm font-semibold">{score}%</span>
          </div>
          <Progress value={score} />
        </div>

        <div className="space-y-2">
          {values.map((v) => {
            const link = linkByValue.get(v.id);
            const weight = link?.weight ?? 0;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md border border-border/60 bg-card/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{v.label}</span>
                    {link?.source === "ai" && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setWeight(v.id, n)}
                      className={`h-6 w-6 rounded-full text-[11px] font-medium border transition-colors ${
                        weight >= n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      }`}
                      aria-label={`Set weight ${n}`}
                    >
                      {n}
                    </button>
                  ))}
                  {weight > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeLink.mutate(v.id)}
                      title="Unlink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Weight 1 = touches this value lightly · 5 = central to it. AI suggestions are shown with a sparkle and overwritten when you adjust.
        </p>
      </CardContent>
    </Card>
  );
};

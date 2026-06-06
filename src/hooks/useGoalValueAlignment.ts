import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ValuesService } from "@/services/valuesService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { alignmentsKey, valueLinksKey } from "@/hooks/useValues";

export const useAllAlignments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: alignmentsKey(user?.id),
    queryFn: () => ValuesService.listMyAlignments(),
    enabled: !!user,
    staleTime: 30_000,
  });
};

export const useAllValueLinks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: valueLinksKey(user?.id),
    queryFn: () => ValuesService.listMyLinks(),
    enabled: !!user,
    staleTime: 30_000,
  });
};

export const useGoalLinks = (goalId: string | null | undefined) => {
  return useQuery({
    queryKey: ["goalValueLinks", "byGoal", goalId],
    queryFn: () => (goalId ? ValuesService.getLinksForGoal(goalId) : Promise.resolve([])),
    enabled: !!goalId,
  });
};

export const useValueLinkMutations = (goalId: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goalValueLinks", "byGoal", goalId] });
    qc.invalidateQueries({ queryKey: valueLinksKey(user?.id) });
    qc.invalidateQueries({ queryKey: alignmentsKey(user?.id) });
    qc.invalidateQueries({ queryKey: ["goals", user?.id] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const upsertLink = useMutation({
    mutationFn: ({ valueId, weight }: { valueId: string; weight: number }) =>
      ValuesService.upsertLink(goalId, valueId, weight, "user"),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const removeLink = useMutation({
    mutationFn: (valueId: string) => ValuesService.deleteLink(goalId, valueId),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Remove failed", description: e.message, variant: "destructive" }),
  });

  const requestAiSuggest = useMutation({
    mutationFn: () => ValuesService.suggestForGoal(goalId),
    onSuccess: () => {
      invalidate();
      toast({ title: "AI suggestions updated" });
    },
    onError: (e: Error) => toast({ title: "AI suggestion failed", description: e.message, variant: "destructive" }),
  });

  return { upsertLink, removeLink, requestAiSuggest };
};

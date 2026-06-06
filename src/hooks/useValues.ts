import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ValuesService } from "@/services/valuesService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CreateValueInput, UserValue } from "@/types/values";

export const valuesKey = (uid?: string) => ["values", uid] as const;
export const alignmentsKey = (uid?: string) => ["goalsAlignment", uid] as const;
export const valueLinksKey = (uid?: string) => ["goalValueLinks", uid] as const;

export const useValues = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: values = [], isLoading } = useQuery({
    queryKey: valuesKey(user?.id),
    queryFn: () => ValuesService.listMyValues(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: valuesKey(user?.id) });
    qc.invalidateQueries({ queryKey: alignmentsKey(user?.id) });
    qc.invalidateQueries({ queryKey: valueLinksKey(user?.id) });
    qc.invalidateQueries({ queryKey: ["goals", user?.id] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateValueInput) => ValuesService.createValue(input),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Value added" });
    },
    onError: (e: Error) => toast({ title: "Couldn't add value", description: e.message, variant: "destructive" }),
  });

  const bulkCreate = useMutation({
    mutationFn: (inputs: CreateValueInput[]) => ValuesService.bulkCreate(inputs),
    onSuccess: (rows) => {
      invalidateAll();
      toast({ title: `Imported ${rows.length} value${rows.length === 1 ? "" : "s"}` });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<UserValue> }) => ValuesService.updateValue(id, patch),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ValuesService.deleteValue(id),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Value deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return { values, isLoading, create, bulkCreate, update, remove };
};

export const usePublicValues = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["values", "public", userId],
    queryFn: () => (userId ? ValuesService.listPublicValues(userId) : Promise.resolve([])),
    enabled: !!userId,
  });
};

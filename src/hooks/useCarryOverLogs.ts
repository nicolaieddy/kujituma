import { useQuery } from "@tanstack/react-query";
import { CarryOverLogService, CarryOverLog } from "@/services/carryOverLogService";
import { useAuth } from "@/contexts/AuthContext";

export const useCarryOverLogs = (limit = 50) => {
  const { user } = useAuth();

  const { data: logs = [], isLoading, error, refetch } = useQuery<CarryOverLog[]>({
    queryKey: ['carry-over-logs', user?.id, limit],
    queryFn: () => CarryOverLogService.getRecentLogs(limit),
    enabled: !!user,
  });

  return {
    logs,
    isLoading,
    error,
    refetch,
  };
};

import { Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PublicCommitmentsBadge = () => {
  return (
    <Badge variant="secondary" className="gap-1">
      <Target className="h-3 w-3" />
      Top 3 Committed
    </Badge>
  );
};

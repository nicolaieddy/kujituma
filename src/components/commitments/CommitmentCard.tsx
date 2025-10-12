import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Target } from 'lucide-react';
import { PublicCommitment } from '@/services/commitmentsService';

interface CommitmentCardProps {
  commitments: PublicCommitment[];
  userName: string;
}

export const CommitmentCard = ({ commitments, userName }: CommitmentCardProps) => {
  if (commitments.length === 0) return null;

  const completedCount = commitments.filter(c => c.is_completed).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {userName}'s Top 3 This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {commitments.map((commitment, index) => (
          <div
            key={commitment.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              commitment.is_completed
                ? 'bg-success/10 border-success/20'
                : 'bg-background border-border'
            }`}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${commitment.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                {commitment.objective_text}
              </p>
            </div>
            {commitment.is_completed && (
              <Check className="h-5 w-5 text-success flex-shrink-0" />
            )}
          </div>
        ))}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Progress: <span className="font-semibold text-foreground">{completedCount}/3</span> completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AccountabilityPartner } from '@/services/accountabilityService';
import { Eye, MoreVertical, UserMinus, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PartnerCardProps {
  partner: AccountabilityPartner;
  onRemove: (partnerId: string) => Promise<void>;
  onCheckIn: (partnershipId: string) => Promise<void>;
  loading?: boolean;
}

export const PartnerCard = ({ partner, onRemove, onCheckIn, loading }: PartnerCardProps) => {
  const navigate = useNavigate();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove(partner.partner_id);
    setIsRemoving(false);
    setShowRemoveDialog(false);
  };

  const handleViewDashboard = () => {
    navigate(`/partner/${partner.partner_id}`);
  };

  const initials = partner.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Card className="border-border hover:border-primary/30 transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={partner.avatar_url || undefined} alt={partner.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {partner.full_name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {partner.last_check_in_at ? (
                  <span>Last check-in {formatDistanceToNow(new Date(partner.last_check_in_at))} ago</span>
                ) : (
                  <span>No check-ins yet</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDashboard}
                className="hidden sm:flex"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Goals
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleViewDashboard} className="sm:hidden">
                    <Eye className="h-4 w-4 mr-2" />
                    View Goals
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCheckIn(partner.partnership_id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Record Check-in
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowRemoveDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Partner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Accountability Partner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {partner.full_name} as your accountability partner? 
              This will end your partnership and they will no longer be able to view your goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove Partner'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

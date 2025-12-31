import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AccountabilityPartner, accountabilityService } from '@/services/accountabilityService';
import { Eye, EyeOff, MoreVertical, UserMinus, MessageSquare, Clock, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PartnerCardProps {
  partner: AccountabilityPartner;
  onRemove: (partnerId: string) => Promise<void>;
  onCheckIn: (partnershipId: string) => Promise<void>;
  onVisibilityChange?: () => void;
  loading?: boolean;
}

export const PartnerCard = ({ partner, onRemove, onCheckIn, onVisibilityChange, loading }: PartnerCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [canViewPartner, setCanViewPartner] = useState(partner.can_view_partner_goals);
  const [partnerCanViewMe, setPartnerCanViewMe] = useState(partner.partner_can_view_my_goals);

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove(partner.partner_id);
    setIsRemoving(false);
    setShowRemoveDialog(false);
  };

  const handleViewDashboard = () => {
    if (!partner.can_view_partner_goals) {
      toast({
        title: "Access restricted",
        description: "You don't have permission to view this partner's goals.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/partner/${partner.partner_id}`);
  };

  const handleVisibilityUpdate = async (
    setting: 'canViewPartnerGoals' | 'partnerCanViewMyGoals',
    value: boolean
  ) => {
    setIsUpdatingVisibility(true);
    
    const result = await accountabilityService.updateVisibilitySettings(partner.partner_id, {
      [setting]: value,
    });

    if (result.success) {
      if (setting === 'canViewPartnerGoals') {
        setCanViewPartner(value);
      } else {
        setPartnerCanViewMe(value);
      }
      toast({
        title: "Settings updated",
        description: "Visibility settings have been saved.",
      });
      onVisibilityChange?.();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update settings.",
        variant: "destructive",
      });
    }
    
    setIsUpdatingVisibility(false);
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {partner.last_check_in_at ? (
                    <span>Check-in {formatDistanceToNow(new Date(partner.last_check_in_at))} ago</span>
                  ) : (
                    <span>No check-ins yet</span>
                  )}
                </div>
                <span className="text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1">
                  {canViewPartner ? (
                    <Eye className="h-3 w-3 text-primary" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  <span>{canViewPartner ? 'Can view' : "Can't view"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDashboard}
                disabled={!canViewPartner}
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
                  <DropdownMenuItem onClick={handleViewDashboard} className="sm:hidden" disabled={!canViewPartner}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Goals
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCheckIn(partner.partnership_id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Record Check-in
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Visibility Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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

      {/* Visibility Settings Dialog */}
      <AlertDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Visibility Settings
            </AlertDialogTitle>
            <AlertDialogDescription>
              Control what you and {partner.full_name} can see in this partnership.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="view-partner" className="text-sm font-medium">
                  I can view their goals
                </Label>
                <p className="text-xs text-muted-foreground">
                  See {partner.full_name}'s goals and weekly objectives
                </p>
              </div>
              <Switch
                id="view-partner"
                checked={canViewPartner}
                onCheckedChange={(checked) => handleVisibilityUpdate('canViewPartnerGoals', checked)}
                disabled={isUpdatingVisibility}
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="partner-view-me" className="text-sm font-medium">
                  They can view my goals
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow {partner.full_name} to see your goals and objectives
                </p>
              </div>
              <Switch
                id="partner-view-me"
                checked={partnerCanViewMe}
                onCheckedChange={(checked) => handleVisibilityUpdate('partnerCanViewMyGoals', checked)}
                disabled={isUpdatingVisibility}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Partner Dialog */}
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

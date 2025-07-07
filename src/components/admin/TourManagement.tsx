import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TourService } from '@/services/tourService';
import { toast } from '@/hooks/use-toast';
import { Play, RotateCcw } from 'lucide-react';

export const TourManagement = () => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [tourType, setTourType] = useState('onboarding');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetTour = async () => {
    if (!selectedUserId && !userEmail) {
      toast({
        title: "Error",
        description: "Please provide either a user ID or email",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsResetting(true);
      
      let userId = selectedUserId;
      if (!userId && userEmail) {
        // In a real implementation, you'd look up the user by email
        // For now, we'll require the user ID
        toast({
          title: "Error",
          description: "Please provide the user ID for now",
          variant: "destructive",
        });
        return;
      }

      await TourService.resetUserTour(userId, tourType);
      
      toast({
        title: "Success",
        description: `Tour has been reset for the user. They will see it on their next login.`,
      });
      
      setSelectedUserId('');
      setUserEmail('');
    } catch (error) {
      console.error('Error resetting tour:', error);
      toast({
        title: "Error",
        description: "Failed to reset tour. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Tour Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reset onboarding tours for specific users
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="Enter user ID..."
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userEmail">Or User Email</Label>
            <Input
              id="userEmail"
              placeholder="Enter user email..."
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled // Disabled for now as we need user lookup functionality
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tourType">Tour Type</Label>
          <Select value={tourType} onValueChange={setTourType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onboarding">Onboarding Tour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleResetTour}
          disabled={isResetting || (!selectedUserId && !userEmail)}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {isResetting ? 'Resetting...' : 'Reset Tour for User'}
        </Button>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Enter the user ID of the user you want to reset the tour for</li>
            <li>The user will see the onboarding tour again on their next login</li>
            <li>This is useful for helping users who dismissed the tour too early</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
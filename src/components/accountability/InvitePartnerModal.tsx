import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Friend } from '@/services/friendsService';
import { useFriends } from '@/hooks/useFriends';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, UserPlus, Users } from 'lucide-react';
import { AccountabilityPartner } from '@/services/accountabilityService';

interface InvitePartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (userId: string, message: string) => Promise<{ success: boolean }>;
  existingPartners: AccountabilityPartner[];
}

export const InvitePartnerModal = ({ 
  open, 
  onOpenChange, 
  onInvite,
  existingPartners 
}: InvitePartnerModalProps) => {
  const { friends, loading: friendsLoading } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [message, setMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter friends who are not already partners
  const availableFriends = friends.filter(friend => 
    !existingPartners.some(p => p.partner_id === friend.friend_id)
  );

  // Filter by search query
  const filteredFriends = debouncedSearch
    ? availableFriends.filter(friend =>
        friend.full_name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : availableFriends;

  const handleInvite = async () => {
    if (!selectedFriend) return;
    
    setIsInviting(true);
    const result = await onInvite(selectedFriend.friend_id, message);
    setIsInviting(false);
    
    if (result.success) {
      setSelectedFriend(null);
      setMessage('');
      setSearchQuery('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedFriend(null);
    setMessage('');
    setSearchQuery('');
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Accountability Partner
          </DialogTitle>
          <DialogDescription>
            Choose a friend to become your accountability partner. They'll be able to view your goals and help keep you on track.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!selectedFriend ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {friendsLoading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Loading friends...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      {availableFriends.length === 0 
                        ? "All your friends are already partners, or you haven't added any friends yet."
                        : "No friends match your search."}
                    </p>
                  </div>
                ) : (
                  filteredFriends.map((friend) => (
                    <Card 
                      key={friend.friend_id} 
                      className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {getInitials(friend.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {friend.full_name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={selectedFriend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedFriend.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{selectedFriend.full_name}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedFriend(null)}
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="message">Add a message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="I'd love for you to help keep me accountable on my goals..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting} className="flex-1">
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, User } from "lucide-react";
import { FriendRequest } from "@/services/friendsService";
import { motion } from "framer-motion";

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'sent' | 'received';
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  loading?: boolean;
}

export const FriendRequestCard = ({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  loading = false
}: FriendRequestCardProps) => {
  const profile = type === 'sent' ? request.receiver_profile : request.sender_profile;
  
  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="hover:shadow-lg transition-shadow border-border hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-foreground">{profile.full_name}</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            {type === 'received' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAccept?.(request.id)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(request.id)}
                  disabled={loading}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {type === 'sent' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel?.(request.id)}
                disabled={loading}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
};
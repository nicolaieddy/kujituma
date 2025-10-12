import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, UserPlus } from "lucide-react";
import { UserProfile } from "@/services/friendsService";
import { useNavigate } from "react-router-dom";

interface UserSearchCardProps {
  user: UserProfile;
  onSendRequest?: (userId: string) => void;
  loading?: boolean;
}

export const UserSearchCard = ({
  user,
  onSendRequest,
  loading = false
}: UserSearchCardProps) => {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    navigate(`/profile/${user.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer flex-1"
            onClick={handleViewProfile}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-foreground hover:text-primary transition-colors">
                {user.full_name}
              </h4>
              {user.about_me && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {user.about_me}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewProfile}
              className="text-muted-foreground"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={() => onSendRequest?.(user.id)}
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add Friend
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
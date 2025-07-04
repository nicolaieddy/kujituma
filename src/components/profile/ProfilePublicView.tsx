import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Clock, ExternalLink } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  created_at: string;
  last_active_at?: string;
}

interface ProfilePublicViewProps {
  profile: Profile;
}

export const ProfilePublicView = ({ profile }: ProfilePublicViewProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-8">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Avatar className="h-32 w-32 border-4 border-white/20">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-4xl">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{profile.full_name}</h1>
          </div>

          {/* About Me Section */}
          {profile.about_me && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">About Me</h2>
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {profile.about_me}
              </p>
            </div>
          )}

          {/* LinkedIn Section */}
          {profile.linkedin_url && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Professional Links</h2>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.open(profile.linkedin_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                LinkedIn Profile
              </Button>
            </div>
          )}

          {/* Member Info */}
          <div className="border-t border-white/20 pt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Member Information</h2>
            <div className="space-y-3">
              <div className="flex items-center text-white/80">
                <Calendar className="h-5 w-5 mr-3 text-purple-400" />
                <span>Member since {formatDate(profile.created_at)}</span>
              </div>
              {profile.last_active_at && (
                <div className="flex items-center text-white/80">
                  <Clock className="h-5 w-5 mr-3 text-blue-400" />
                  <span>Last active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
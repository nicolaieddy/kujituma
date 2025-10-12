import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Profile {
  id: string;
  email?: string; // Optional for non-owners
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  created_at: string;
  last_active_at?: string;
}

interface ProfileHeaderProps {
  profile: Profile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <Avatar className="h-32 w-32 border-4 border-border">
          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
            <User className="h-16 w-16" />
          </AvatarFallback>
        </Avatar>
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">{profile.full_name}</h1>
      {profile.email && <p className="text-foreground/80 text-lg">{profile.email}</p>}
    </div>
  );
};
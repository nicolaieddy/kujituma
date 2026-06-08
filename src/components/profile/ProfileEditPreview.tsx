import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Save, Edit3, Eye, Users, Globe, Calendar, Clock } from "lucide-react";
import { ProfileStats } from "./ProfileStats";
import { ProfileGoals } from "./ProfileGoals";
import { SocialLinksDisplay } from "./SocialLinksDisplay";
import { formatTimeAgo } from "@/utils/timeUtils";

interface PreviewProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  created_at: string;
  last_active_at?: string;
}

interface ProfileEditPreviewProps {
  profile: PreviewProfile;
  socialLinks: Record<string, string>;
  socialLinksOrder: string[];
  previewViewerType: 'friend' | 'public';
  loading: boolean;
  onChangeViewerType: (t: 'friend' | 'public') => void;
  onBackToEdit: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const ProfileEditPreview = ({
  profile,
  socialLinks,
  socialLinksOrder,
  previewViewerType,
  loading,
  onChangeViewerType,
  onBackToEdit,
  onSave,
}: ProfileEditPreviewProps) => {
  return (
    <div className="space-y-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>Preview: How others see your profile</span>
        </div>

        <div className="flex items-center gap-2 bg-accent rounded-lg p-1">
          <Button
            variant={previewViewerType === 'friend' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChangeViewerType('friend')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Friend View
          </Button>
          <Button
            variant={previewViewerType === 'public' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChangeViewerType('public')}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            Public View
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBackToEdit}>
            <Edit3 className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <Button size="sm" disabled={loading} onClick={onSave} className="gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className={`rounded-lg px-4 py-2 text-sm flex items-center gap-2 ${
          previewViewerType === 'friend'
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-muted text-muted-foreground border border-border'
        }`}>
          {previewViewerType === 'friend' ? (
            <>
              <Users className="h-4 w-4" />
              <span>Viewing as a <strong>friend</strong> - They can see your public goals and friend-only content</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>Viewing as <strong>public visitor</strong> - They can only see your public goals</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="glass-card shadow-elegant overflow-hidden">
          <div
            className="h-32 sm:h-40 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 relative"
            style={profile.cover_photo_url ? {
              backgroundImage: `url(${profile.cover_photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: `center ${profile.cover_photo_position ?? 50}%`
            } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          <div className="px-6 sm:px-8 pb-6 -mt-16 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-foreground mb-1 font-heading">{profile.full_name}</h1>
                {Object.keys(socialLinks).length > 0 && (
                  <div className="mt-3">
                    <SocialLinksDisplay socialLinks={socialLinks} linkOrder={socialLinksOrder} size="sm" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <ProfileStats userId={profile.id} />
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 pt-0">
            {profile.about_me && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.about_me}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {profile.last_active_at && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-primary" />
                  <span>Active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <ProfileGoals userId={profile.id} isOwnProfile={false} viewerType={previewViewerType} />
      </div>
    </div>
  );
};

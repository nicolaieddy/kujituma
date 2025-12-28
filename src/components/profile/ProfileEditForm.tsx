import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Upload, Save, X, Move, Trash2, RotateCcw, Eye, Edit3, Users, Globe, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { CoverPhotoPositioner } from "./CoverPhotoPositioner";
import { ProfileStats } from "./ProfileStats";
import { ProfileGoals } from "./ProfileGoals";
import { SocialLinkPicker, SOCIAL_PLATFORMS } from "./SocialLinkPicker";
import { SocialLinksDisplay } from "./SocialLinksDisplay";
import { Calendar, Clock } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";

interface Profile {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  email_contact?: string;
  website_url?: string;
  github_url?: string;
  snapchat_url?: string;
  medium_url?: string;
  substack_url?: string;
  whatsapp_url?: string;
  telegram_url?: string;
  signal_url?: string;
  phone_number?: string;
  show_email?: boolean;
  commitment_visibility?: 'private' | 'friends' | 'public';
  social_links_order?: string[];
  created_at: string;
  last_active_at?: string;
}

interface ProfileEditFormProps {
  profile: Profile;
  onUpdate: (profile: Profile) => void;
  onCancel: () => void;
}

// Helper to extract social links from profile
const extractSocialLinks = (profile: Profile): Record<string, string> => {
  const links: Record<string, string> = {};
  SOCIAL_PLATFORMS.forEach(platform => {
    const value = profile[platform.id as keyof Profile];
    if (typeof value === 'string' && value) {
      links[platform.id] = value;
    }
  });
  return links;
};

export const ProfileEditForm = ({ profile, onUpdate, onCancel }: ProfileEditFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewerType, setPreviewViewerType] = useState<'friend' | 'public'>('friend');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showSocialPicker, setShowSocialPicker] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(() => extractSocialLinks(profile));
  const [socialLinksOrder, setSocialLinksOrder] = useState<string[]>(() => profile.social_links_order || []);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    about_me: profile.about_me || '',
    avatar_url: profile.avatar_url || '',
    cover_photo_url: profile.cover_photo_url || '',
    cover_photo_position: profile.cover_photo_position ?? 50,
    show_email: profile.show_email ?? false,
    commitment_visibility: profile.commitment_visibility || 'friends' as 'private' | 'friends' | 'public'
  });

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const originalLinks = extractSocialLinks(profile);
    const linksChanged = JSON.stringify(socialLinks) !== JSON.stringify(originalLinks);
    const orderChanged = JSON.stringify(socialLinksOrder) !== JSON.stringify(profile.social_links_order || []);
    
    return (
      formData.full_name !== (profile.full_name || '') ||
      formData.about_me !== (profile.about_me || '') ||
      formData.avatar_url !== (profile.avatar_url || '') ||
      formData.cover_photo_url !== (profile.cover_photo_url || '') ||
      formData.cover_photo_position !== (profile.cover_photo_position ?? 50) ||
      formData.show_email !== (profile.show_email ?? false) ||
      formData.commitment_visibility !== (profile.commitment_visibility || 'friends') ||
      linksChanged ||
      orderChanged
    );
  }, [formData, profile, socialLinks, socialLinksOrder]);

  // Warn before browser navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onCancel();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload profile photo. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadCoverPhoto = async (file: File) => {
    if (!user) return null;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cover.${fileExt}`;

      const { error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Cover upload error:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload cover photo. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Cover upload error:', error);
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const publicUrl = await uploadProfilePhoto(file);
    if (publicUrl) {
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Photo uploaded",
        description: "Profile photo uploaded successfully!",
      });
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const publicUrl = await uploadCoverPhoto(file);
    if (publicUrl) {
      setFormData(prev => ({ ...prev, cover_photo_url: publicUrl }));
      toast({
        title: "Cover uploaded",
        description: "Cover photo uploaded successfully!",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          about_me: formData.about_me,
          avatar_url: formData.avatar_url,
          cover_photo_url: formData.cover_photo_url,
          cover_photo_position: formData.cover_photo_position,
          show_email: formData.show_email,
          commitment_visibility: formData.commitment_visibility,
          // Social links
          linkedin_url: socialLinks.linkedin_url || '',
          instagram_url: socialLinks.instagram_url || '',
          tiktok_url: socialLinks.tiktok_url || '',
          twitter_url: socialLinks.twitter_url || '',
          youtube_url: socialLinks.youtube_url || '',
          email_contact: socialLinks.email_contact || '',
          website_url: socialLinks.website_url || '',
          github_url: socialLinks.github_url || '',
          snapchat_url: socialLinks.snapchat_url || '',
          medium_url: socialLinks.medium_url || '',
          substack_url: socialLinks.substack_url || '',
          whatsapp_url: socialLinks.whatsapp_url || '',
          telegram_url: socialLinks.telegram_url || '',
          signal_url: socialLinks.signal_url || '',
          phone_number: socialLinks.phone_number || '',
          social_links_order: socialLinksOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        toast({
          title: "Update failed",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully!",
      });

      onUpdate(data as Profile);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a preview profile object from form data
  const previewProfile = {
    id: profile.id,
    email: profile.email,
    full_name: formData.full_name,
    avatar_url: formData.avatar_url,
    cover_photo_url: formData.cover_photo_url,
    cover_photo_position: formData.cover_photo_position,
    about_me: formData.about_me,
    show_email: formData.show_email,
    created_at: profile.created_at,
    last_active_at: profile.last_active_at,
  };

  if (isPreviewMode) {
    return (
      <div className="space-y-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Preview: How others see your profile</span>
          </div>
          
          {/* Viewer Type Toggle */}
          <div className="flex items-center gap-2 bg-accent rounded-lg p-1">
            <Button
              variant={previewViewerType === 'friend' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewViewerType('friend')}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Friend View
            </Button>
            <Button
              variant={previewViewerType === 'public' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewViewerType('public')}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              Public View
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(false)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleSubmit}
              className="gradient-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Viewer type info banner */}
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
        
        {/* Full profile preview using ProfilePublicView-like structure */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="glass-card shadow-elegant overflow-hidden">
            {/* Cover Photo */}
            <div 
              className="h-32 sm:h-40 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 relative"
              style={previewProfile.cover_photo_url ? {
                backgroundImage: `url(${previewProfile.cover_photo_url})`,
                backgroundSize: 'cover',
                backgroundPosition: `center ${previewProfile.cover_photo_position ?? 50}%`
              } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            
            {/* Profile Header */}
            <div className="px-6 sm:px-8 pb-6 -mt-16 relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                  <AvatarImage src={previewProfile.avatar_url} alt={previewProfile.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-foreground mb-1 font-heading">{previewProfile.full_name}</h1>
                  {previewProfile.show_email && previewProfile.email && (
                    <p className="text-muted-foreground">{previewProfile.email}</p>
                  )}
                  
                  {/* Social links */}
                  {Object.keys(socialLinks).length > 0 && (
                    <div className="mt-3">
                      <SocialLinksDisplay socialLinks={socialLinks} linkOrder={socialLinksOrder} size="sm" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Profile Stats */}
              <div className="mt-6">
                <ProfileStats userId={profile.id} />
              </div>
            </div>

            <CardContent className="p-6 sm:p-8 pt-0">
              {/* About Me Section */}
              {previewProfile.about_me && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {previewProfile.about_me}
                  </p>
                </div>
              )}

              {/* Member Info */}
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

          {/* Goals Section */}
          <ProfileGoals userId={profile.id} isOwnProfile={false} viewerType={previewViewerType} />
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-border hover:border-primary/20 transition-all shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground font-heading text-2xl">Edit Profile</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPreviewMode(true)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo Section */}
          <div className="space-y-2">
            <Label className="text-foreground">Cover Photo</Label>
            {isRepositioning && formData.cover_photo_url ? (
              <CoverPhotoPositioner
                imageUrl={formData.cover_photo_url}
                initialPosition={formData.cover_photo_position}
                onSave={(position) => {
                  setFormData(prev => ({ ...prev, cover_photo_position: position }));
                  setIsRepositioning(false);
                  toast({
                    title: "Position updated",
                    description: "Cover photo position saved. Don't forget to save your profile!",
                  });
                }}
                onCancel={() => setIsRepositioning(false)}
              />
            ) : (
              <div 
                className="relative h-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 group"
                style={formData.cover_photo_url ? {
                  backgroundImage: `url(${formData.cover_photo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `center ${formData.cover_photo_position}%`
                } : undefined}
              >
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 transition-opacity">
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={uploadingCover}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingCover ? 'Uploading...' : formData.cover_photo_url ? 'Change' : 'Add Cover Photo'}
                      </span>
                    </Button>
                  </Label>
                  {formData.cover_photo_url && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsRepositioning(true)}
                      >
                        <Move className="h-4 w-4 mr-2" />
                        Reposition
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, cover_photo_url: '', cover_photo_position: 50 }));
                          toast({
                            title: "Cover removed",
                            description: "Cover photo removed. Don't forget to save your profile!",
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Profile Photo Section */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24 border-4 border-border">
                <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : formData.avatar_url ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </Button>
              </Label>
              {/* Reset to Google photo button - only show if user has Google avatar */}
              {user?.user_metadata?.avatar_url && formData.avatar_url !== user.user_metadata.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, avatar_url: user.user_metadata.avatar_url }));
                    toast({
                      title: "Photo restored",
                      description: "Reset to Google photo. Don't forget to save your profile!",
                    });
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Use Google Photo
                </Button>
              )}
              {formData.avatar_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, avatar_url: '' }));
                    toast({
                      title: "Photo removed",
                      description: "Profile photo removed. Don't forget to save your profile!",
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {!formData.avatar_url && user?.user_metadata?.avatar_url && (
              <p className="text-xs text-muted-foreground mt-2">
                Click "Use Google Photo" to restore your Google profile picture
              </p>
            )}
            {!formData.avatar_url && !user?.user_metadata?.avatar_url && (
              <p className="text-xs text-muted-foreground mt-2">
                Your initials will be shown if no photo is uploaded
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-foreground">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="about_me" className="text-foreground">About Me</Label>
              <Textarea
                id="about_me"
                value={formData.about_me}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                className="min-h-[100px]"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-lg font-semibold">Social Links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSocialPicker(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Social
              </Button>
            </div>
            
            {Object.keys(socialLinks).length > 0 ? (
              <div className="p-4 bg-accent/50 border border-border rounded-lg">
                <SocialLinksDisplay socialLinks={socialLinks} linkOrder={socialLinksOrder} />
                <p className="text-xs text-muted-foreground mt-3">
                  Click "Add Social" to add or remove links
                </p>
              </div>
            ) : (
              <div className="p-4 bg-accent/50 border border-border rounded-lg text-center">
                <p className="text-muted-foreground text-sm">
                  No social links added yet. Click "Add Social" to get started.
                </p>
              </div>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Privacy Settings</h3>
            
            <div className="flex items-center justify-between p-4 bg-accent/50 border border-border rounded-lg hover:bg-accent transition-all">
              <div className="flex-1">
                <label htmlFor="show_email" className="text-foreground text-sm font-medium">
                  Show email on profile
                </label>
                <p className="text-muted-foreground text-xs mt-1">
                  When enabled, your email address will be visible to other users on your profile
                </p>
              </div>
              <Switch
                id="show_email"
                checked={formData.show_email}
                onCheckedChange={(checked) => setFormData({ ...formData, show_email: checked })}
              />
            </div>

            <div className="p-4 bg-accent/50 border border-border rounded-lg hover:bg-accent transition-all">
              <Label htmlFor="commitment_visibility" className="text-foreground text-sm font-medium">
                Commitment Visibility
              </Label>
              <p className="text-muted-foreground text-xs mt-1 mb-3">
                Control who can see your weekly top 3 commitments
              </p>
              <Select
                value={formData.commitment_visibility}
                onValueChange={(value: 'private' | 'friends' | 'public') => 
                  setFormData({ ...formData, commitment_visibility: value })
                }
              >
                <SelectTrigger id="commitment_visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only me)</SelectItem>
                  <SelectItem value="friends">Friends only</SelectItem>
                  <SelectItem value="public">Public (Everyone)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gradient-primary shadow-elegant hover:shadow-lift transition-all duration-300"
              >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Social Link Picker Dialog */}
      <SocialLinkPicker
        open={showSocialPicker}
        onOpenChange={setShowSocialPicker}
        socialLinks={socialLinks}
        onSocialLinksChange={setSocialLinks}
        linkOrder={socialLinksOrder}
        onLinkOrderChange={setSocialLinksOrder}
      />
    </Card>
  );
};
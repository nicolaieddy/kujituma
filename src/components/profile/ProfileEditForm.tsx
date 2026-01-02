import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Upload, Save, X, Move, Trash2, RotateCcw, Eye, Edit3, Users, Globe, Plus, ImagePlus, Calendar, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CoverPhotoPositioner } from "./CoverPhotoPositioner";
import { ProfileStats } from "./ProfileStats";
import { ProfileGoals } from "./ProfileGoals";
import { SocialLinkPicker, SOCIAL_PLATFORMS } from "./SocialLinkPicker";
import { SocialLinksDisplay } from "./SocialLinksDisplay";
import { CountrySelect } from "@/components/ui/country-select";
import { CitySelect } from "@/components/ui/city-select";
import { Country } from "country-state-city";
import { formatTimeAgo } from "@/utils/timeUtils";

interface Profile {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  date_of_birth?: string;
  country?: string;
  city?: string;
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
  social_links_order?: string[];
  created_at: string;
  last_active_at?: string;
  is_profile_complete?: boolean;
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
  const { user, isNewUser, markProfileComplete } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewerType, setPreviewViewerType] = useState<'friend' | 'public'>('friend');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showSocialPicker, setShowSocialPicker] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(() => extractSocialLinks(profile));
  const [socialLinksOrder, setSocialLinksOrder] = useState<string[]>(() => profile.social_links_order || []);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(() => {
    // Find country code from country name
    const countries = Country.getAllCountries();
    const existingCountry = countries.find(c => c.name === profile.country);
    return {
      full_name: profile.full_name || '',
      about_me: profile.about_me || '',
      avatar_url: profile.avatar_url || '',
      cover_photo_url: profile.cover_photo_url || '',
      cover_photo_position: profile.cover_photo_position ?? 50,
      date_of_birth: profile.date_of_birth || '',
      country: profile.country || '',
      countryCode: existingCountry?.isoCode || '',
      city: profile.city || '',
    };
  });

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Full name is required and must be reasonable length
    const trimmedName = formData.full_name.trim();
    if (!trimmedName) {
      errors.full_name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      errors.full_name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.full_name = 'Name must be less than 100 characters';
    }
    
    // About me optional but has max length
    if (formData.about_me && formData.about_me.length > 500) {
      errors.about_me = 'About me must be less than 500 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle country change - clear city when country changes
  const handleCountryChange = (countryName: string, countryCode: string) => {
    setFormData(prev => ({
      ...prev,
      country: countryName,
      countryCode: countryCode,
      city: countryName !== prev.country ? '' : prev.city, // Clear city if country changed
    }));
  };
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
      formData.date_of_birth !== (profile.date_of_birth || '') ||
      formData.country !== (profile.country || '') ||
      formData.city !== (profile.city || '') ||
      linksChanged ||
      orderChanged
    );
  }, [formData, profile, socialLinks, socialLinksOrder]);

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    const fields = [
      { name: 'Photo', filled: !!formData.avatar_url },
      { name: 'Cover', filled: !!formData.cover_photo_url },
      { name: 'Name', filled: !!formData.full_name },
      { name: 'About', filled: !!formData.about_me },
      { name: 'Birthday', filled: !!formData.date_of_birth },
      { name: 'Location', filled: !!(formData.country || formData.city) },
      { name: 'Social links', filled: Object.keys(socialLinks).length > 0 },
    ];
    
    const filledCount = fields.filter(f => f.filled).length;
    const percentage = Math.round((filledCount / fields.length) * 100);
    const missing = fields.filter(f => !f.filled).map(f => f.name);
    
    return { percentage, missing, total: fields.length, filled: filledCount };
  }, [formData, socialLinks]);

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
    // Clear validation error for this field when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
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

  // Drag and drop handlers for cover photo
  const handleCoverDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(true);
  }, []);

  const handleCoverDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(false);
  }, []);

  const handleCoverDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please drop an image file.",
        variant: "destructive",
      });
      return;
    }

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
  }, [toast, uploadCoverPhoto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form before submitting
    if (!validateForm()) {
      toast({
        title: "Please fix errors",
        description: "Some required fields need your attention.",
        variant: "destructive",
      });
      return;
    }

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
          date_of_birth: formData.date_of_birth || null,
          country: formData.country || null,
          city: formData.city || null,
          is_profile_complete: true,
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

      // Mark profile as complete in auth context
      if (isNewUser) {
        markProfileComplete();
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
    full_name: formData.full_name,
    avatar_url: formData.avatar_url,
    cover_photo_url: formData.cover_photo_url,
    cover_photo_position: formData.cover_photo_position,
    about_me: formData.about_me,
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
        <CardTitle className="text-foreground font-heading text-2xl">
          {isNewUser ? 'Complete Your Profile' : 'Edit Profile'}
        </CardTitle>
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
        {/* Profile Completion Indicator */}
        {profileCompletion.percentage < 100 && (
          <div className="mb-6 p-4 bg-accent/50 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Profile Completion</span>
              <span className="text-sm font-semibold text-primary">{profileCompletion.percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${profileCompletion.percentage}%` }}
              />
            </div>
            {profileCompletion.missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Add {profileCompletion.missing.slice(0, 3).join(', ')}{profileCompletion.missing.length > 3 ? ` and ${profileCompletion.missing.length - 3} more` : ''} to complete your profile
              </p>
            )}
          </div>
        )}

        {isNewUser && (
          <div className="mb-6 p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-2">Welcome to Kujituma! 🎉</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Let's set up your profile so your friends and accountability partners can recognize you.
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                    <span><strong className="text-foreground">Full name</strong> — Required so others can find you</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                    <span><strong className="text-foreground">Profile photo</strong> — Helps people recognize you</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                    <span><strong className="text-foreground">About me</strong> — Share a bit about yourself</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-primary/10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={skipping}
                    onClick={async () => {
                      setSkipping(true);
                      try {
                        // Mark profile as complete in database
                        await supabase
                          .from('profiles')
                          .update({ is_profile_complete: true })
                          .eq('id', user?.id);
                        
                        // Mark profile as complete in auth context
                        markProfileComplete();
                        
                        toast({
                          title: "Welcome aboard!",
                          description: "You can complete your profile anytime from settings.",
                        });
                        
                        // Navigate to main app
                        navigate('/');
                      } catch (error) {
                        console.error('Skip error:', error);
                        toast({
                          title: "Something went wrong",
                          description: "Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setSkipping(false);
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {skipping ? 'Skipping...' : 'Skip for now'}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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
                className={`relative h-32 rounded-lg overflow-hidden transition-all ${
                  isDraggingCover 
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/10' 
                    : 'bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20'
                }`}
                style={formData.cover_photo_url && !isDraggingCover ? {
                  backgroundImage: `url(${formData.cover_photo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `center ${formData.cover_photo_position}%`
                } : undefined}
                onDragOver={handleCoverDragOver}
                onDragLeave={handleCoverDragLeave}
                onDrop={handleCoverDrop}
              >
                {isDraggingCover ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm font-medium">Drop image here</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 transition-opacity">
                    <div className="flex items-center gap-2">
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
                    <p className="text-xs text-white/70">or drag and drop an image</p>
                  </div>
                )}
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
              <Label htmlFor="full_name" className="text-foreground">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Your full name"
                required
                maxLength={100}
                className={validationErrors.full_name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {validationErrors.full_name && (
                <p className="text-xs text-destructive mt-1">{validationErrors.full_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="about_me" className="text-foreground">
                About Me <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="about_me"
                value={formData.about_me}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                className={`min-h-[100px] ${validationErrors.about_me ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              <div className="flex justify-between mt-1">
                {validationErrors.about_me ? (
                  <p className="text-xs text-destructive">{validationErrors.about_me}</p>
                ) : (
                  <span />
                )}
                <span className={`text-xs ${formData.about_me.length > 450 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {formData.about_me.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Private Information Section */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">Private Information</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Only visible to you</span>
            </div>

            <div>
              <Label htmlFor="date_of_birth" className="text-foreground">
                Date of Birth <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            {/* Location Fields */}
            <div className="space-y-2">
              <Label className="text-foreground">
                Location <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <CountrySelect
                  value={formData.country}
                  onChange={handleCountryChange}
                />
                <CitySelect
                  value={formData.city}
                  onChange={(value) => handleInputChange('city', value)}
                  countryCode={formData.countryCode}
                />
              </div>
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

          {/* Danger Zone - Account Deletion (only show for existing users, not during initial setup) */}
          {!isNewUser && (
            <div className="mt-8 pt-6 border-t border-destructive/30">
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-destructive">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}


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

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) setDeleteConfirmEmail('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete your account and all your data, including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Your profile and photos</li>
                <li>All goals, habits, and objectives</li>
                <li>All posts, comments, and reactions</li>
                <li>All friendships and partnerships</li>
                <li>All check-ins and planning sessions</li>
              </ul>
              <p className="font-medium text-foreground">
                This action is permanent and cannot be undone.
              </p>
              <div className="pt-2">
                <Label htmlFor="delete-confirm-email" className="text-foreground">
                  Type your email <span className="font-mono text-destructive">{user?.email}</span> to confirm:
                </Label>
                <Input
                  id="delete-confirm-email"
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteConfirmEmail !== user?.email || deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  const { error } = await supabase.rpc('delete_own_account');
                  
                  if (error) {
                    console.error('Delete account error:', error);
                    toast({
                      title: "Deletion failed",
                      description: error.message || "Failed to delete account. Please try again.",
                      variant: "destructive",
                    });
                    setDeleting(false);
                    return;
                  }

                  // Sign out and redirect
                  await supabase.auth.signOut();
                  toast({
                    title: "Account deleted",
                    description: "Your account and all data have been permanently deleted.",
                  });
                  navigate('/');
                } catch (error) {
                  console.error('Delete account error:', error);
                  toast({
                    title: "Deletion failed",
                    description: "An unexpected error occurred. Please try again.",
                    variant: "destructive",
                  });
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Permanently Delete Account'}
            </Button>
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
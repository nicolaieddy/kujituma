import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Upload, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface Profile {
  id: string;
  email?: string; // Optional - not all contexts have email
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  show_email?: boolean;
  commitment_visibility?: 'private' | 'friends' | 'public';
  created_at: string;
  last_active_at?: string;
}

interface ProfileEditFormProps {
  profile: Profile;
  onUpdate: (profile: Profile) => void;
  onCancel: () => void;
}

export const ProfileEditForm = ({ profile, onUpdate, onCancel }: ProfileEditFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    about_me: profile.about_me || '',
    linkedin_url: profile.linkedin_url || '',
    instagram_url: profile.instagram_url || '',
    tiktok_url: profile.tiktok_url || '',
    twitter_url: profile.twitter_url || '',
    avatar_url: profile.avatar_url || '',
    show_email: profile.show_email ?? false,
    commitment_visibility: profile.commitment_visibility || 'friends' as 'private' | 'friends' | 'public'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { data, error } = await supabase.storage
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
          linkedin_url: formData.linkedin_url,
          instagram_url: formData.instagram_url,
          tiktok_url: formData.tiktok_url,
          twitter_url: formData.twitter_url,
          avatar_url: formData.avatar_url,
          show_email: formData.show_email,
          commitment_visibility: formData.commitment_visibility,
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

  return (
    <Card className="max-w-2xl mx-auto border-border hover:border-primary/20 transition-all shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground text-center font-heading text-2xl">Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex justify-center">
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </span>
                </Button>
              </Label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
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

            <div>
              <Label htmlFor="linkedin_url" className="text-foreground">LinkedIn Profile</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <Label htmlFor="instagram_url" className="text-foreground">Instagram Profile</Label>
              <Input
                id="instagram_url"
                type="url"
                value={formData.instagram_url}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                placeholder="https://instagram.com/yourusername"
              />
            </div>

            <div>
              <Label htmlFor="tiktok_url" className="text-foreground">TikTok Profile</Label>
              <Input
                id="tiktok_url"
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                placeholder="https://tiktok.com/@yourusername"
              />
            </div>

            <div>
              <Label htmlFor="twitter_url" className="text-foreground">Twitter Profile</Label>
              <Input
                id="twitter_url"
                type="url"
                value={formData.twitter_url}
                onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                placeholder="https://twitter.com/yourusername"
              />
            </div>
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
              onClick={onCancel}
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
    </Card>
  );
};
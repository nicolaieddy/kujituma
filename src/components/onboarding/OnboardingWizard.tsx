import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GoalsService } from "@/services/goalsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Upload, ArrowRight, ArrowLeft, Check, CalendarIcon, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateGoalData, GoalTimeframe } from "@/types/goals";
import { format, parseISO, addMonths, endOfQuarter, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { CitySelect } from "@/components/ui/city-select";
import { Country } from "country-state-city";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingWizardProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string;
    about_me?: string;
    country?: string;
    city?: string;
  };
  onComplete: () => void;
}

const STEPS = [
  { id: 'profile', title: 'About You', description: 'Tell us a bit about yourself' },
  { id: 'goal', title: 'Your First Goal', description: 'What do you want to achieve?' },
];

export const OnboardingWizard = ({ profile, onComplete }: OnboardingWizardProps) => {
  const { user, markProfileComplete } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: profile.full_name || '',
    avatar_url: profile.avatar_url || '',
    about_me: profile.about_me || '',
    country: profile.country || '',
    countryCode: (() => {
      const countries = Country.getAllCountries();
      const existingCountry = countries.find(c => c.name === profile.country);
      return existingCountry?.isoCode || '';
    })(),
    city: profile.city || '',
  });

  // Goal form state
  const [goalData, setGoalData] = useState<CreateGoalData>({
    title: '',
    description: '',
    timeframe: 'Custom Date' as GoalTimeframe,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    target_date: '',
    category: '',
    visibility: 'public',
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

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
      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Photo uploaded",
        description: "Profile photo uploaded successfully!",
      });
    }
  };

  const handleCountryChange = (countryName: string, countryCode: string) => {
    setProfileData(prev => ({
      ...prev,
      country: countryName,
      countryCode: countryCode,
      city: countryName !== prev.country ? '' : prev.city,
    }));
  };

  const saveProfile = async () => {
    if (!user) return false;

    const trimmedName = profileData.full_name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast({
        title: "Name required",
        description: "Please enter your name (at least 2 characters).",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          avatar_url: profileData.avatar_url,
          about_me: profileData.about_me,
          country: profileData.country || null,
          city: profileData.city || null,
          is_profile_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        toast({
          title: "Update failed",
          description: "Failed to save profile. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Profile save error:', error);
      return false;
    }
  };

  const saveGoal = async () => {
    if (!goalData.title.trim()) {
      toast({
        title: "Goal title required",
        description: "Please enter a title for your goal.",
        variant: "destructive",
      });
      return false;
    }

    if (!goalData.target_date) {
      toast({
        title: "Target date required",
        description: "Please select a target date for your goal.",
        variant: "destructive",
      });
      return false;
    }

    try {
      await GoalsService.createGoal({
        title: goalData.title.trim(),
        description: goalData.description?.trim() || '',
        timeframe: 'Custom Date',
        start_date: goalData.start_date || undefined,
        target_date: goalData.target_date,
        category: goalData.category || undefined,
        visibility: goalData.visibility,
      });

      return true;
    } catch (error) {
      console.error('Goal creation error:', error);
      toast({
        title: "Failed to create goal",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleNext = async () => {
    setLoading(true);

    if (currentStep === 0) {
      // Save profile before moving to next step
      const success = await saveProfile();
      if (success) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      // Save goal and complete onboarding
      const success = await saveGoal();
      if (success) {
        markProfileComplete();
        // Clear any remaining signup flags
        sessionStorage.removeItem('is_new_signup');
        sessionStorage.removeItem('tos_accepted_during_signup');
        toast({
          title: "Welcome to Kujituma!",
          description: "Your profile and first goal have been set up.",
        });
        onComplete();
        navigate('/goals?tab=longterm');
      }
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipGoal = async () => {
    setLoading(true);
    // Just mark profile complete and go to goals
    markProfileComplete();
    // Clear any remaining signup flags
    sessionStorage.removeItem('is_new_signup');
    sessionStorage.removeItem('tos_accepted_during_signup');
    toast({
      title: "Welcome to Kujituma!",
      description: "You can add goals anytime from your dashboard.",
    });
    onComplete();
    navigate('/goals?tab=longterm');
    setLoading(false);
  };

  const datePresets = [
    { label: '1 month', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(addMonths(new Date(), 1), 'yyyy-MM-dd') }) },
    { label: '3 months', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(addMonths(new Date(), 3), 'yyyy-MM-dd') }) },
    { label: 'End of quarter', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(endOfQuarter(new Date()), 'yyyy-MM-dd') }) },
    { label: 'End of year', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(endOfYear(new Date()), 'yyyy-MM-dd') }) },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-4">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : index === 0 ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <CardTitle className="text-xl">{STEPS[currentStep].title}</CardTitle>
            <CardDescription className="mt-1">{STEPS[currentStep].description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 0 && (
                <div className="space-y-5">
                  {/* Avatar upload */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                        <AvatarImage src={profileData.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {profileData.full_name?.charAt(0)?.toUpperCase() || <User className="h-10 w-10" />}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                        <Upload className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <Label htmlFor="name" className="font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your name"
                      className="mt-1.5 h-11"
                    />
                  </div>

                  {/* About */}
                  <div>
                    <Label htmlFor="about" className="font-medium">About You</Label>
                    <Textarea
                      id="about"
                      value={profileData.about_me}
                      onChange={(e) => setProfileData(prev => ({ ...prev, about_me: e.target.value }))}
                      placeholder="A brief intro about yourself..."
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-medium">Country</Label>
                      <div className="mt-1.5">
                        <CountrySelect
                          value={profileData.country}
                          onChange={handleCountryChange}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium">City</Label>
                      <div className="mt-1.5">
                        <CitySelect
                          countryCode={profileData.countryCode}
                          value={profileData.city}
                          onChange={(city) => setProfileData(prev => ({ ...prev, city }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-5">
                  {/* Goal title */}
                  <div>
                    <Label htmlFor="goal-title" className="font-medium">What's your goal? *</Label>
                    <Input
                      id="goal-title"
                      value={goalData.title}
                      onChange={(e) => setGoalData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Run a marathon, Learn Spanish..."
                      className="mt-1.5 h-11"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="goal-description" className="font-medium">Why is this important?</Label>
                    <Textarea
                      id="goal-description"
                      value={goalData.description}
                      onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe why this goal matters to you..."
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Quick date presets */}
                  <div>
                    <Label className="font-medium">When do you want to achieve this?</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {datePresets.map((preset) => {
                        const presetDates = preset.getDates();
                        const isSelected = goalData.target_date === presetDates.target;
                        return (
                          <Button
                            key={preset.label}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setGoalData(prev => ({
                                ...prev,
                                start_date: presetDates.start,
                                target_date: presetDates.target
                              }));
                            }}
                          >
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom date picker */}
                  <div>
                    <Label className="font-medium">Or pick a custom date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full mt-1.5 justify-start text-left font-normal h-11",
                            !goalData.target_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {goalData.target_date ? format(parseISO(goalData.target_date), "PPP") : <span>Pick a target date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[300]" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2100}
                          selected={goalData.target_date ? parseISO(goalData.target_date) : undefined}
                          onSelect={(date) => setGoalData(prev => ({
                            ...prev,
                            target_date: date ? format(date, 'yyyy-MM-dd') : '',
                            start_date: prev.start_date || format(new Date(), 'yyyy-MM-dd')
                          }))}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            {currentStep > 0 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              {currentStep === 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkipGoal}
                  disabled={loading}
                >
                  Skip for now
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentStep === STEPS.length - 1 ? (
                  <>
                    Complete
                    <Check className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

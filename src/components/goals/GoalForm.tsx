
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Eye, EyeOff, Users } from "lucide-react";
import { CreateGoalData, GoalTimeframe, Goal, HabitItem, RecurrenceFrequency } from "@/types/goals";
import { HabitItemsEditor } from "./HabitItemsEditor";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORY_CONFIGS, CATEGORY_INTEGRATIONS, CustomCategoryIcon } from "@/types/customCategories";
import { CustomCategoriesService } from "@/services/customCategoriesService";
import { CustomGoalCategory } from "@/types/customCategories";
import { toast } from "@/hooks/use-toast";
import { format, addMonths, endOfQuarter, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { LanguageLearningIntegration } from "./LanguageLearningIntegration";

interface GoalFormProps {
  onSubmit: (data: CreateGoalData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Goal | null;
}


export const GoalForm = ({ onSubmit, onCancel, isLoading, initialData }: GoalFormProps) => {
  const isMobile = useIsMobile();
  const [customCategories, setCustomCategories] = useState<CustomGoalCategory[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState<CreateGoalData & { habit_items: HabitItem[] }>(() => {
    if (initialData) {
      return {
        title: initialData.title || '',
        description: initialData.description || '',
        timeframe: 'Custom Date' as GoalTimeframe,
        start_date: initialData.start_date || '',
        target_date: initialData.target_date || '',
        category: initialData.category || '',
        visibility: initialData.visibility ?? 'public',
        habit_items: initialData.habit_items || []
      };
    }
    return {
      title: '',
      description: '',
      timeframe: 'Custom Date' as GoalTimeframe,
      start_date: '',
      target_date: '',
      category: '',
      visibility: 'public',
      habit_items: []
    };
  });

  // Load custom categories
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const categories = await CustomCategoriesService.getCustomCategories();
        setCustomCategories(categories);
      } catch (error) {
        console.error('Error loading custom categories:', error);
      }
    };

    loadCustomCategories();
  }, []);

  // Initialize form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        timeframe: 'Custom Date' as GoalTimeframe,
        start_date: initialData.start_date || '',
        target_date: initialData.target_date || '',
        category: initialData.category || '',
        visibility: initialData.visibility ?? 'public',
        habit_items: initialData.habit_items || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        timeframe: 'Custom Date' as GoalTimeframe,
        start_date: '',
        target_date: '',
        category: '',
        visibility: 'public',
        habit_items: []
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // Require target date
    if (!formData.target_date) {
      toast({
        title: "Target Date Required",
        description: "Please select a target date for your goal.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that target date is after start date if both are provided
    if (formData.start_date && formData.target_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.target_date);
      if (endDate <= startDate) {
        toast({
          title: "Invalid Date Range",
          description: "Target date must be after the start date.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // When updating, we need to use a type that allows null for clearing values
    const submitData: any = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      timeframe: 'Custom Date',
      category: formData.category === 'none' ? '' : (formData.category?.trim() || ''),
      visibility: formData.visibility,
      habit_items: formData.habit_items || [],
      start_date: formData.start_date || null,
      target_date: formData.target_date
    };

    onSubmit(submitData);
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const newCategory = await CustomCategoriesService.createCustomCategory({
        name: newCategoryName.trim()
      });
      setCustomCategories([...customCategories, newCategory]);
      setFormData({ ...formData, category: newCategory.name });
      setNewCategoryName("");
      setShowAddCategory(false);
      toast({
        title: "Success",
        description: "Custom category created successfully!",
      });
    } catch (error) {
      console.error('Error creating custom category:', error);
      toast({
        title: "Error",
        description: "Failed to create custom category. It may already exist.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomCategory = async (categoryId: string, categoryName: string) => {
    try {
      await CustomCategoriesService.deleteCustomCategory(categoryId);
      setCustomCategories(customCategories.filter(cat => cat.id !== categoryId));
      // Clear category if it was selected
      if (formData.category === categoryName) {
        setFormData({ ...formData, category: '' });
      }
      toast({
        title: "Success",
        description: "Custom category deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting custom category:', error);
      toast({
        title: "Error",
        description: "Failed to delete custom category.",
        variant: "destructive",
      });
    }
  };

  const predefinedCategoryNames = CATEGORY_CONFIGS.map(c => c.name);
  
  const allCategories = [
    ...CATEGORY_CONFIGS.map(cat => ({ name: cat.name, isCustom: false })),
    ...customCategories.map(cat => ({ name: cat.name, isCustom: true, id: cat.id }))
  ];
  
  const knownCategoryNames = new Set<string>([
    ...predefinedCategoryNames,
    ...customCategories.map((c) => c.name)
  ]);
  const hasCurrentButMissing = !!formData.category && !knownCategoryNames.has(formData.category);

  return (
    <Card className={`w-full ${isMobile ? 'mx-4' : 'max-w-2xl mx-auto'} glass-card shadow-soft`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className={`text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {initialData ? 'Edit Goal' : 'Create New Goal'}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className={`${isMobile ? 'px-4 pb-4' : 'px-6 pb-6'}`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title" className="font-medium text-sm">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter your goal title..."
              className={`mt-1.5 ${
                isMobile ? 'h-12 text-base' : 'h-10'
              }`}
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="font-medium text-sm">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              className={`mt-1.5 resize-none ${
                isMobile ? 'text-base' : ''
              }`}
              rows={isMobile ? 3 : 4}
            />
          </div>

          {/* Quick Date Presets */}
          <div>
            <Label className="font-medium text-sm">Quick Presets</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {[
                { label: '1 month', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(addMonths(new Date(), 1), 'yyyy-MM-dd') }) },
                { label: '3 months', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(addMonths(new Date(), 3), 'yyyy-MM-dd') }) },
                { label: '6 months', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(addMonths(new Date(), 6), 'yyyy-MM-dd') }) },
                { label: 'End of quarter', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(endOfQuarter(new Date()), 'yyyy-MM-dd') }) },
                { label: 'End of year', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), target: format(endOfYear(new Date()), 'yyyy-MM-dd') }) },
              ].map((preset) => {
                const presetDates = preset.getDates();
                const isSelected = formData.start_date === presetDates.start && formData.target_date === presetDates.target;
                return (
                  <Button
                    key={preset.label}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs h-7 px-2.5 transition-all",
                      isSelected && "ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setFormData({ ...formData, start_date: presetDates.start, target_date: presetDates.target });
                    }}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-5' : 'grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="start_date" className="font-medium text-sm">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`mt-1.5 w-full ${isMobile ? 'h-12' : 'h-10'}`}
              />
              <p className="text-xs text-muted-foreground mt-1">When you'll start working on this goal</p>
            </div>
            <div>
              <Label htmlFor="target_date" className="font-medium text-sm">Target Date *</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                min={formData.start_date || undefined}
                className={`mt-1.5 w-full ${isMobile ? 'h-12' : 'h-10'}`}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">When you want to complete this goal</p>
            </div>
          </div>

          <div>
            <Label htmlFor="category" className="font-medium text-sm">Category</Label>
            <div className="mt-1.5 space-y-3">
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  if (value === "__add_custom__") {
                    setShowAddCategory(true);
                  } else {
                    setFormData({ ...formData, category: value });
                  }
                }}
              >
                <SelectTrigger className={`${
                  isMobile ? 'h-12' : 'h-10'
                }`}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  <SelectItem 
                    value="none" 
                    className="cursor-pointer"
                  >
                    No Category
                  </SelectItem>

                  {hasCurrentButMissing && (
                    <SelectItem 
                      value={formData.category} 
                      className="cursor-pointer"
                    >
                      {formData.category}
                    </SelectItem>
                  )}

                  {CATEGORY_CONFIGS.map((categoryConfig) => {
                    const IconComponent = categoryConfig.icon;
                    return (
                      <SelectItem 
                        key={categoryConfig.name} 
                        value={categoryConfig.name} 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          {categoryConfig.name}
                          {categoryConfig.integrationEmoji && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({categoryConfig.integrationEmoji})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                  {customCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                        Custom Categories
                      </div>
                      {customCategories.map((category) => (
                        <SelectItem 
                          key={category.id}
                          value={category.name} 
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <CustomCategoryIcon className="h-4 w-4 text-muted-foreground" />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <div className="border-t mt-1">
                    <SelectItem 
                      value="__add_custom__" 
                      className="text-primary font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Custom Category
                      </div>
                    </SelectItem>
                  </div>
                </SelectContent>
              </Select>

              {showAddCategory && (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name..."
                    className={`${
                      isMobile ? 'h-12 text-base' : 'h-10'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCategory();
                      } else if (e.key === 'Escape') {
                        setShowAddCategory(false);
                        setNewCategoryName("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomCategory}
                    disabled={!newCategoryName.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>


          <div className={`${isMobile ? 'p-4' : 'p-5'} bg-muted/50 rounded-lg border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {formData.visibility === 'public' ? (
                  <Eye className="h-5 w-5 text-foreground" />
                ) : formData.visibility === 'friends' ? (
                  <Users className="h-5 w-5 text-foreground" />
                ) : (
                  <EyeOff className="h-5 w-5 text-foreground" />
                )}
                <div>
                  <Label htmlFor="visibility" className="font-medium">
                    Goal Visibility
                  </Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    {formData.visibility === 'public' 
                      ? 'Visible on your public profile' 
                      : formData.visibility === 'friends'
                        ? 'Visible to friends only'
                        : 'Only visible to you'
                    }
                  </p>
                </div>
              </div>
              <Select
                value={formData.visibility}
                onValueChange={(value: 'public' | 'friends' | 'private') => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Friends
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language Learning Integration */}
          {formData.category === 'Language Learning' && (
            <LanguageLearningIntegration />
          )}

          {/* Habit Items Editor */}
          <div className={`${isMobile ? 'p-4' : 'p-5'} bg-muted/50 rounded-lg border`}>
            <HabitItemsEditor
              habitItems={formData.habit_items}
              onChange={(items) => setFormData({ ...formData, habit_items: items })}
              defaultFrequency="weekly"
            />
          </div>

          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row gap-3'} pt-2`}>
            <Button
              type="submit"
              disabled={!formData.title.trim() || isLoading}
              className={`${isMobile ? 'w-full h-12 text-base' : 'flex-1'} gradient-primary shadow-elegant hover:shadow-lift`}
            >
              {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Goal' : 'Create Goal')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className={`${isMobile ? 'w-full h-12 text-base' : ''}`}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

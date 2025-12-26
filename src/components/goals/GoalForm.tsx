
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Calendar, Eye, EyeOff, Plus, Trash2, RefreshCw } from "lucide-react";
import { CreateGoalData, GoalTimeframe, Goal, RecurrenceFrequency } from "@/types/goals";
import { useIsMobile } from "@/hooks/use-mobile";
import { PREDEFINED_CATEGORIES } from "@/types/customCategories";
import { CustomCategoriesService } from "@/services/customCategoriesService";
import { CustomGoalCategory } from "@/types/customCategories";
import { toast } from "@/hooks/use-toast";

interface GoalFormProps {
  onSubmit: (data: CreateGoalData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Goal | null;
}

const TIMEFRAME_OPTIONS: GoalTimeframe[] = [
  '1 Month',
  '3 Months', 
  'Quarter',
  '6 Months',
  'End of Year',
  'Custom Date'
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string; description?: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day of the week' },
  { value: 'weekdays', label: 'Every weekday', description: 'Monday to Friday' },
  { value: 'weekly', label: 'Weekly', description: 'Once every week' },
  { value: 'biweekly', label: 'Every 2 weeks', description: 'Once every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
  { value: 'monthly_last_week', label: 'Monthly (last week)', description: 'Last week of each month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Once per quarter' }
];

export const GoalForm = ({ onSubmit, onCancel, isLoading, initialData }: GoalFormProps) => {
  const isMobile = useIsMobile();
  const [customCategories, setCustomCategories] = useState<CustomGoalCategory[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState<CreateGoalData>(() => initialData ? {
    title: initialData.title || '',
    description: initialData.description || '',
    timeframe: initialData.timeframe || '1 Month',
    target_date: initialData.target_date || '',
    category: initialData.category || '',
    is_public: initialData.is_public ?? true,
    is_recurring: initialData.is_recurring ?? false,
    recurrence_frequency: initialData.recurrence_frequency || 'weekly',
    recurring_objective_text: initialData.recurring_objective_text || ''
  } : {
    title: '',
    description: '',
    timeframe: '1 Month',
    target_date: '',
    category: '',
    is_public: true,
    is_recurring: false,
    recurrence_frequency: 'weekly',
    recurring_objective_text: ''
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
        timeframe: initialData.timeframe || '1 Month',
        target_date: initialData.target_date || '',
        category: initialData.category || '',
        is_public: initialData.is_public ?? true,
        is_recurring: initialData.is_recurring ?? false,
        recurrence_frequency: initialData.recurrence_frequency || 'weekly',
        recurring_objective_text: initialData.recurring_objective_text || ''
      });
    } else {
      // Reset form for new goal
      setFormData({
        title: '',
        description: '',
        timeframe: '1 Month',
        target_date: '',
        category: '',
        is_public: true,
        is_recurring: false,
        recurrence_frequency: 'weekly',
        recurring_objective_text: ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    const submitData: CreateGoalData = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      timeframe: formData.timeframe,
      category: formData.category === 'none' ? '' : (formData.category?.trim() || ''),
      is_public: formData.is_public,
      is_recurring: formData.is_recurring,
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : undefined,
      recurring_objective_text: formData.is_recurring && formData.recurring_objective_text?.trim() 
        ? formData.recurring_objective_text.trim() 
        : undefined
    };

    // Only include target_date if timeframe is Custom Date and date is provided
    if (formData.timeframe === 'Custom Date' && formData.target_date) {
      submitData.target_date = formData.target_date;
    }

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

  const allCategories = [
    ...PREDEFINED_CATEGORIES.map(cat => ({ name: cat, isCustom: false })),
    ...customCategories.map(cat => ({ name: cat.name, isCustom: true, id: cat.id }))
  ];
  
  const knownCategoryNames = new Set<string>([
    ...PREDEFINED_CATEGORIES,
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

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-5' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="timeframe" className="font-medium text-sm">Timeframe *</Label>
              <Select
                value={formData.timeframe}
                onValueChange={(value: GoalTimeframe) => setFormData({ ...formData, timeframe: value })}
              >
                <SelectTrigger className={`mt-1.5 ${
                  isMobile ? 'h-12' : 'h-10'
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option} 
                      value={option} 
                      className="cursor-pointer"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.timeframe === 'Custom Date' && (
              <div>
                <Label htmlFor="target_date" className="font-medium text-sm">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className={`mt-1.5 ${
                    isMobile ? 'h-12' : 'h-10'
                  }`}
                />
              </div>
            )}
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
                <SelectContent className="z-50">
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

                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category} 
                      className="cursor-pointer"
                    >
                      {category}
                    </SelectItem>
                  ))}
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
                          {category.name}
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

          {/* Recurring Objectives Section */}
          <div className={`${isMobile ? 'p-4' : 'p-5'} bg-muted/50 rounded-lg border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className={`h-5 w-5 ${formData.is_recurring ? 'text-primary' : 'text-foreground'}`} />
                <div>
                  <Label htmlFor="is_recurring" className="font-medium">
                    Recurring Objectives
                  </Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    Auto-create weekly objectives for this goal
                  </p>
                </div>
              </div>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            {formData.is_recurring && (
              <div className="mt-4 space-y-4 pl-8">
                <div>
                  <Label htmlFor="recurrence_frequency" className="font-medium text-sm">Frequency</Label>
                  <Select
                    value={formData.recurrence_frequency}
                    onValueChange={(value: RecurrenceFrequency) => 
                      setFormData({ ...formData, recurrence_frequency: value })
                    }
                  >
                    <SelectTrigger className={`mt-1.5 ${isMobile ? 'h-12' : 'h-10'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {RECURRENCE_OPTIONS.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurring_objective_text" className="font-medium text-sm">
                    Objective Text <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="recurring_objective_text"
                    value={formData.recurring_objective_text}
                    onChange={(e) => setFormData({ ...formData, recurring_objective_text: e.target.value })}
                    placeholder={formData.title || "Uses goal title if empty"}
                    className={`mt-1.5 ${isMobile ? 'h-12 text-base' : 'h-10'}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The text that will appear as your weekly objective
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={`${isMobile ? 'p-4' : 'p-5'} bg-muted/50 rounded-lg border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {formData.is_public ? (
                  <Eye className="h-5 w-5 text-foreground" />
                ) : (
                  <EyeOff className="h-5 w-5 text-foreground" />
                )}
                <div>
                  <Label htmlFor="is_public" className="font-medium">
                    {formData.is_public ? 'Public Goal' : 'Private Goal'}
                  </Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    {formData.is_public 
                      ? 'Visible on your public profile' 
                      : 'Only visible to you'
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
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

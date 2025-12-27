
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, CalendarIcon, Plus, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { CreateGoalData, GoalTimeframe, Goal, RecurrenceFrequency, HabitItem } from "@/types/goals";
import { useIsMobile } from "@/hooks/use-mobile";
import { PREDEFINED_CATEGORIES } from "@/types/customCategories";
import { CustomCategoriesService } from "@/services/customCategoriesService";
import { CustomGoalCategory } from "@/types/customCategories";
import { toast } from "@/hooks/use-toast";
import { HabitItemsEditor } from "./HabitItemsEditor";
import { format, parseISO, addMonths, endOfQuarter, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

interface GoalFormProps {
  onSubmit: (data: CreateGoalData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Goal | null;
}

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string; description?: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day of the week' },
  { value: 'weekdays', label: 'Every weekday', description: 'Monday to Friday' },
  { value: 'weekly', label: 'Weekly', description: 'Once every week' },
  { value: 'biweekly', label: 'Every 2 weeks', description: 'Once every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
  { value: 'monthly_last_week', label: 'Monthly (last week)', description: 'Last week of each month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Once per quarter' }
];

const getFrequencyPreview = (frequency: RecurrenceFrequency | undefined, hasHabitItems: boolean): string => {
  switch (frequency) {
    case 'daily':
      return hasHabitItems 
        ? 'Track daily with checkboxes — no weekly objective created'
        : 'Creates an objective every week for daily practice';
    case 'weekdays':
      return hasHabitItems 
        ? 'Track Mon-Fri with checkboxes — no weekly objective created'
        : 'Creates an objective every week for weekday practice (Mon-Fri)';
    case 'weekly':
      return 'Creates a weekly task every Monday';
    case 'biweekly':
      return 'Creates a task every other Monday';
    case 'monthly':
      return 'Creates a task on the first week of each month';
    case 'monthly_last_week':
      return 'Creates a task on the last week of each month';
    case 'quarterly':
      return 'Creates a task at the start of each quarter (Jan, Apr, Jul, Oct)';
    default:
      return 'Creates a weekly task every Monday';
  }
};

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
        is_public: initialData.is_public ?? true,
        is_recurring: initialData.is_recurring ?? false,
        recurrence_frequency: initialData.recurrence_frequency || 'weekly',
        recurring_objective_text: initialData.recurring_objective_text || '',
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
      is_public: true,
      is_recurring: false,
      recurrence_frequency: 'weekly',
      recurring_objective_text: '',
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
        is_public: initialData.is_public ?? true,
        is_recurring: initialData.is_recurring ?? false,
        recurrence_frequency: initialData.recurrence_frequency || 'weekly',
        recurring_objective_text: initialData.recurring_objective_text || '',
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
        is_public: true,
        is_recurring: false,
        recurrence_frequency: 'weekly',
        recurring_objective_text: '',
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
      is_public: formData.is_public,
      is_recurring: formData.is_recurring,
      // Explicitly set to null if not recurring to clear any existing value
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      recurring_objective_text: formData.is_recurring && formData.recurring_objective_text?.trim() 
        ? formData.recurring_objective_text.trim() 
        : null,
      habit_items: formData.is_recurring ? formData.habit_items : [],
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
              <Label className="font-medium text-sm">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full mt-1.5 justify-start text-left font-normal",
                      isMobile ? 'h-12' : 'h-10',
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(parseISO(formData.start_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2100}
                    selected={formData.start_date ? parseISO(formData.start_date) : undefined}
                    defaultMonth={formData.start_date ? parseISO(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">When you'll start working on this goal</p>
            </div>
            <div>
              <Label className="font-medium text-sm">Target Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full mt-1.5 justify-start text-left font-normal",
                      isMobile ? 'h-12' : 'h-10',
                      !formData.target_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.target_date ? format(parseISO(formData.target_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2100}
                    selected={formData.target_date ? parseISO(formData.target_date) : undefined}
                    defaultMonth={formData.target_date ? parseISO(formData.target_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, target_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
                    Recurring Activities
                  </Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    Track habits and/or auto-create objectives
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
                {/* Habit Items Editor - always shown when recurring is enabled */}
                <HabitItemsEditor
                  habitItems={formData.habit_items}
                  onChange={(items) => setFormData({ ...formData, habit_items: items })}
                  defaultFrequency="weekly"
                />
                
                {formData.habit_items.length > 0 && (
                  <div className="text-xs text-muted-foreground bg-background/50 rounded-md p-3 space-y-1">
                    <p className="font-medium">How it works:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>All activities are tracked with checkboxes</li>
                      <li>Toggle "Auto-create objective" to also generate weekly objectives</li>
                    </ul>
                  </div>
                )}

                {/* Legacy: Keep frequency selector for backward compatibility with recurring_objective_text */}
                {formData.habit_items.length === 0 && (
                  <>
                    <div>
                      <Label htmlFor="recurrence_frequency" className="font-medium text-sm">Default Frequency</Label>
                      <Select
                        value={formData.recurrence_frequency}
                        onValueChange={(value: RecurrenceFrequency) => 
                          setFormData({ ...formData, recurrence_frequency: value })
                        }
                      >
                        <SelectTrigger className={`mt-1.5 ${isMobile ? 'h-12' : 'h-10'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[300]">
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
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {getFrequencyPreview(formData.recurrence_frequency, false)}
                      </p>
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
                        The text that will appear as your periodic objective
                      </p>
                    </div>
                  </>
                )}
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

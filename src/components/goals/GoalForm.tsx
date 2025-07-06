
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Calendar, Eye, EyeOff } from "lucide-react";
import { CreateGoalData, GoalTimeframe, Goal } from "@/types/goals";

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

export const GoalForm = ({ onSubmit, onCancel, isLoading, initialData }: GoalFormProps) => {
  const [formData, setFormData] = useState<CreateGoalData>({
    title: '',
    description: '',
    timeframe: '1 Month',
    target_date: '',
    category: '',
    notes: '',
    is_public: true
  });

  // Initialize form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        timeframe: initialData.timeframe || '1 Month',
        target_date: initialData.target_date || '',
        category: initialData.category || '',
        notes: initialData.notes || '',
        is_public: initialData.is_public ?? true
      });
    } else {
      // Reset form for new goal
      setFormData({
        title: '',
        description: '',
        timeframe: '1 Month',
        target_date: '',
        category: '',
        notes: '',
        is_public: true
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
      category: formData.category?.trim() || '',
      notes: formData.notes?.trim() || '',
      is_public: formData.is_public
    };

    // Only include target_date if timeframe is Custom Date and date is provided
    if (formData.timeframe === 'Custom Date' && formData.target_date) {
      submitData.target_date = formData.target_date;
    }

    onSubmit(submitData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">
          {initialData ? 'Edit Goal' : 'Create New Goal'}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter your goal title..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeframe" className="text-white">Timeframe *</Label>
              <Select
                value={formData.timeframe}
                onValueChange={(value: GoalTimeframe) => setFormData({ ...formData, timeframe: value })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.timeframe === 'Custom Date' && (
              <div>
                <Label htmlFor="target_date" className="text-white">Target Date</Label>
                <div className="relative">
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="category" className="text-white">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Health, Career, Learning..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-white">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes or details..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              {formData.is_public ? (
                <Eye className="h-5 w-5 text-white" />
              ) : (
                <EyeOff className="h-5 w-5 text-white" />
              )}
              <div>
                <Label htmlFor="is_public" className="text-white font-medium">
                  {formData.is_public ? 'Public Goal' : 'Private Goal'}
                </Label>
                <p className="text-sm text-white/60">
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

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!formData.title.trim() || isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Goal' : 'Create Goal')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

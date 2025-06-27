
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WeeklyProgressFormProps {
  onSubmit: (data: WeeklyProgressData) => void;
  onCancel: () => void;
}

interface WeeklyProgressData {
  name: string;
  weekNumber: number;
  year: number;
  lastWeekAccomplishments: string;
  thisWeekObjectives: string[];
  blockers: string;
}

const WeeklyProgressForm = ({ onSubmit, onCancel }: WeeklyProgressFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<WeeklyProgressData>({
    name: "",
    weekNumber: 0,
    year: 0,
    lastWeekAccomplishments: "",
    thisWeekObjectives: [""],
    blockers: ""
  });

  // Calculate current week number
  useEffect(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    
    setFormData(prev => ({
      ...prev,
      weekNumber,
      year: now.getFullYear(),
      name: user?.user_metadata?.full_name || user?.email || ""
    }));
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty objectives
    const filteredObjectives = formData.thisWeekObjectives.filter(obj => obj.trim() !== "");
    
    if (!formData.name.trim() || filteredObjectives.length === 0) {
      return;
    }
    
    onSubmit({
      ...formData,
      thisWeekObjectives: filteredObjectives
    });
  };

  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      thisWeekObjectives: [...prev.thisWeekObjectives, ""]
    }));
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      thisWeekObjectives: prev.thisWeekObjectives.filter((_, i) => i !== index)
    }));
  };

  const updateObjective = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      thisWeekObjectives: prev.thisWeekObjectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Share Your Weekly Progress</CardTitle>
        <div className="flex items-center gap-2 text-white/80">
          <Calendar className="h-4 w-4" />
          <span>Week {formData.weekNumber}, {formData.year}</span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-white font-medium">
              Your Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              placeholder="Enter your name"
              readOnly={!!user}
            />
          </div>

          <div>
            <Label htmlFor="lastWeek" className="text-white font-medium">
              🎉 What did you get done last week?
            </Label>
            <Textarea
              id="lastWeek"
              value={formData.lastWeekAccomplishments}
              onChange={(e) => setFormData(prev => ({ ...prev, lastWeekAccomplishments: e.target.value }))}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
              placeholder="Share your accomplishments from last week..."
            />
          </div>

          <div>
            <Label className="text-white font-medium">
              🎯 What are you getting done this week?
            </Label>
            <div className="mt-2 space-y-3">
              {formData.thisWeekObjectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Checkbox 
                    disabled 
                    className="border-white/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                  />
                  <Input
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    placeholder="Enter an objective for this week..."
                  />
                  {formData.thisWeekObjectives.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObjective(index)}
                      className="text-white/60 hover:text-white hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addObjective}
                className="border-white/20 text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Objective
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="blockers" className="text-white font-medium">
              🤝 Any blockers or requests for help?
            </Label>
            <Textarea
              id="blockers"
              value={formData.blockers}
              onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
              placeholder="Any challenges or areas where you need support?"
            />
          </div>

          <div className="flex space-x-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex-1"
            >
              Share Progress
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-white/20 text-black hover:bg-white/10 bg-white"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default WeeklyProgressForm;

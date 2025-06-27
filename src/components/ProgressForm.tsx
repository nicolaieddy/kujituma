
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressPostType } from "@/types/progress";
import { useAuth } from "@/contexts/AuthContext";

interface ProgressFormProps {
  onSubmit: (data: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => void;
  onCancel: () => void;
}

const ProgressForm = ({ onSubmit, onCancel }: ProgressFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    accomplishments: "",
    priorities: "",
    help: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-populate name from authenticated user
  useEffect(() => {
    if (user) {
      const userName = user.user_metadata?.full_name || user.email || "";
      setFormData(prev => ({ ...prev, name: userName }));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
      setFormData({
        name: user?.user_metadata?.full_name || user?.email || "",
        accomplishments: "",
        priorities: "",
        help: ""
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: string) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      // Add bullet point
      const newValue = value.substring(0, start) + '\n• ' + value.substring(end);
      handleChange(field, newValue);
      
      // Set cursor position after the bullet
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Share Your Weekly Progress</CardTitle>
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
              onChange={(e) => handleChange("name", e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              placeholder="Enter your name"
              readOnly={!!user}
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="accomplishments" className="text-white font-medium">
              🎉 This Week's Accomplishments
            </Label>
            <p className="text-white/60 text-xs mt-1 mb-2">
              Press Ctrl+Enter (Cmd+Enter on Mac) to add bullet points
            </p>
            <Textarea
              id="accomplishments"
              value={formData.accomplishments}
              onChange={(e) => handleChange("accomplishments", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "accomplishments")}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
              placeholder="What did you achieve this week? Share your wins, big or small..."
            />
          </div>

          <div>
            <Label htmlFor="priorities" className="text-white font-medium">
              🎯 Next Week's Priorities
            </Label>
            <p className="text-white/60 text-xs mt-1 mb-2">
              Press Ctrl+Enter (Cmd+Enter on Mac) to add bullet points
            </p>
            <Textarea
              id="priorities"
              value={formData.priorities}
              onChange={(e) => handleChange("priorities", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "priorities")}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
              placeholder="What are your main goals for next week?"
            />
          </div>

          <div>
            <Label htmlFor="help" className="text-white font-medium">
              🤝 Where You Need Help
            </Label>
            <p className="text-white/60 text-xs mt-1 mb-2">
              Press Ctrl+Enter (Cmd+Enter on Mac) to add bullet points
            </p>
            <Textarea
              id="help"
              value={formData.help}
              onChange={(e) => handleChange("help", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "help")}
              className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
              placeholder="Any blockers or areas where you could use support or advice?"
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

export default ProgressForm;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressPostType } from "@/types/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";

interface ProgressFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<ProgressPostType, "id" | "timestamp" | "comments" | "likes" | "user_liked">) => void;
}

export const ProgressFormDrawer = ({ open, onOpenChange, onSubmit }: ProgressFormDrawerProps) => {
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
      onOpenChange(false);
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl">Share Your Weekly Progress</DrawerTitle>
              <DrawerDescription className="text-sm">
                Tell the community about your accomplishments and goals
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground font-medium text-sm">
                Your Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="mt-1.5"
                placeholder="Enter your name"
                readOnly={!!user}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="accomplishments" className="text-foreground font-medium text-sm">
                🎉 This Week's Accomplishments
              </Label>
              <p className="text-muted-foreground text-xs mt-1 mb-1.5">
                Press Ctrl+Enter to add bullet points
              </p>
              <Textarea
                id="accomplishments"
                value={formData.accomplishments}
                onChange={(e) => handleChange("accomplishments", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "accomplishments")}
                className="min-h-[80px]"
                placeholder="What did you achieve this week?"
              />
            </div>

            <div>
              <Label htmlFor="priorities" className="text-foreground font-medium text-sm">
                🎯 Next Week's Priorities
              </Label>
              <p className="text-muted-foreground text-xs mt-1 mb-1.5">
                Press Ctrl+Enter to add bullet points
              </p>
              <Textarea
                id="priorities"
                value={formData.priorities}
                onChange={(e) => handleChange("priorities", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "priorities")}
                className="min-h-[80px]"
                placeholder="What are your main goals for next week?"
              />
            </div>

            <div>
              <Label htmlFor="help" className="text-foreground font-medium text-sm">
                🤝 Where You Need Help
              </Label>
              <p className="text-muted-foreground text-xs mt-1 mb-1.5">
                Press Ctrl+Enter to add bullet points
              </p>
              <Textarea
                id="help"
                value={formData.help}
                onChange={(e) => handleChange("help", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "help")}
                className="min-h-[80px]"
                placeholder="Any blockers or areas where you need support?"
              />
            </div>
          </form>
        </div>

        <DrawerFooter className="border-t border-border pt-4">
          <Button onClick={handleSubmit} className="w-full">
            Share Progress
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

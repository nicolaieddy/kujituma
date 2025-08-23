import { Card } from "@/components/ui/card";
import { CheckCircle, Target, Users, TrendingUp, Calendar, Heart } from "lucide-react";
export const LandingFeatures = () => {
  const features = [{
    icon: Calendar,
    title: "Weekly Planning",
    description: "Structure your week with clear objectives and daily focus areas that align with your bigger goals."
  }, {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Visualize your journey with detailed analytics and celebrate every milestone along the way."
  }, {
    icon: Users,
    title: "Community Support",
    description: "Share your wins, get encouragement, and stay motivated with a community of goal-getters."
  }, {
    icon: Target,
    title: "Goal Management",
    description: "Break down ambitious goals into manageable weekly objectives that compound into success."
  }, {
    icon: CheckCircle,
    title: "Accountability",
    description: "Weekly check-ins and reflection tools keep you honest and help you course-correct quickly."
  }, {
    icon: Heart,
    title: "Habit Building",
    description: "Transform goals into sustainable habits with consistent daily actions and positive reinforcement."
  }];
  return <section className="py-20 px-4 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {})}
        </div>
      </div>
    </section>;
};
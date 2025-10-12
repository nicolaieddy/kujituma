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
  return <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="space-y-3">
                <Icon className="h-10 w-10 text-primary" />
                <h3 className="font-semibold text-lg text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>;
};
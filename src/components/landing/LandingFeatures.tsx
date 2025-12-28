import { Target, Flame, BookOpen, Users } from "lucide-react";

export const LandingFeatures = () => {
  return (
    <div className="py-24 px-4">
      {/* Feature Grid */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <FeatureItem 
            icon={Target}
            title="Plan"
            description="Weekly objectives tied to longer-term goals"
          />
          <FeatureItem 
            icon={Flame}
            title="Track"
            description="Daily habits with streaks"
          />
          <FeatureItem 
            icon={BookOpen}
            title="Reflect"
            description="Weekly planning, daily check-ins, quarterly reviews"
          />
          <FeatureItem 
            icon={Users}
            title="Share"
            description="Progress visible to trusted people"
          />
        </div>
      </section>
    </div>
  );
};

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FeatureItem = ({ icon: Icon, title, description }: FeatureItemProps) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
      <Icon className="w-6 h-6 text-foreground" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

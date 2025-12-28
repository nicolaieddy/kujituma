import { Target, Flame, BookOpen, Users } from "lucide-react";

export const LandingFeatures = () => {
  return (
    <div className="py-8 px-4 mt-4">
      {/* Feature Grid */}
      <section className="max-w-3xl mx-auto">
        <div className="flex flex-col gap-5 items-center">
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
  <div className="flex flex-col items-center text-center gap-1.5 group max-w-xs">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-sm text-foreground/70">{description}</p>
  </div>
);

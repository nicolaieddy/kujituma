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
  <div className="flex items-center gap-3 group w-80">
    <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
      <Icon className="w-5 h-5 text-foreground" />
    </div>
    <div className="flex flex-col justify-center">
      <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
      <p className="text-xs text-foreground/70 leading-tight">{description}</p>
    </div>
  </div>
);

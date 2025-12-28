import { Target, Flame, BookOpen, Users } from "lucide-react";

export const LandingFeatures = () => {
  return (
    <div className="py-12 px-4">
      {/* Feature Grid */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <FeatureItem 
            icon={Target}
            title="Plan"
            description="Weekly objectives tied to longer-term goals"
            color="text-amber-600"
          />
          <FeatureItem 
            icon={Flame}
            title="Track"
            description="Daily habits with streaks"
            color="text-orange-500"
          />
          <FeatureItem 
            icon={BookOpen}
            title="Reflect"
            description="Weekly planning, daily check-ins, quarterly reviews"
            color="text-emerald-600"
          />
          <FeatureItem 
            icon={Users}
            title="Share"
            description="Progress visible to trusted people"
            color="text-sky-600"
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
  color: string;
}

const FeatureItem = ({ icon: Icon, title, description, color }: FeatureItemProps) => (
  <div className="flex items-start gap-4 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-foreground/70">{description}</p>
    </div>
  </div>
);

import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onGetStarted: () => void;
}

export const LandingHero = ({
  onGetStarted
}: LandingHeroProps) => {
  return (
    <section className="relative pt-32 pb-24 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <div className="space-y-8">
          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground font-serif text-balance">
              One Step at a Time.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Inspired by Kilimanjaro. Track your weekly progress, stay accountable, and achieve your goals.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="text-base px-8 py-6 gradient-primary shadow-elegant hover:shadow-lift transition-all duration-300"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div className="mt-24 max-w-6xl mx-auto">
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-border shadow-elegant">
          <img 
            src="/kilimanjaro-background.jpg" 
            alt="Mount Kilimanjaro"
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};
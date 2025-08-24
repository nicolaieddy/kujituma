import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onGetStarted: () => void;
}

export const LandingHero = ({
  onGetStarted
}: LandingHeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Kilimanjaro Landscape Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(/lovable-uploads/523e8b02-f224-47fa-94f0-11361fe7b2b8.png)`
      }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>
      
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <div className="space-y-12">
          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="text-white drop-shadow-2xl">One Step at a Time.</span>
            </h1>
            <p className="text-2xl md:text-3xl text-white/90 font-light leading-relaxed drop-shadow-lg">
              Inspired by Kilimanjaro.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="text-xl px-12 py-8 bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-white/20"
            >
              Kujituma
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
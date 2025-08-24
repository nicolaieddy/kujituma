import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onGetStarted: () => void;
}

export const LandingHero = ({
  onGetStarted
}: LandingHeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Mt Kilimanjaro Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{
        backgroundImage: `url(/kilimanjaro-background.jpg)`
      }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80"></div>
      
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <div className="space-y-12">
          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">One Step at a Time.</span>
            </h1>
            <p className="text-2xl md:text-3xl text-white/80 font-light leading-relaxed">
              Inspired by Kilimanjaro.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="text-xl px-12 py-8 bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              Kujituma
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
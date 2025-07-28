import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface LandingHeroProps {
  onGetStarted: () => void;
}
export const LandingHero = ({
  onGetStarted
}: LandingHeroProps) => {
  return <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Mt Kilimanjaro Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{
      backgroundImage: `url(/kilimanjaro-background.jpg)`
    }}></div>
      <div className="absolute inset-0 bg-gradient-background/80"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center space-y-8">
          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
              <span className="bg-gradient-primary bg-clip-text text-transparent">One Step at a Time.</span>
              <br />
              <span className="text-foreground">Together.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">Like climbing Kilimanjaro, every great summit happens with support from your circle.</p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={onGetStarted} size="lg" className="text-lg px-8 py-6 bg-gradient-primary hover:opacity-90 transition-opacity">Kujituma</Button>
            
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            
          </div>
        </div>
      </div>
    </section>;
};
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import kilimanjaroBackground from "@/assets/kilimanjaro-background.jpg";

interface LandingHeroProps {
  onGetStarted: () => void;
}

export const LandingHero = ({ onGetStarted }: LandingHeroProps) => {
  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Mt Kilimanjaro Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${kilimanjaroBackground})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-background/80"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center space-y-8">
          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Transform Goals
              </span>
              <br />
              <span className="text-foreground">Into Achievements</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Like climbing Kilimanjaro, every great achievement starts with a single step. 
              Join thousands who've turned their aspirations into reality with structured weekly planning, 
              progress tracking, and community accountability.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              Start Your Journey
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 border-primary/20 hover:bg-primary/10"
            >
              Watch Demo
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            <Card className="p-8 bg-gradient-card border-primary/20 backdrop-blur-sm relative overflow-hidden max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
              <div className="relative grid md:grid-cols-3 gap-6">
                {/* Weekly Planning Preview */}
                <div className="space-y-3">
                  <div className="h-4 bg-primary/30 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary/40 rounded"></div>
                    <div className="h-3 bg-secondary/40 rounded w-5/6"></div>
                    <div className="h-3 bg-secondary/40 rounded w-4/6"></div>
                  </div>
                </div>

                {/* Progress Tracking Preview */}
                <div className="space-y-3">
                  <div className="h-4 bg-primary/30 rounded w-2/3"></div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-secondary rounded-full"></div>
                      <div className="h-2 bg-muted-foreground/30 rounded flex-1"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-secondary rounded-full"></div>
                      <div className="h-2 bg-muted-foreground/30 rounded flex-1"></div>
                    </div>
                  </div>
                </div>

                {/* Community Preview */}
                <div className="space-y-3">
                  <div className="h-4 bg-primary/30 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-accent rounded-full"></div>
                      <div className="h-2 bg-muted-foreground/30 rounded flex-1"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-accent rounded-full"></div>
                      <div className="h-2 bg-muted-foreground/30 rounded flex-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
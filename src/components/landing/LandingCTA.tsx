import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LandingCTAProps {
  onGetStarted: () => void;
}

export const LandingCTA = ({
  onGetStarted
}: LandingCTAProps) => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <div className="p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Ready?</h2>
            
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="text-lg px-10 py-6 bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              Start Your Journey
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};
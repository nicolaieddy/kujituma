import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface LandingCTAProps {
  onGetStarted: () => void;
}
export const LandingCTA = ({
  onGetStarted
}: LandingCTAProps) => {
  return <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <div className="p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-muted-foreground mb-6">Join me on this journey.</p>
        <Button onClick={onGetStarted} size="lg" className="bg-primary hover:bg-primary/90">
          Start Your Journey
        </Button>
      </div>
    </Card>;
};
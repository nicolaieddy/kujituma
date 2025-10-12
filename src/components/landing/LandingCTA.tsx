import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface LandingCTAProps {
  onGetStarted: () => void;
}
export const LandingCTA = ({
  onGetStarted
}: LandingCTAProps) => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join our community and turn your weekly goals into lasting achievements.
          </p>
          <div className="pt-2">
            <Button 
              onClick={onGetStarted}
              size="lg"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
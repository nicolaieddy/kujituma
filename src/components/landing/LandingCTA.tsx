import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LandingCTAProps {
  onGetStarted: () => void;
}

export const LandingCTA = ({ onGetStarted }: LandingCTAProps) => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 md:p-12 bg-gradient-primary text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative space-y-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                Ready to Transform Your Goals?
              </h2>
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Join thousands of achievers who've turned their dreams into reality. 
                Start your journey today—it's completely free.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={onGetStarted}
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 bg-background text-foreground hover:bg-background/90"
              >
                Start Your Journey Now
              </Button>
              <div className="text-sm text-primary-foreground/80">
                No credit card required • Free forever
              </div>
            </div>

            <div className="pt-6 space-y-2 text-primary-foreground/80">
              <div className="flex justify-center items-center gap-6 text-sm">
                <span>✓ Weekly planning tools</span>
                <span>✓ Progress tracking</span>
                <span>✓ Community support</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
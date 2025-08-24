import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface LandingCTAProps {
  onGetStarted: () => void;
}
export const LandingCTA = ({
  onGetStarted
}: LandingCTAProps) => {
  return (
    <section className="py-24 bg-white/5 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-12">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join our community and turn your weekly goals into lasting achievements.
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold"
          >
            Get Started Today
          </Button>
        </Card>
      </div>
    </section>
  );
};
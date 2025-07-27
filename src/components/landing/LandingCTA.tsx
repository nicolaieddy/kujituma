import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface LandingCTAProps {
  onGetStarted: () => void;
}
export const LandingCTA = ({
  onGetStarted
}: LandingCTAProps) => {
  return (
    <Card className="p-8 text-center bg-gradient-primary border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Your Journey?</h2>
      <p className="text-white/80 mb-6">Join thousands of people achieving their goals with our proven system.</p>
      <Button onClick={onGetStarted} size="lg" className="bg-white text-primary hover:bg-white/90">
        Get Started Today
      </Button>
    </Card>
  );
};
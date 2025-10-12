import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate("/auth");
  };
  
  const handleSignIn = () => {
    navigate("/auth");
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                Kujituma
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button onClick={handleGetStarted}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <LandingHero onGetStarted={handleGetStarted} />
        <LandingFeatures />
        <LandingCTA onGetStarted={handleGetStarted} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Kujituma
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              "To have a burning fire in your stomach."
            </p>
            <div className="text-muted-foreground text-xs pt-4">
              © 2025 Kujituma. Built with passion and love for my friends.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

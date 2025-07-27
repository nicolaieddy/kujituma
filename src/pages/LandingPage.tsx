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
    <div className="min-h-screen bg-gradient-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Kujituma
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={handleSignIn}
                className="text-foreground hover:text-primary"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
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
      <footer className="bg-card/50 border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Kujituma
            </h3>
            <p className="text-muted-foreground">
              Transform your goals into achievements with structured planning and community support.
            </p>
            <div className="text-sm text-muted-foreground">
              © 2024 Kujituma. Built with passion for achievers.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
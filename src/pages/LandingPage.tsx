import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleSignIn = () => {
    navigate("/auth");
  };

  const handleGetStarted = () => {
    // Navigate to auth with signup mode pre-selected
    navigate("/auth?mode=signup");
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation - Fixed over hero */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                Kujituma
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleSignIn} className="text-muted-foreground hover:text-foreground">
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
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

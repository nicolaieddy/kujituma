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
  return <div className="min-h-screen bg-gradient-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                Kujituma
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <Button variant="ghost" onClick={handleSignIn} className="text-white hover:text-white/80 hover:bg-white/10">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="bg-white text-primary hover:bg-white/90 px-6 py-2">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <LandingHero onGetStarted={handleGetStarted} />
        <LandingCTA onGetStarted={handleGetStarted} />
      </main>

      {/* Footer */}
      <footer className="bg-background/90 backdrop-blur-lg border-t border-white/10 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">
              Kujituma
            </h3>
            <p className="text-white/70 text-lg max-w-2xl mx-auto"> "To have a burning fire in your stomach."</p>
            <div className="text-white/50 pt-4 border-t border-white/10">
              © 2025 Kujituma. Built with passion and love for my friends.
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;
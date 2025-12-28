import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  
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
            <Button variant="ghost" onClick={handleSignIn}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <LandingHero />
        <LandingFeatures />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 Kujituma
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

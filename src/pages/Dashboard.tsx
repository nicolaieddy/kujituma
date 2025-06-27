
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Kujituma
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Welcome to Your Dashboard</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            Your journey has begun! This is where your growth adventure continues.
          </p>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-2">Mission Control</h3>
            <p className="text-white/70">
              You've successfully launched into your growth journey. More features coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Target, Users, Calendar } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent animate-fade-in">
            Kujituma
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Share your weekly progress, connect with your community, and stay accountable to your goals
          </p>
          <Link to="/dashboard">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-8 py-4 text-lg transition-all duration-300 hover:scale-105 animate-fade-in"
            >
              Join the Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Track Progress</h3>
              <p className="text-white/70 leading-relaxed">
                Share your weekly accomplishments and set priorities for the week ahead
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Community Support</h3>
              <p className="text-white/70 leading-relaxed">
                Get encouragement and support from others on their own growth journey
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Stay Accountable</h3>
              <p className="text-white/70 leading-relaxed">
                Regular check-ins help you maintain momentum and achieve your goals
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

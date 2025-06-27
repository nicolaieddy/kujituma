
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, MessageCircle, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Kujituma
          </h1>
          
          <div className="flex items-center gap-4">
            {!user ? (
              <Link to="/auth">
                <Button variant="ghost" className="text-white hover:bg-white/20">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={signOut}
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Share Your
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent block mt-2">
            Weekly Progress
          </span>
        </h2>
        
        <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Connect with others on their growth journey. Share accomplishments, set priorities, 
          and get support from a community that celebrates progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-4 h-auto">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-4 h-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-4 h-auto backdrop-blur-sm">
                  Sign In with Google
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* User Status Indicator */}
        {user && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-md mx-auto mb-16">
            <p className="text-white/90 text-sm">
              Welcome back, <span className="font-semibold">{user.email}</span>!
            </p>
            <p className="text-white/70 text-xs mt-1">
              Ready to share your progress with the community?
            </p>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-white mb-4">
            Why Choose Kujituma?
          </h3>
          <p className="text-white/70 max-w-2xl mx-auto">
            Built for people who believe in the power of accountability and community support.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-4">Track Progress</h4>
            <p className="text-white/70 leading-relaxed">
              Share your weekly accomplishments and set clear priorities for the week ahead. 
              Stay focused on what matters most.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-4">Build Community</h4>
            <p className="text-white/70 leading-relaxed">
              Connect with like-minded individuals who are also focused on growth and improvement. 
              Learn from others' journeys.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-4">Get Support</h4>
            <p className="text-white/70 leading-relaxed">
              Ask for help when you need it and receive encouragement from the community. 
              We're all in this together.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/20 rounded-3xl p-12 max-w-4xl mx-auto">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to start your journey?
          </h3>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
            Join our community today and start sharing your progress with others who care about growth. 
            Every small step counts toward your bigger goals.
          </p>
          
          {!user && (
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-10 py-4 h-auto shadow-lg">
                Join the Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="text-center">
          <p className="text-white/60 text-sm">
            © 2024 Kujituma. Building habits, one week at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

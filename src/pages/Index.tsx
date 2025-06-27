
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
          {!user ? (
            <Link to="/auth">
              <Button variant="ghost" className="text-white hover:bg-white/20">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          ) : (
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                Go to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Share Your
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent block">
            Weekly Progress
          </span>
        </h2>
        
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Connect with others on their growth journey. Share accomplishments, set priorities, 
          and get support from a community that celebrates progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-3">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {!user && (
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-3">
                Sign In with Google
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Track Progress</h3>
            <p className="text-white/70">
              Share your weekly accomplishments and set clear priorities for the week ahead.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Build Community</h3>
            <p className="text-white/70">
              Connect with like-minded individuals who are also focused on growth and improvement.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Get Support</h3>
            <p className="text-white/70">
              Ask for help when you need it and receive encouragement from the community.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold text-white mb-4">
          Ready to start your journey?
        </h3>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Join our community today and start sharing your progress with others who care about growth.
        </p>
        <Link to="/dashboard">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-3">
            Join the Community
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;


import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Users, Calendar } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent mb-6">
            Kujituma
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
            Share your weekly progress, connect with your community, and stay accountable to your goals.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
          <div className="text-center text-white">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-white/70">Share your weekly accomplishments and set priorities for the week ahead.</p>
          </div>
          
          <div className="text-center text-white">
            <div className="bg-gradient-to-r from-blue-500 to-pink-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Community Support</h3>
            <p className="text-white/70">Get encouragement and support from others on their own growth journey.</p>
          </div>
          
          <div className="text-center text-white">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Stay Accountable</h3>
            <p className="text-white/70">Regular check-ins help you maintain momentum and achieve your goals.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Join the Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

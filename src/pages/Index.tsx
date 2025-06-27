
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Users, Calendar, Rocket } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Animated rocket/person launch */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="relative">
          <Rocket className="h-16 w-16 text-orange-400 transform rotate-45" />
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-full blur-sm opacity-80" />
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-t from-orange-400 to-yellow-300 rounded-full blur-sm opacity-60" />
        </div>
      </div>

      {/* Planet/moon in background */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-600 rounded-full opacity-30" />
      <div className="absolute top-40 right-32 w-8 h-8 bg-gray-400 rounded-full opacity-20" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-6 animate-pulse">
            Kujituma
          </h1>
          <p className="text-2xl md:text-3xl text-white mb-4 font-light">
            🚀 Launch Your Potential Into Orbit
          </p>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Share your weekly progress, connect with your community, and blast off toward your goals. 
            Every small step propels you closer to the stars.
          </p>
        </div>

        {/* Mission Control Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
          <div className="text-center text-white transform hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-2xl">
              <Target className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-cyan-300">Mission Tracking</h3>
            <p className="text-white/80 leading-relaxed">Chart your trajectory with weekly progress reports. Every accomplishment fuels your journey to the stars.</p>
          </div>
          
          <div className="text-center text-white transform hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-2xl">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-pink-300">Crew Support</h3>
            <p className="text-white/80 leading-relaxed">Join a community of fellow space explorers. Together, we reach heights impossible alone.</p>
          </div>
          
          <div className="text-center text-white transform hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-2xl">
              <Calendar className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-orange-300">Launch Schedule</h3>
            <p className="text-white/80 leading-relaxed">Regular check-ins keep your rocket fueled and your mission on course. Consistency creates momentum.</p>
          </div>
        </div>

        {/* Launch Button */}
        <div className="text-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center">
              🚀 BEGIN LAUNCH SEQUENCE
              <ArrowRight className="ml-3 h-6 w-6" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </Button>
          <p className="text-white/60 mt-4 text-sm">T-minus zero. Your journey to the stars begins now.</p>
        </div>

        {/* Mission Stats */}
        <div className="mt-20 text-center">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-white">
              <div className="text-3xl font-bold text-cyan-300">∞</div>
              <div className="text-sm text-white/70">Possibilities</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold text-purple-300">1</div>
              <div className="text-sm text-white/70">You</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold text-orange-300">0</div>
              <div className="text-sm text-white/70">Limits</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

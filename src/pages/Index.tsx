
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const Index = () => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    // Reset after animation completes
    setTimeout(() => {
      setIsLaunching(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900 flex flex-col items-center justify-center relative overflow-hidden">
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

      {/* Launching Astronaut Animation */}
      {isLaunching && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div 
            className="relative transform transition-all duration-3000 ease-out"
            style={{
              animation: 'launchAstronaut 3s ease-out forwards'
            }}
          >
            {/* Astronaut Figure */}
            <div className="flex flex-col items-center">
              {/* Helmet */}
              <div className="w-12 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full mb-1 relative">
                <div className="w-8 h-8 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full absolute top-1 left-2 opacity-80"></div>
              </div>
              
              {/* Arms */}
              <div className="flex items-center justify-between w-16 mb-1">
                <div className="w-3 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full transform -rotate-12"></div>
                <div className="w-3 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full transform rotate-12"></div>
              </div>
              
              {/* Body */}
              <div className="w-10 h-12 bg-gradient-to-b from-orange-500 to-orange-700 rounded-lg mb-1"></div>
              
              {/* Legs */}
              <div className="flex space-x-1">
                <div className="w-3 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full"></div>
                <div className="w-3 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full"></div>
              </div>
            </div>
            
            {/* Rocket Fire */}
            <div className="flex justify-center space-x-1 mt-2">
              <div className="w-2 h-12 bg-gradient-to-t from-red-500 via-orange-500 to-yellow-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-16 bg-gradient-to-t from-red-600 via-orange-600 to-yellow-500 rounded-full animate-pulse animation-delay-100"></div>
              <div className="w-2 h-12 bg-gradient-to-t from-red-500 via-orange-500 to-yellow-400 rounded-full animate-pulse animation-delay-200"></div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center relative z-10">
        {/* Title */}
        <h1 className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-8 animate-pulse">
          Kujituma
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-xl mb-16 opacity-80">Launch into your journey of growth</p>

        {/* Button */}
        <Button 
          onClick={handleLaunch}
          size="lg"
          disabled={isLaunching}
          className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 hover:from-purple-600 hover:via-blue-600 hover:to-purple-700 text-white px-12 py-6 text-xl font-bold rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center">
            {isLaunching ? '🚀 LAUNCHING...' : 'Begin Your Journey'}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        </Button>
      </div>

      <style>{`
        @keyframes launchAstronaut {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          20% {
            transform: translateY(-10vh) scale(0.95) rotate(-5deg);
            opacity: 1;
          }
          60% {
            transform: translateY(-40vh) scale(0.7) rotate(-10deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120vh) scale(0.2) rotate(-15deg);
            opacity: 0;
          }
        }
        
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .duration-3000 {
          transition-duration: 3000ms;
        }
      `}</style>
    </div>
  );
};

export default Index;

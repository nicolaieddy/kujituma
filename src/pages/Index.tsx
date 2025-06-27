
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    // Navigate after animation completes
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
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

      <div className="text-center relative z-10">
        {/* Title */}
        <h1 className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-16 animate-pulse">
          Kujituma
        </h1>

        {/* Button */}
        <Button 
          onClick={handleLaunch}
          size="lg"
          disabled={isLaunching}
          className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center">
            {isLaunching ? '🚀 LAUNCHING...' : 'BEGIN'}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        </Button>
      </div>
    </div>
  );
};

export default Index;

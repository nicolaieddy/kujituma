import confetti from 'canvas-confetti';

export const celebrateSuccess = () => {
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

export const celebrateGoalComplete = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

export const celebrateWeekComplete = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

// Streak milestone celebrations with increasing intensity
export const celebrateStreakMilestone = (streak: number) => {
  // Get config based on streak tier
  const getConfig = (s: number) => {
    if (s >= 12) return { particleCount: 200, spread: 100, colors: ['#f97316', '#fb923c', '#fdba74'] };
    if (s >= 8) return { particleCount: 120, spread: 80, colors: ['#eab308', '#facc15', '#fde047'] };
    return { particleCount: 80, spread: 60, colors: ['#22c55e', '#4ade80', '#86efac'] };
  };

  const config = getConfig(streak);

  // Initial burst
  confetti({
    particleCount: config.particleCount,
    spread: config.spread,
    origin: { y: 0.6 },
    colors: config.colors,
    startVelocity: 45
  });

  // For higher streaks, add more celebration bursts
  if (streak >= 8) {
    setTimeout(() => {
      confetti({
        particleCount: config.particleCount / 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: config.colors
      });
      confetti({
        particleCount: config.particleCount / 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: config.colors
      });
    }, 250);
  }

  // For 12+ streaks, add a grand finale
  if (streak >= 12) {
    setTimeout(() => {
      const duration = 1500;
      const animationEnd = Date.now() + duration;
      
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: config.colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: config.colors
        });
      }, 100);
    }, 500);
  }
};

// Check if a streak is a milestone
export const isStreakMilestone = (streak: number): boolean => {
  return streak === 4 || streak === 8 || streak === 12 || 
         (streak > 12 && streak % 4 === 0);
};

// Get milestone message
export const getStreakMilestoneMessage = (streak: number, type: 'daily' | 'weekly' | 'quarterly' = 'weekly'): string | null => {
  const typeLabels = {
    daily: 'Day',
    weekly: 'Week',
    quarterly: 'Quarter',
  };

  if (streak === 4) return `🔥 4 ${typeLabels[type]} Streak! You're building momentum!`;
  if (streak === 8) return `⭐ 8 ${typeLabels[type]} Streak! Incredible consistency!`;
  if (streak === 12) return `🏆 12 ${typeLabels[type]} Streak! You're unstoppable!`;
  if (streak > 12 && streak % 4 === 0) return `🌟 ${streak} ${typeLabels[type]} Streak! Legendary!`;
  
  return null;
};

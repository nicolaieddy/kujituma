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
  const milestoneConfig: Record<number, { particleCount: number; spread: number; colors: string[] }> = {
    4: {
      particleCount: 80,
      spread: 60,
      colors: ['#22c55e', '#4ade80', '#86efac'] // Green for 4 weeks
    },
    8: {
      particleCount: 120,
      spread: 80,
      colors: ['#eab308', '#facc15', '#fde047'] // Yellow/Gold for 8 weeks
    },
    12: {
      particleCount: 200,
      spread: 100,
      colors: ['#f97316', '#fb923c', '#fdba74'] // Orange/Fire for 12 weeks
    }
  };

  const config = milestoneConfig[streak];
  if (!config) return;

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
  return streak === 4 || streak === 8 || streak === 12;
};

// Get milestone message
export const getStreakMilestoneMessage = (streak: number): string | null => {
  const messages: Record<number, string> = {
    4: "🔥 4 Week Streak! You're building momentum!",
    8: "⭐ 8 Week Streak! Incredible consistency!",
    12: "🏆 12 Week Streak! You're unstoppable!"
  };
  return messages[streak] || null;
};

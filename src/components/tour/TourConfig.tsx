import { TourConfig } from "@/types/tour";

export const onboardingTourConfig: TourConfig = {
  id: 'onboarding',
  name: 'Welcome to Kujituma',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Kujituma! 🎉',
      content: 'Ready to transform how you achieve your goals? Kujituma means "to commit" in Swahili, and that\'s exactly what we\'re here to help you do. Let\'s take a quick tour to unlock your productivity superpowers! ⚡',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Let\'s Go!'
    },
    {
      id: 'weekly-plan',
      title: 'Your Weekly Command Center 📅',
      content: 'This is where the magic happens! Create weekly objectives that actually move the needle. Pro tip: Link your objectives to your bigger goals to ensure every task matters. Navigate between weeks to plan ahead or celebrate past wins! 🎯',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Got it!',
      showSkip: true
    },
    {
      id: 'goals-link',
      title: 'Connect the Dots 🔗',
      content: 'Here\'s the secret sauce: When you link weekly objectives to your long-term goals, you\'re not just busy—you\'re building toward something meaningful. Every checkbox becomes a step closer to your dreams!',
      target: '[data-tour="goals-tab"]',
      placement: 'bottom',
      actionText: 'Amazing!',
      showSkip: true
    },
    {
      id: 'goals-overview',
      title: 'Your Goal Empire 🏰',
      content: 'Set ambitious goals, break them into bite-sized objectives, and watch your progress unfold. Move goals through different stages as you conquer them. This is where dreams become plans, and plans become reality!',
      target: '[data-tour="goals-tab"]',
      placement: 'bottom',
      actionText: 'Love it!',
      showSkip: true
    },
    {
      id: 'share-accountability',
      title: 'Share & Stay Accountable 🤝',
      content: 'Ready for the accountability game-changer? Share your weekly progress with friends, mentors, or your team! When others can see your commitment, you\'re 3x more likely to follow through. Let your network become your support system! 💪',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Start Crushing Goals!',
      showSkip: true
    }
  ]
};
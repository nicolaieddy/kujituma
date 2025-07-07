import { TourConfig } from "@/types/tour";

export const onboardingTourConfig: TourConfig = {
  id: 'onboarding',
  name: 'Welcome to Kujituma',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Kujituma! 🎉',
      content: 'Ready to achieve your goals? Let\'s take a quick tour of the features that will transform your productivity!',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Let\'s Go!'
    },
    {
      id: 'weekly-plan',
      title: 'Weekly Planning 📅',
      content: 'Create weekly objectives here. Pro tip: Link objectives to your long-term goals to ensure every task has purpose!',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Got it!',
      showSkip: true
    },
    {
      id: 'goals-overview',
      title: 'Long-term Goals 🎯',
      content: 'Click here to set ambitious goals and track your progress. Break big dreams into achievable steps!',
      target: '[data-tour="goals-tab"]',
      placement: 'bottom',
      actionText: 'Perfect!',
      showSkip: true
    },
    {
      id: 'share-accountability',
      title: 'Share & Stay Accountable 🤝',
      content: 'Share your weekly progress with others for accountability. When your network sees your commitment, you\'re 3x more likely to succeed!',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Start Achieving!',
      showSkip: true
    }
  ]
};
import { TourConfig } from "@/types/tour";

export const onboardingTourConfig: TourConfig = {
  id: 'onboarding',
  name: 'Welcome to Kujituma',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Kujituma! 🎉',
      content: 'Let\'s take a quick tour to get you started with managing your goals and weekly progress. This will only take a minute!',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Start Tour'
    },
    {
      id: 'weekly-plan',
      title: 'Create Your Weekly Plan',
      content: 'Start here each week! Add your objectives, track accomplishments, and plan your priorities. Click on different weeks to plan ahead or review past progress.',
      target: '[data-tour="weekly-tab"]',
      placement: 'bottom',
      actionText: 'Next',
      showSkip: true
    },
    {
      id: 'goals-overview',
      title: 'Manage Your Long-term Goals',
      content: 'Set and track your bigger goals here. Create goals, break them into objectives, and move them through different stages as you make progress.',
      target: '[data-tour="goals-tab"]',
      placement: 'bottom',
      actionText: 'Finish Tour',
      showSkip: true
    }
  ]
};
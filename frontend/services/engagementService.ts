import { UserProfile, RoadmapWeek, Badge, UnlockedBadge, Streak, StudyPlan } from '../types';

// --- Quotes ---
const QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Skill is only developed by hours and hours of work.", author: "Usain Bolt" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
  { text: "Knowledge is power.", author: "Francis Bacon" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" }
];

export const getRandomQuote = () => {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
};

// --- Badges ---
export const BADGE_DEFINITIONS: Badge[] = [
  { id: 'first_week', name: 'First Steps', description: 'Complete Week 1', icon: '🎯', condition: 'Finish all tasks in Week 1' },
  { id: 'quarter_way', name: 'Getting Serious', description: 'Reach 25% Completion', icon: '🚀', condition: 'Complete 25% of the roadmap' },
  { id: 'halfway', name: 'Halfway Hero', description: 'Reach 50% Completion', icon: '💪', condition: 'Complete 50% of the roadmap' },
  { id: 'final_sprint', name: 'Final Sprint', description: 'Reach 75% Completion', icon: '⚡', condition: 'Complete 75% of the roadmap' },
  { id: 'course_complete', name: 'Mission Accomplished', description: 'Complete the Roadmap', icon: '🎓', condition: 'Complete all weeks' },
  { id: 'streak_3', name: 'On Fire', description: '3 Day Streak', icon: '🔥', condition: 'Maintain a 3-day activity streak' },
  { id: 'streak_7', name: 'Unstoppable', description: '7 Day Streak', icon: '🏆', condition: 'Maintain a 7-day activity streak' },
  { id: 'consistency', name: 'Consistent', description: 'Completed 10 Tasks', icon: '📅', condition: 'Complete total of 10 tasks' }
];

// --- Streak Logic ---
export const updateStreak = (profile: UserProfile): Streak => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentStreakData = profile.streak || { currentStreak: 0, longestStreak: 0, lastActivityDate: '' };
  
  if (currentStreakData.lastActivityDate === today) {
    return currentStreakData;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newCurrent = 1;
  if (currentStreakData.lastActivityDate === yesterdayStr) {
    newCurrent = currentStreakData.currentStreak + 1;
  }

  return {
    currentStreak: newCurrent,
    longestStreak: Math.max(newCurrent, currentStreakData.longestStreak),
    lastActivityDate: today
  };
};

// --- Achievement Check ---
export const checkNewBadges = (profile: UserProfile, plan: StudyPlan): UnlockedBadge[] => {
  const unlockedBadges: UnlockedBadge[] = [];
  const existingIds = new Set(profile.badges?.map(b => b.id) || []);
  
  const totalTasksCompleted = plan.roadmap.reduce((acc, week) => acc + week.tasks.filter(t => t.completed).length, 0);
  const totalWeeks = plan.roadmap.length;
  
  // Calculate dynamic milestones
  const quarterWeek = Math.ceil(totalWeeks / 4);
  const halfwayWeek = Math.ceil(totalWeeks / 2);
  const finalSprintWeek = Math.ceil(totalWeeks * 0.75);
  
  const isWeekComplete = (n: number) => {
    const w = plan.roadmap.find(r => r.weekNumber === n);
    return w && w.tasks.length > 0 && w.tasks.every(t => t.completed);
  };

  const streak = profile.streak?.currentStreak || 0;

  // Badge Logic
  if (!existingIds.has('first_week') && isWeekComplete(1)) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'first_week')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('quarter_way') && isWeekComplete(quarterWeek)) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'quarter_way')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('halfway') && isWeekComplete(halfwayWeek)) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'halfway')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('final_sprint') && isWeekComplete(finalSprintWeek)) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'final_sprint')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('course_complete') && isWeekComplete(totalWeeks)) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'course_complete')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('streak_3') && streak >= 3) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'streak_3')!, unlockedAt: new Date().toISOString() });
  }
  if (!existingIds.has('streak_7') && streak >= 7) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'streak_7')!, unlockedAt: new Date().toISOString() });
  }
  
  if (!existingIds.has('consistency') && totalTasksCompleted >= 10) {
    unlockedBadges.push({ ...BADGE_DEFINITIONS.find(b => b.id === 'consistency')!, unlockedAt: new Date().toISOString() });
  }

  return unlockedBadges;
};

// --- Time Estimation ---
export const calculateTimeEstimation = (plan: StudyPlan, profile: UserProfile) => {
    // 1. Calculate remaining hours (sum of estimatedHours of uncompleted tasks)
    const totalRemainingHours = plan.roadmap.reduce((acc, week) => {
        return acc + week.tasks.filter(t => !t.completed).reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    }, 0);

    // 2. Get user pace from availability string
    let hoursPerWeek = 10; // default
    if (profile.availability.includes('5-10')) hoursPerWeek = 7.5;
    else if (profile.availability.includes('10-20')) hoursPerWeek = 15;
    else if (profile.availability.includes('20+')) hoursPerWeek = 25;

    return {
        totalRemainingHours: Math.round(totalRemainingHours * 10) / 10,
        hoursPerWeek
    };
};
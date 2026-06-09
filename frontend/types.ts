export enum RoleLevel {
  Junior = 'Junior',
  Mid = 'Mid-Level',
  Senior = 'Senior'
}

export enum TimeAvailability {
  Low = '5-10 hours/week',
  Medium = '10-20 hours/week',
  High = '20+ hours/week'
}

export enum LearningStyle {
  Visual = 'Visual (Videos/Diagrams)',
  HandsOn = 'Hands-on (Coding/Building)',
  Academic = 'Academic (Reading/Theory)',
  Mixed = 'Mixed'
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji character
  condition: string;
}

export interface UnlockedBadge extends Badge {
  unlockedAt: string; // ISO Date
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
}

export interface UserProfile {
  currentRole: string;
  targetRole: string;
  currentSkills: string;
  weakAreas: string;
  availability: TimeAvailability;
  learningStyle: LearningStyle;
  timelineMonths: number;
  cvText?: string;
  startDate?: string; // ISO Date string YYYY-MM-DD
  originalStartDate?: string; // To track if schedule shifted
  rescheduleCount?: number; // How many times they adjusted
  language?: string; // User's preferred language (e.g., 'en', 'vi')
  email?: string; // Optional email address for push subscriptions
  
  // Engagement
  streak?: Streak;
  badges?: UnlockedBadge[];
  
  // User Data
  weekNotes?: Record<number, string>; // Map week number to notes
}

export interface Task {
  description: string;
  completed: boolean;
  estimatedHours: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface RoadmapWeek {
  weekNumber: number;
  theme: string;
  description: string;
  priorities: string[];
  tasks: Task[];
  suggestedResources?: string[];
  notes?: string;
  
  // Metadata for badges
  startedAt?: string; // ISO Date
  completedAt?: string; // ISO Date
}

export interface ProjectIdea {
  title: string;
  problem: string;
  tools: string[];
  outcome: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface TimeBlock {
  blockName: string;
  durationMinutes: number;
  activityType: string;
  description: string;
}

export interface StudyPlan {
  roadmap: RoadmapWeek[];
  projectIdeas: ProjectIdea[];
  weeklyStrategy: {
    summary: string;
    timeBlocks: TimeBlock[];
    tips: string[];
  };
}

export interface CVAnalysisResult {
  detectedSkills: string[];
  missingSkills: string[];
  gapAnalysisSummary: string;
}

export interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  estimatedHoursRemaining: number;
  daysLeftInWeek: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
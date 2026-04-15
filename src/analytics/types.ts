export interface TodayStatsDto {
  dateKey: string;
  activeMs: number;
  idleMs: number;
  totalMs: number;
  commits: number;
  linesWritten: number;
  productivityScore: number;
}

export interface ProductivityInsightsDto {
  productiveHours: Array<{ hour: number; score: number; activeMs: number }>;
  today: TodayStatsDto;
}

export interface SessionInsightsDto {
  averageCommitsPerSession: number;
  durationDistribution: {
    under30: number;
    min31to60: number;
    min61to90: number;
    over90: number;
  };
}

export interface LanguageTrendDto {
  monthKey: string;
  languageId: string;
  activeMs: number;
  linesWritten: number;
  growthRate: number;
}

export interface StreakInsightsDto {
  currentStreakDays: number;
  longestStreakDays: number;
  consistencyScore: number;
}


export interface Workout {
  id: string; // Added for identification
  date: Date;
  exerciseType: string;
  duration: number; // in minutes
  intensity: "low" | "medium" | "high";
  userWeightKg: number; // Added for calorie calculation
  caloriesBurned: number; // Now mandatory, calculated by AI
  notes?: string;
}

// Type for data stored related to streaks
export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate: string | null; // Store as ISO string for localStorage compatibility
    streakFreezes: number;
    lastFreezeEarnedDate: string | null; // Store as ISO string - Track when the last freeze was earned
}



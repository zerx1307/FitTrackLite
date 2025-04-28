
"use client";

import { useWorkouts } from '@/contexts/WorkoutContext';
import type { StreakData } from '@/types/workout';

// This hook provides a convenient way to access streak data
// It relies on the WorkoutContext to get the underlying data
export const useStreak = (): { streakData: StreakData; loading: boolean; } => {
  // Removed useStreakFreeze from destructuring
  const { streakData, loading } = useWorkouts();

  // Removed useStreakFreeze from return object
  return { streakData, loading };
};


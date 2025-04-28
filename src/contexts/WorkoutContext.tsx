
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import type { Workout, StreakData } from '@/types/workout'; // Import the shared types
import { toast } from '@/hooks/use-toast';
import { updateStreakData, getInitialStreakData, resetStreakData as resetStreakStorage } from '@/lib/streak'; // Import streak utility functions
import { calculateXp, loadXp, resetXp as resetXpStorage } from '@/lib/xp'; // Import XP utility functions
import { format } from 'date-fns';

interface WorkoutContextType {
  workouts: Workout[];
  addWorkout: (workout: Omit<Workout, 'id'>) => void; // Omit id as it will be generated
  resetWorkouts: () => void; // Now handles workouts, streak, and XP
  loading: boolean;
  streakData: StreakData; // Expose streak data
  xp: number; // Expose XP data
  logGoalCompletion: (goalId: string, goalTitle: string, difficultyMultiplier?: number) => void; // Function to log goal completion for XP
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Define the initial default state structure
const defaultStreakData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    streakFreezes: 0,
    lastFreezeEarnedDate: null,
};

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [streakData, setStreakData] = useState<StreakData>(defaultStreakData); // Initialize with default
  const [xp, setXp] = useState<number>(0); // Initialize XP
  const [loading, setLoading] = useState(true); // To handle initial load

  // Load workouts, streak data, and XP from localStorage on initial client mount
  useEffect(() => {
    setLoading(true);
    let loadedWorkouts: Workout[] = [];
    let loadedStreakData: StreakData = defaultStreakData;
    let loadedUserXp: number = 0;

    try {
      // Load Workouts
      const storedWorkouts = localStorage.getItem('fitTrackWorkouts');
      if (storedWorkouts) {
        loadedWorkouts = JSON.parse(storedWorkouts).map((w: any) => ({
          ...w,
          date: new Date(w.date), // Ensure date objects
        })).sort((a, b) => {
           const dateA = a.date instanceof Date ? a.date.getTime() : 0;
           const dateB = b.date instanceof Date ? b.date.getTime() : 0;
           return dateB - dateA;
        });
      }

      // Load Streak Data (getInitialStreakData handles parsing and checks)
      loadedStreakData = getInitialStreakData();

      // Load XP
      loadedUserXp = loadXp();

    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      toast({
        title: "Error",
        description: "Could not load previous workout, streak, or XP data.",
        variant: "destructive",
      });
      // Reset to defaults if loading fails
      loadedWorkouts = [];
      loadedStreakData = defaultStreakData;
      loadedUserXp = 0;
    } finally {
      setWorkouts(loadedWorkouts);
      setStreakData(loadedStreakData);
      setXp(loadedUserXp);
      setLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once on client mount

  // Save workouts to localStorage whenever they change (only after initial load)
  useEffect(() => {
    if (!loading) {
      try {
        // Ensure dates are stored correctly (as ISO strings)
        const workoutsToStore = workouts.map(w => ({
            ...w,
            date: w.date instanceof Date ? w.date.toISOString() : w.date, // Keep as string if already string
        }));
        localStorage.setItem('fitTrackWorkouts', JSON.stringify(workoutsToStore));
      } catch (error) {
        console.error("Failed to save workouts to localStorage:", error);
        toast({
          title: "Error",
          description: "Could not save workout data. Progress might be lost.",
          variant: "destructive",
        });
      }
    }
  }, [workouts, loading]);

  // Add workout, update streak, and update XP
  const addWorkout = useCallback((workoutData: Omit<Workout, 'id'>) => {
    const newWorkout: Workout = {
      ...workoutData,
      id: `workout_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    };

    const workoutDate = new Date(newWorkout.date);
    let previousStreakData: StreakData | null = null; // Store previous streak for XP calc
    let xpGained = 0; // Initialize XP gained for this workout log

    // Update streak data
    setStreakData(prevStreakData => {
        previousStreakData = { ...prevStreakData }; // Capture previous state
        const updatedStreak = updateStreakData(prevStreakData, workoutDate);
        return updatedStreak;
    });

    // Add new workout and re-sort
    setWorkouts((prevWorkouts) => {
      const updatedWorkouts = [...prevWorkouts, newWorkout];
       updatedWorkouts.sort((a, b) => {
         const dateA = a.date instanceof Date ? a.date.getTime() : 0;
         const dateB = b.date instanceof Date ? b.date.getTime() : 0;
         return dateB - dateA;
       });
      return updatedWorkouts;
    });

     // Update XP after state updates (using the latest streak data)
     setXp(prevXp => {
        const currentStreak = streakData; // Use the most recent streakData state
        const newTotalXp = calculateXp(prevXp, { type: 'log_workout', workout: newWorkout }, currentStreak, previousStreakData); // Pass previous streak
        xpGained = newTotalXp - prevXp; // Calculate the actual XP gained
        return newTotalXp;
    });

     // Display the combined toast after all state updates
      toast({
        title: "Workout Logged!",
        // Removed XP gained from the description
        description: `Logged ${newWorkout.exerciseType} (${newWorkout.duration} min, ${newWorkout.caloriesBurned} kcal) on ${format(workoutDate, "PPP")}.`,
        variant: "default",
      });

  }, [streakData]); // Dependency on streakData to ensure correct state for XP calculation

  // Function to log goal completion for XP
   const logGoalCompletion = useCallback((goalId: string, goalTitle: string, difficultyMultiplier: number = 1) => {
        let xpGained = 0;
        setXp(prevXp => {
            const newTotalXp = calculateXp(prevXp, { type: 'complete_goal', goalId, goalTitle, difficultyMultiplier });
            xpGained = newTotalXp - prevXp;
            return newTotalXp;
        });
        // Toast is handled within calculateXp for goal completion
   }, []);


  // Reset workouts, streak, and XP
  const resetWorkouts = useCallback(() => {
    try {
      setWorkouts([]);
      localStorage.removeItem('fitTrackWorkouts');

      const initialStreak = resetStreakStorage(); // Reset streak in storage
      setStreakData(initialStreak); // Update streak state

      const initialXp = resetXpStorage(); // Reset XP in storage
      setXp(initialXp); // Update XP state

      // Remove other non-auth related data
       localStorage.removeItem('fitnessGoals');
       localStorage.removeItem('lastUserWeightKg');
       localStorage.removeItem(LEADERBOARD_MOCK_KEY); // Remove mock leaderboard too

      toast({
        title: "Stats Reset",
        description: "All workout, streak, and XP data has been cleared.",
      });
    } catch (error) {
      console.error("Failed to reset data:", error);
      toast({
        title: "Error",
        description: "Could not reset workout, streak, or XP data.",
        variant: "destructive",
      });
    }
  }, []);

  // Value provided to context consumers
  const contextValue = {
    workouts,
    addWorkout,
    resetWorkouts,
    loading,
    streakData,
    xp,
    logGoalCompletion,
  };

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkouts = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkouts must be used within a WorkoutProvider');
  }
  return context;
};

// Need to define LEADERBOARD_MOCK_KEY here or import it if defined elsewhere
const LEADERBOARD_MOCK_KEY = 'fitTrackLeaderboardMock';

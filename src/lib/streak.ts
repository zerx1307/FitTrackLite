
import { isSameDay, isYesterday, subDays, differenceInDays, isSunday, format } from 'date-fns';
import type { StreakData } from '@/types/workout';
import { toast } from '@/hooks/use-toast'; // Import toast for notifications

const STREAK_DATA_KEY = 'fitTrackStreakData';

// --- Initialization ---

export const getInitialStreakData = (): StreakData => {
  let initialData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    streakFreezes: 0,
    lastFreezeEarnedDate: null,
  };
  try {
    const storedData = localStorage.getItem(STREAK_DATA_KEY);
    if (storedData) {
      initialData = JSON.parse(storedData) as StreakData;
    }
  } catch (error) {
    console.error("Error reading streak data from localStorage:", error);
  }
  // Perform check *after* loading/initializing
  return checkAndResetStreak(initialData);
};

// --- Update Logic ---

export const updateStreakData = (currentData: StreakData, newWorkoutDate: Date): StreakData => {
   const today = new Date();
   today.setHours(0, 0, 0, 0); // Normalize today
   newWorkoutDate.setHours(0, 0, 0, 0); // Normalize workout date

   const lastWorkoutDate = currentData.lastWorkoutDate ? new Date(currentData.lastWorkoutDate) : null;

   let updatedStreak: StreakData = { ...currentData };

   // Ignore if the new workout is on the same day as the last recorded one
   if (lastWorkoutDate && isSameDay(newWorkoutDate, lastWorkoutDate)) {
     saveStreakData(updatedStreak); // Save to potentially update longest streak if needed
     return updatedStreak;
   }

   // Determine if streak continues or resets based on the gap
   if (lastWorkoutDate) {
        const daysBetween = differenceInDays(newWorkoutDate, lastWorkoutDate);
        if (daysBetween === 1) {
            // Consecutive day, increment streak
            updatedStreak.currentStreak += 1;
        } else if (daysBetween > 1) {
             // Gap detected, reset streak (automatic freeze usage handled on load/check)
            updatedStreak.currentStreak = 1;
        }
        // If daysBetween <= 0 (e.g., logging past workout), don't increment streak
   } else {
        // First workout ever
        updatedStreak.currentStreak = 1;
   }


   // Update last workout date *only if the new date is later than the current last date*
   if (!lastWorkoutDate || newWorkoutDate > lastWorkoutDate) {
        updatedStreak.lastWorkoutDate = newWorkoutDate.toISOString().split('T')[0];
   }


   // Update longest streak
   if (updatedStreak.currentStreak > updatedStreak.longestStreak) {
     updatedStreak.longestStreak = updatedStreak.currentStreak;
   }

   // --- Freeze Earning Logic ---
   // Earn a freeze for every 7 consecutive days, but only once per milestone.
   const canEarnFreeze = updatedStreak.currentStreak > 0 && updatedStreak.currentStreak % 7 === 0;
   const lastEarnedDate = updatedStreak.lastFreezeEarnedDate ? new Date(updatedStreak.lastFreezeEarnedDate) : null;
   const earnedToday = lastEarnedDate && isSameDay(newWorkoutDate, lastEarnedDate); // Already earned for this milestone today?

   // Ensure we don't grant a freeze if the last recorded workout (which triggered the streak increment)
   // is the same day as the last time a freeze was earned for this streak number.
   const previousStreakLevel = currentData.currentStreak; // Streak before this update
   const justReachedMilestone = updatedStreak.currentStreak > previousStreakLevel && updatedStreak.currentStreak % 7 === 0;


   if (justReachedMilestone) {
        // Check if we already earned a freeze for this specific milestone number based on date
        const milestoneStartDate = subDays(newWorkoutDate, updatedStreak.currentStreak % 7); // Approx start date of this 7-day block
        const alreadyEarnedThisMilestone = lastEarnedDate && lastEarnedDate >= milestoneStartDate && currentData.lastFreezeEarnedDate === updatedStreak.lastFreezeEarnedDate;

       if (!alreadyEarnedThisMilestone) {
            updatedStreak.streakFreezes += 1;
            updatedStreak.lastFreezeEarnedDate = newWorkoutDate.toISOString().split('T')[0];
            console.log(`Streak freeze earned! Total: ${updatedStreak.streakFreezes}`);
            toast({
              title: "Streak Freeze Earned!",
              description: `You reached a ${updatedStreak.currentStreak}-day streak! You now have ${updatedStreak.streakFreezes} freeze(s).`,
            });
       }
   }


   saveStreakData(updatedStreak);
   return updatedStreak;
};


// --- Check and Reset Logic (Called on Load/Initialization) ---
// This function checks for inactivity gaps and automatically uses freezes if possible.
const checkAndResetStreak = (data: StreakData): StreakData => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWorkoutDate = data.lastWorkoutDate ? new Date(data.lastWorkoutDate) : null;

    if (!lastWorkoutDate || isSameDay(today, lastWorkoutDate)) {
        return data; // No workouts logged yet, or last workout was today - streak OK.
    }

    const daysSinceLast = differenceInDays(today, lastWorkoutDate);

    if (daysSinceLast === 1) {
       return data; // Last workout was yesterday - streak OK.
    }

    if (daysSinceLast > 1) {
        // Check for Sunday rest day exception:
        // If today is Monday (daysSinceLast == 2 from Saturday) and the missed day was Sunday.
        const yesterday = subDays(today, 1);
        if (daysSinceLast === 2 && isSunday(yesterday)) {
            console.log("Streak preserved: Sunday was a rest day.");
            return data; // Don't break streak, don't use freeze.
        }

        // Gap detected, try to use freezes automatically.
        const gapDays = daysSinceLast - 1; // Number of full days missed.
        if (data.streakFreezes >= gapDays) {
            // Use freezes to cover the gap.
            data.streakFreezes -= gapDays;
            // IMPORTANT: To prevent the streak from breaking *again* tomorrow if no workout today,
            // we conceptually move the last workout date forward to yesterday.
            // This doesn't represent a real workout, but keeps the streak alive.
            data.lastWorkoutDate = yesterday.toISOString().split('T')[0];
            // data.currentStreak remains unchanged.

            console.log(`Streak preserved: Automatically used ${gapDays} freeze(s). Remaining: ${data.streakFreezes}`);
            toast({
              title: "Streak Saved!",
              description: `Used ${gapDays} freeze(s) to cover missed days. Your streak continues! Remaining: ${data.streakFreezes}.`,
              variant: "default", // Or maybe a success variant
            });
            saveStreakData(data); // Save the updated data with used freezes and adjusted date.
        } else {
            // Not enough freezes, streak is broken.
            console.log(`Streak reset: Missed ${gapDays} day(s) with only ${data.streakFreezes} freeze(s) available.`);
            toast({
              title: "Streak Reset",
              description: `You missed ${gapDays} day(s) and didn't have enough freezes. Keep going!`,
              variant: "destructive",
            });
            data.currentStreak = 0;
            // lastWorkoutDate remains the same (the actual last workout).
            saveStreakData(data); // Save the reset streak.
        }
    }

    return data;
};


// --- Persistence ---

const saveStreakData = (data: StreakData) => {
  try {
    // Ensure lastWorkoutDate and lastFreezeEarnedDate are strings before saving
    const dataToSave = {
        ...data,
        lastWorkoutDate: data.lastWorkoutDate instanceof Date ? data.lastWorkoutDate.toISOString().split('T')[0] : data.lastWorkoutDate,
        lastFreezeEarnedDate: data.lastFreezeEarnedDate instanceof Date ? data.lastFreezeEarnedDate.toISOString().split('T')[0] : data.lastFreezeEarnedDate,
    };
    localStorage.setItem(STREAK_DATA_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Error saving streak data to localStorage:", error);
    // Optionally notify the user if saving fails
  }
};

// --- Reset Function ---

export const resetStreakData = (): StreakData => {
    const initialData: StreakData = {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakFreezes: 0,
        lastFreezeEarnedDate: null,
    };
    try {
        localStorage.removeItem(STREAK_DATA_KEY);
    } catch (error) {
        console.error("Error removing streak data from localStorage:", error);
    }
    return initialData;
};

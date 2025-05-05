
import type { Workout, StreakData } from '@/types/workout';
import { toast } from '@/hooks/use-toast';

const XP_KEY = 'fitTrackUserXP';

// --- XP Calculation Constants ---
const BASE_WORKOUT_XP = 10;
const DAILY_GOAL_COMPLETION_XP = 5; // XP for hitting a daily target within a larger goal
const GOAL_COMPLETION_BASE_XP = 100; // Base XP for finishing a whole goal period
const STREAK_MILESTONE_XP: { [key: number]: number } = {
    7: 50,
    14: 100,
    30: 250,
    60: 500,
    // Add more milestones as needed
};
// Intensity multiplier (optional, can add complexity)
// const INTENSITY_MULTIPLIER = { low: 0.8, medium: 1.0, high: 1.2 };

// --- XP Event Types ---
type XpEvent =
    | { type: 'log_workout'; workout: Workout }
    | { type: 'complete_goal'; goalId: string; goalTitle: string; difficultyMultiplier?: number }
    | { type: 'complete_daily_target'; goalId: string }; // Potentially add later for daily goal hits

// --- Main XP Calculation Function ---
/**
 * Calculates the new XP total based on an event and the current XP.
 * Also handles awarding XP for streak milestones reached *due to this event*.
 * @param currentXp The user's current XP total.
 * @param event The event triggering the XP calculation (e.g., logging workout, completing goal).
 * @param currentStreakData The *current* state of the user's streak data (after potential updates). Optional, as goal completion might not directly involve streak data.
 * @param previousStreakData The state of the user's streak data *before* the event. Required for milestone detection when logging workouts. Optional otherwise.
 * @returns The new XP total.
 */
export const calculateXp = (
    currentXp: number,
    event: XpEvent,
    currentStreakData?: StreakData | null, // Make optional
    previousStreakData?: StreakData | null // Make optional
): number => {
    let xpGained = 0;
    let toastTitle = '';
    let toastDescription = '';

    switch (event.type) {
        case 'log_workout':
            xpGained = BASE_WORKOUT_XP;
            // Optional: xpGained *= INTENSITY_MULTIPLIER[event.workout.intensity];
            // Toast is handled in WorkoutContext now to include calories

            // Check for streak milestone achievement ONLY if streak data is provided
            if (currentStreakData && previousStreakData) {
                const previousStreak = previousStreakData.currentStreak;
                const currentStreak = currentStreakData.currentStreak;

                // Check if the current streak just crossed a milestone threshold compared to the previous streak
                for (const milestoneDays of Object.keys(STREAK_MILESTONE_XP).map(Number).sort((a, b) => a - b)) {
                    // Ensure currentStreak and previousStreak are valid numbers before comparison
                    if (typeof currentStreak === 'number' && typeof previousStreak === 'number' && currentStreak >= milestoneDays && previousStreak < milestoneDays) {
                        const milestoneXp = STREAK_MILESTONE_XP[milestoneDays];
                        xpGained += milestoneXp;
                        console.log(`Streak Milestone Reached (${milestoneDays} days): +${milestoneXp} XP`);
                         // Display separate toast for milestone achievement
                         toast({
                            title: `🔥 ${milestoneDays}-Day Streak Milestone!`,
                            description: `Awesome job! +${milestoneXp} XP`,
                         });
                         // Award only the first milestone crossed in this update
                         break;
                    }
                }
            }
            break;

        case 'complete_goal':
            // More complex goals might give more XP
            xpGained = GOAL_COMPLETION_BASE_XP * (event.difficultyMultiplier || 1);
            toastTitle = 'Goal Completed!';
            toastDescription = `"${event.goalTitle}" +${Math.round(xpGained)} XP`;
            // Display toast for goal completion
            toast({ title: toastTitle, description: toastDescription });
            // No direct streak check needed here, streak updates happen when logging workouts that contribute to the goal
            break;

        case 'complete_daily_target': // Example for future enhancement
            xpGained = DAILY_GOAL_COMPLETION_XP;
            // toastTitle = 'Daily Target Met!';
            // toastDescription = `Goal progress +${xpGained} XP`;
            // Avoid toast for daily target hits to prevent spam? Or maybe consolidate.
            break;
    }

    const roundedXpGained = Math.round(xpGained);
    const newTotalXp = currentXp + roundedXpGained;

    saveXp(newTotalXp); // Save the new total
    return newTotalXp;
};

// --- Persistence ---

/**
 * Loads the user's XP from localStorage.
 * @returns The stored XP value, or 0 if not found or invalid.
 */
export const loadXp = (): number => {
    try {
        const storedXp = localStorage.getItem(XP_KEY);
        if (storedXp) {
            const parsedXp = parseInt(storedXp, 10);
            return !isNaN(parsedXp) ? parsedXp : 0;
        }
    } catch (error) {
        console.error("Error reading XP from localStorage:", error);
    }
    return 0;
};

/**
 * Saves the user's XP to localStorage.
 * @param xp The XP value to save.
 */
const saveXp = (xp: number) => {
    try {
        localStorage.setItem(XP_KEY, xp.toString());
    } catch (error) {
        console.error("Error saving XP to localStorage:", error);
        toast({
            title: "XP Save Error",
            description: "Could not save your latest XP progress.",
            variant: "destructive",
        });
    }
};

/**
 * Resets the user's XP in localStorage to 0.
 * @returns The initial XP value (0).
 */
export const resetXp = (): number => {
    try {
        localStorage.removeItem(XP_KEY);
    } catch (error) {
        console.error("Error removing XP from localStorage:", error);
    }
    return 0;
};

    


'use server';
/**
 * @fileOverview Calculates estimated calories burned during a workout.
 *
 * - calculateCaloriesBurned - A function that estimates calories burned.
 * - CalculateCaloriesInput - The input type for the function.
 * - CalculateCaloriesOutput - The return type for the function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// IMPORTANT NOTE: Although this flow currently uses a formula for calculation,
// it still relies on the Genkit setup in `src/ai/ai-instance.ts`.
// That setup initializes the `googleAI` plugin, which REQUIRES the
// `GOOGLE_GENAI_API_KEY` environment variable to be set correctly.
// The Genkit development server (`npm run genkit:dev`) must also be running.

// Define simplified MET values within the flow for better context
const metValues: { [key: string]: number } = {
  running: 9.8,
  cycling: 7.5,
  weightlifting: 5.0,
  yoga: 2.5,
  swimming: 8.0,
  walking: 3.5,
  dancing: 5.5,
  hiking: 6.0,
  rowing: 7.0,
  other: 4.0, // Generic fallback
};

// Define MET multipliers based on intensity
const intensityMultipliers: { [key: string]: number } = {
  low: 0.8,
  medium: 1.0,
  high: 1.2,
};

// Define Input Schema
const CalculateCaloriesInputSchema = z.object({
  exerciseType: z.string().describe('The type of exercise performed (e.g., running, yoga).'),
  duration: z.number().positive().describe('The duration of the workout in minutes.'),
  intensity: z.enum(['low', 'medium', 'high']).describe('The intensity level of the workout.'),
  userWeightKg: z.number().positive().describe('The user\'s weight in kilograms.'),
});
export type CalculateCaloriesInput = z.infer<typeof CalculateCaloriesInputSchema>;

// Define Output Schema
const CalculateCaloriesOutputSchema = z.object({
  caloriesBurned: z.number().int().describe('The estimated number of calories burned, rounded to the nearest whole number.'),
});
export type CalculateCaloriesOutput = z.infer<typeof CalculateCaloriesOutputSchema>;

// Exported async function wrapper
export async function calculateCaloriesBurned(input: CalculateCaloriesInput): Promise<CalculateCaloriesOutput> {
  return calculateCaloriesFlow(input);
}

// Define the Genkit Flow
const calculateCaloriesFlow = ai.defineFlow<
  typeof CalculateCaloriesInputSchema,
  typeof CalculateCaloriesOutputSchema
>(
  {
    name: 'calculateCaloriesFlow',
    inputSchema: CalculateCaloriesInputSchema,
    outputSchema: CalculateCaloriesOutputSchema,
  },
  async (input) => {
    // Get the base MET value for the exercise type, default to 'other' if not found
    const baseMet = metValues[input.exerciseType.toLowerCase()] || metValues.other;

    // Get the intensity multiplier
    const multiplier = intensityMultipliers[input.intensity];

    // Adjust MET based on intensity
    const adjustedMet = baseMet * multiplier;

    // Formula: Calories Burned = MET * Weight (kg) * Duration (hours)
    const durationHours = input.duration / 60;
    const calories = adjustedMet * input.userWeightKg * durationHours;

    // Round to the nearest whole number
    const roundedCalories = Math.round(calories);

    // Return the result matching the output schema
    return {
      caloriesBurned: roundedCalories,
    };
  }
);

// Note: This flow currently uses a simple formula.
// For more complex scenarios or AI-driven estimation based on user input,
// you could define an ai.definePrompt within this flow and call an LLM.
// Example:
/*
const caloriePrompt = ai.definePrompt({
  name: 'calorieEstimationPrompt',
  input: { schema: CalculateCaloriesInputSchema },
  output: { schema: CalculateCaloriesOutputSchema },
  prompt: `Estimate the calories burned for a workout with the following details:
  - Type: {{{exerciseType}}}
  - Duration: {{{duration}}} minutes
  - Intensity: {{{intensity}}}
  - User Weight: {{{userWeightKg}}} kg

  Provide only the estimated calorie number.`,
});

const calculateCaloriesFlowWithAI = ai.defineFlow< ... > (
  { ... },
  async (input) => {
    const { output } = await caloriePrompt(input);
    return output!;
  }
);
*/



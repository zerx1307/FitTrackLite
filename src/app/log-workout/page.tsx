
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Dumbbell, Clock, Flame, Weight } from "lucide-react"; // Added Weight icon

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Use RadioGroup
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { useWorkouts } from "@/contexts/WorkoutContext"; // Import the context hook
import type { Workout } from "@/types/workout"; // Import the shared type
import { calculateCaloriesBurned } from "@/ai/flows/calculate-calories-flow"; // Import the Genkit flow


// Workout types for RadioGroup
const workoutTypes = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "weightlifting", label: "Weightlifting" },
  { value: "yoga", label: "Yoga" },
  { value: "swimming", label: "Swimming" },
  { value: "walking", label: "Walking" },
  { value: "dancing", label: "Dancing" },
  { value: "hiking", label: "Hiking" },
  { value: "rowing", label: "Rowing" },
  { value: "other", label: "Other" },
];

// Intensity levels for RadioGroup
const intensityLevels = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
]

// Adjusted schema: remove caloriesBurned, add userWeightKg
const workoutFormSchema = z.object({
  date: z.date({
    required_error: "Workout date is required.",
  }),
  exerciseType: z.string({
    required_error: "Please select an exercise type.",
  }),
  duration: z.coerce.number().positive({
    message: "Duration must be a positive number.",
  }),
  intensity: z.enum(["low", "medium", "high"], {
    required_error: "Please select an intensity level.",
  }),
  userWeightKg: z.coerce.number().positive({ // Add weight field
    message: "Weight must be a positive number.",
  }),
  notes: z.string().max(200, { message: "Notes cannot exceed 200 characters." }).optional(),
});

// Type based on the schema
type WorkoutFormValues = z.infer<typeof workoutFormSchema>;

// Default values
const defaultValues: Partial<WorkoutFormValues> = {
  date: new Date(),
  duration: 30,
  intensity: "medium",
  userWeightKg: 70, // Default to 70kg, will be updated from storage if available
};

export default function LogWorkoutPage() {
  const { toast } = useToast();
  const { addWorkout } = useWorkouts(); // Get addWorkout function from context
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastUsedWeight, setLastUsedWeight] = React.useState<number | undefined>(defaultValues.userWeightKg);

  // Form Initialization with potentially loaded weight
    const form = useForm<WorkoutFormValues>({
      resolver: zodResolver(workoutFormSchema),
      defaultValues: {
          ...defaultValues,
          userWeightKg: lastUsedWeight, // Initialize with state
      },
      mode: "onChange",
  });

  // Load last used weight from localStorage on mount and update form default
  React.useEffect(() => {
    const storedWeight = localStorage.getItem('lastUserWeightKg');
    let weightToUse = defaultValues.userWeightKg; // Start with default
    if (storedWeight) {
        const weight = parseFloat(storedWeight);
        if (!isNaN(weight) && weight > 0) {
             weightToUse = weight; // Use stored weight if valid
        }
    }
    setLastUsedWeight(weightToUse); // Update state
    form.reset({ // Reset form with the determined weight
        ...defaultValues,
        userWeightKg: weightToUse,
        date: new Date(), // Ensure date is reset to today
        exerciseType: undefined, // Clear previous selections
        duration: 30,
        intensity: "medium",
        notes: "",
    });
  }, [form]); // Rerun if form instance changes (shouldn't normally)


  async function onSubmit(data: WorkoutFormValues) {
     setIsSubmitting(true);
    try {
      // 1. Calculate Calories using the Genkit flow
      const calorieResult = await calculateCaloriesBurned({
          exerciseType: data.exerciseType,
          duration: data.duration,
          intensity: data.intensity,
          userWeightKg: data.userWeightKg,
      });

       // 2. Save the user's weight to localStorage for next time
       localStorage.setItem('lastUserWeightKg', data.userWeightKg.toString());
       setLastUsedWeight(data.userWeightKg); // Update state for immediate reflection if needed

      // 3. Create the full Workout object including calculated calories
      const workoutToLog: Omit<Workout, 'id'> = {
          ...data,
          caloriesBurned: calorieResult.caloriesBurned,
      };

      // 4. Use the addWorkout function from the context (which now handles XP and toast)
      addWorkout(workoutToLog);

      // 5. Reset form, keeping the last used weight
      form.reset({
          ...defaultValues,
          userWeightKg: data.userWeightKg, // Keep the entered weight
          date: new Date(), // Reset date to today
          exerciseType: undefined,
          duration: 30,
          intensity: "medium",
          notes: "",
      });

    } catch (error) {
        console.error("Error logging workout or calculating calories:", error);
        // Check if it's a Genkit server error
        if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'))) {
             toast({
                title: "Error Reaching Calculation Server",
                description: "Could not connect to the calorie calculation service. Please ensure the Genkit server is running (npm run genkit:dev) and try again.",
                variant: "destructive",
                duration: 7000,
            });
        } else {
            toast({
                title: "Error Logging Workout",
                description: "Could not calculate calories or save workout. Please try again.",
                variant: "destructive",
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto"> {/* Centered content */}
      <h1 className="text-3xl font-bold tracking-tight text-center">Log Your Workout</h1>
      <Card className="shadow-lg border border-border/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl"><Dumbbell className="h-6 w-6 text-primary" /> Enter Workout Details</CardTitle>
          <CardDescription>Keep track of your fitness activities. Calories will be calculated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               {/* Date Picker - Row 1 */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-semibold">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Exercise Type - Row 2 */}
              <FormField
                control={form.control}
                name="exerciseType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-semibold">Exercise Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value} // Ensure value is controlled
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                      >
                        {workoutTypes.map((type) => (
                          <FormItem key={type.value} className="flex items-center space-x-3 space-y-0">
                             <Card className={`p-4 flex-1 cursor-pointer hover:border-primary transition-colors ${field.value === type.value ? 'border-primary border-2 bg-primary/5' : 'border-border'}`}>
                                <FormControl>
                                    <RadioGroupItem value={type.value} id={`type-${type.value}`} className="sr-only" />
                                </FormControl>
                                <FormLabel htmlFor={`type-${type.value}`} className="font-normal cursor-pointer flex flex-col items-center gap-2 w-full">
                                    {/* Optional: Add icons here */}
                                    <span className="text-center">{type.label}</span>
                                </FormLabel>
                             </Card>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration and Weight - Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold flex items-center gap-1"><Clock className="h-4 w-4" /> Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} value={isNaN(field.value ?? NaN) ? '' : field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="userWeightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-1"><Weight className="h-4 w-4" /> Your Weight (kg)</FormLabel>
                        <FormControl>
                           <Input type="number" step="0.1" placeholder="e.g., 70.5" {...field} value={isNaN(field.value ?? NaN) ? '' : field.value ?? ''}/>
                        </FormControl>
                         <FormDescription>Used for calorie calculation. We'll remember this for next time.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* Intensity - Row 4 */}
              <FormField
                control={form.control}
                name="intensity"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-semibold">Intensity</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value} // Ensure value is controlled
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        {intensityLevels.map(level => (
                             <FormItem key={level.value} className="flex-1">
                                <FormControl>
                                     <RadioGroupItem value={level.value} id={`intensity-${level.value}`} className="sr-only" />
                                </FormControl>
                                <FormLabel
                                    htmlFor={`intensity-${level.value}`}
                                    className={`flex items-center justify-center p-4 rounded-md border cursor-pointer transition-colors ${field.value === level.value ? 'border-primary border-2 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                >
                                     {/* Optional: Add visual indicator like Flame icon with varying fill */}
                                    <Flame className={`mr-2 h-4 w-4 ${
                                        level.value === 'low' ? 'text-green-500' : level.value === 'medium' ? 'text-orange-500' : 'text-red-500'
                                    }`} />
                                    {level.label}
                                </FormLabel>
                             </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

             {/* Notes (Optional) - Row 5 */}
             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any details about your workout..."
                        className="resize-none"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                     <FormDescription>Max 200 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button - Row 6 */}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 btn-animated py-3 text-lg" disabled={isSubmitting}>
                 {isSubmitting ? "Logging..." : "Log Workout"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


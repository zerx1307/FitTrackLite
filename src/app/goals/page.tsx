
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Target, PlusCircle, Edit, Trash2, CheckCircle, AlertTriangle, CalendarDays, Activity, Clock, Zap, Calendar as CalendarIcon, Plus, Minus } from "lucide-react"; // Added Plus and Minus icons
import { addDays, addWeeks, addMonths, format, differenceInDays, isWithinInterval, startOfDay, endOfDay, isSameDay, isValid, parseISO } from 'date-fns';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkouts } from "@/contexts/WorkoutContext"; // Import context
import { Skeleton } from "@/components/ui/skeleton";
import type { Workout } from "@/types/workout";
import { cn } from "@/lib/utils";

// Goal Type Enum
const GoalTypeEnum = z.enum(["duration", "distance", "frequency", "calories"]);
// Duration Type Enum
const DurationTypeEnum = z.enum(["days", "weeks", "months"]);

// Goal Schema - Refactored for daily target over a duration
const goalFormSchema = z.object({
  id: z.string().optional(), // For editing
  title: z.string().min(3, { message: "Goal title must be at least 3 characters." }).max(50),
  type: GoalTypeEnum,
  dailyTargetValue: z.coerce.number().positive({ message: "Daily target value must be positive." }),
  startDate: z.date({ required_error: "Start date is required." }).refine(date => isValid(date), { message: "Invalid start date." }),
  durationValue: z.coerce.number().int().positive({ message: "Duration must be a positive whole number." }),
  durationType: DurationTypeEnum,
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

// Goal data structure - Refactored
interface Goal extends GoalFormValues {
  id: string; // Ensure ID is always present after creation
  createdAt: Date;
  unit: string; // Store the unit for display
  completed: boolean; // Track completion status
  completedAt?: Date | null; // Track completion date
}

// Goal types details
const goalTypes = [
    { value: "duration", label: "Duration", icon: Clock, unit: "minutes" },
    { value: "distance", label: "Distance", icon: Activity, unit: "km" }, // Consider adding miles later
    { value: "frequency", label: "Frequency", icon: CalendarDays, unit: "workouts" },
    { value: "calories", label: "Calories", icon: Zap, unit: "kcal" },
];

// Duration types for Select
const durationTypes = [
    { value: "days", label: "Days" },
    { value: "weeks", label: "Weeks" },
    { value: "months", label: "Months" },
];

// Helper to safely parse date string or return null
const safeParseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
};

// Helper to get unit based on type
const getUnitByType = (type: z.infer<typeof GoalTypeEnum>): string => {
   const goalType = goalTypes.find(gt => gt.value === type);
   return goalType?.unit || '';
};

// Helper to get icon based on type
const getIconByType = (type: z.infer<typeof GoalTypeEnum>) => {
    const goalType = goalTypes.find(gt => gt.value === type);
    return goalType?.icon || Target; // Default to Target icon
};

// Helper to calculate end date
const calculateEndDate = (startDate: Date | null, durationValue: number, durationType: z.infer<typeof DurationTypeEnum>): Date | null => {
    if (!startDate || !isValid(startDate)) return null; // Check if startDate is valid

    try {
        switch(durationType) {
            case 'days': return endOfDay(addDays(startDate, durationValue - 1)); // Include start day, end at end of last day
            case 'weeks': return endOfDay(addWeeks(startDate, durationValue));
            case 'months': return endOfDay(addMonths(startDate, durationValue));
            default: return startDate;
        }
    } catch (e) {
        console.error("Error calculating end date:", e);
        return null;
    }
};

// Helper to calculate total days in duration
const calculateTotalDays = (startDate: Date | null, endDate: Date | null): number => {
    if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || endDate < startDate) return 0;
    // Use startOfDay for both to get accurate inclusive day count
    return differenceInDays(endOfDay(endDate), startOfDay(startDate)) + 1;
};


// Helper to calculate goal progress based on workouts
const calculateGoalProgress = (goal: Goal, workouts: Workout[]): { daysMet: number; totalDaysInDuration: number; progressPercentage: number; isConsideredComplete: boolean } => {
    const startDate = goal.startDate instanceof Date && isValid(goal.startDate) ? startOfDay(goal.startDate) : null;
    if (!startDate) return { daysMet: 0, totalDaysInDuration: 0, progressPercentage: 0, isConsideredComplete: false };

    const endDate = calculateEndDate(startDate, goal.durationValue, goal.durationType);
    if (!endDate) return { daysMet: 0, totalDaysInDuration: 0, progressPercentage: 0, isConsideredComplete: false };

    const totalDaysInDuration = calculateTotalDays(startDate, endDate);
    if (totalDaysInDuration <= 0) return { daysMet: 0, totalDaysInDuration: 0, progressPercentage: 0, isConsideredComplete: false };

    let daysMet = 0;

    // Filter relevant workouts first
    const relevantWorkouts = workouts.filter(w => {
        const workoutDate = w.date instanceof Date ? w.date : safeParseDate(w.date as unknown as string); // Ensure date handling
        return workoutDate && isValid(workoutDate) && isWithinInterval(workoutDate, { start: startDate, end: endDate });
    });

    for (let i = 0; i < totalDaysInDuration; i++) {
        const currentDate = startOfDay(addDays(startDate, i));
        const workoutsOnCurrentDay = relevantWorkouts.filter(w => {
             const workoutDate = w.date instanceof Date ? w.date : safeParseDate(w.date as unknown as string);
            return workoutDate && isValid(workoutDate) && isSameDay(workoutDate, currentDate);
        });

        if (workoutsOnCurrentDay.length === 0) continue; // No workouts, target not met

        let dailySum = 0;
        switch (goal.type) {
            case 'duration':
                dailySum = workoutsOnCurrentDay.reduce((sum, w) => sum + (w.duration || 0), 0);
                break;
            case 'distance':
                // Assuming workouts might have a distance property in the future
                // If not, this goal type might not be accurately trackable yet
                dailySum = 0; // Placeholder - Requires workout data structure update or alternative logic
                break;
            case 'frequency':
                dailySum = workoutsOnCurrentDay.length; // Count workouts
                break;
            case 'calories':
                dailySum = workoutsOnCurrentDay.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
                break;
        }

        if (dailySum >= goal.dailyTargetValue) {
            daysMet++;
        }
    }

    const progressPercentage = Math.min(100, Math.round((daysMet / totalDaysInDuration) * 100));
    // Consider the goal complete if 100% of the target days are met
    const isConsideredComplete = progressPercentage >= 100;

    return { daysMet, totalDaysInDuration, progressPercentage, isConsideredComplete };
};


export default function GoalsPage() {
  const { toast } = useToast();
  const { workouts, loading: workoutsLoading, logGoalCompletion } = useWorkouts(); // Get workouts, loading state, and logGoalCompletion
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
  const [loadingGoals, setLoadingGoals] = React.useState(true); // Separate loading state for goals

  // --- Form Logic ---
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      type: "frequency",
      dailyTargetValue: 1,
      startDate: new Date(), // Default to today
      durationValue: 30,
      durationType: "days",
    },
    mode: "onChange",
  });

   // Load goals from localStorage
    React.useEffect(() => {
        setLoadingGoals(true);
        try {
            const storedGoals = localStorage.getItem('fitnessGoals');
            if (storedGoals) {
                const parsedGoals = JSON.parse(storedGoals);
                // Validate and transform loaded data
                const validGoals = parsedGoals.map((g: any) => {
                     const startDate = safeParseDate(g.startDate);
                     const createdAt = safeParseDate(g.createdAt);
                     const completedAt = safeParseDate(g.completedAt);

                     // Basic validation to ensure essential fields exist and dates are valid
                     if (!g.id || !g.title || !g.type || !startDate || !createdAt) {
                         console.warn("Skipping invalid goal data:", g);
                         return null;
                     }

                     return {
                         ...g,
                         startDate: startDate,
                         createdAt: createdAt,
                         completedAt: completedAt, // Can be null
                         unit: getUnitByType(g.type as z.infer<typeof GoalTypeEnum>),
                         completed: g.completed ?? false,
                         // Ensure numeric types are numbers
                         dailyTargetValue: Number(g.dailyTargetValue) || 0,
                         durationValue: Number(g.durationValue) || 0,
                     };
                }).filter((g: Goal | null): g is Goal => g !== null); // Filter out nulls

                setGoals(validGoals);
            } else {
                setGoals([]);
            }
        } catch (error) {
            console.error("Failed to load goals from localStorage:", error);
            toast({ title: "Error", description: "Could not load goal data.", variant: "destructive" });
            setGoals([]);
        } finally {
            setLoadingGoals(false);
        }
    }, [toast]);

   // Function to mark goal as complete and award XP
    const markGoalAsComplete = React.useCallback((goalId: string) => {
        setGoals(prevGoals => {
            const goalIndex = prevGoals.findIndex(g => g.id === goalId);
            if (goalIndex === -1 || prevGoals[goalIndex].completed) {
                return prevGoals; // Goal not found or already completed
            }

            const updatedGoals = [...prevGoals];
            const completedGoal = {
                ...updatedGoals[goalIndex],
                completed: true,
                completedAt: new Date(),
            };
            updatedGoals[goalIndex] = completedGoal;

            // Calculate difficulty multiplier (example: longer duration = harder)
            const startDate = completedGoal.startDate instanceof Date ? completedGoal.startDate : safeParseDate(completedGoal.startDate as unknown as string);
            const endDate = startDate ? calculateEndDate(startDate, completedGoal.durationValue, completedGoal.durationType) : null;
            const durationInDays = startDate && endDate ? calculateTotalDays(startDate, endDate) : 0;
            const difficultyMultiplier = 1 + Math.log10(Math.max(1, durationInDays / 7)); // Example formula

            logGoalCompletion(completedGoal.id, completedGoal.title, difficultyMultiplier); // Award XP via context

            // Save updated goals list (handled by separate effect)
            return updatedGoals;
        });
   }, [logGoalCompletion]); // Dependency on logGoalCompletion


    // Check for goal completion status whenever workouts or goals change
    React.useEffect(() => {
        if (!loadingGoals && !workoutsLoading) {
            goals.forEach(goal => {
                if (!goal.completed) {
                    const { isConsideredComplete } = calculateGoalProgress(goal, workouts);
                    if (isConsideredComplete) {
                         // Check again inside to prevent race conditions if multiple updates happen quickly
                        if (!goal.completed) {
                             markGoalAsComplete(goal.id);
                        }
                    }
                }
            });
        }
    }, [goals, workouts, loadingGoals, workoutsLoading, markGoalAsComplete]);


    // Save goals to localStorage whenever they change (excluding completion checks)
    React.useEffect(() => {
        if (!loadingGoals) { // Only save after initial load/reset
            try {
                // Ensure dates are stored correctly (as ISO strings)
                const goalsToStore = goals.map(g => ({
                    ...g,
                    startDate: g.startDate instanceof Date && isValid(g.startDate) ? g.startDate.toISOString() : null,
                    createdAt: g.createdAt instanceof Date && isValid(g.createdAt) ? g.createdAt.toISOString() : null,
                    completedAt: g.completedAt instanceof Date && isValid(g.completedAt) ? g.completedAt.toISOString() : null,
                }));
                localStorage.setItem('fitnessGoals', JSON.stringify(goalsToStore));
            } catch (error) {
                console.error("Failed to save goals to localStorage:", error);
                toast({ title: "Error", description: "Could not save goal data.", variant: "destructive" });
            }
        }
    }, [goals, loadingGoals, toast]);


    // Reset form when editingGoal changes or dialog closes/opens
    React.useEffect(() => {
        if (isDialogOpen) {
            if (editingGoal) {
                 const startDate = editingGoal.startDate instanceof Date && isValid(editingGoal.startDate)
                                    ? editingGoal.startDate
                                    : new Date(); // Fallback if date is invalid
                form.reset({
                    ...editingGoal,
                    startDate: startDate, // Ensure valid date object for form
                    dailyTargetValue: Number(editingGoal.dailyTargetValue) || 1, // Ensure number
                    durationValue: Number(editingGoal.durationValue) || 30, // Ensure number
                });
            } else {
                // Reset to default values for adding a new goal
                form.reset({
                    title: "",
                    type: "frequency",
                    dailyTargetValue: 1,
                    startDate: new Date(),
                    durationValue: 30,
                    durationType: "days",
                    id: undefined, // Ensure ID is undefined for new goals
                });
            }
        } else {
             // Optionally clear editing state when dialog closes without submit
             // setEditingGoal(null);
        }
    }, [editingGoal, form, isDialogOpen]);


  function handleAddOrUpdateGoal(data: GoalFormValues) {
    const unit = getUnitByType(data.type);
     const startDate = data.startDate instanceof Date && isValid(data.startDate) ? data.startDate : new Date(); // Ensure valid date

    if (editingGoal) {
      // Update existing goal - reset completion status if dates/targets change significantly
      setGoals(goals.map(g => g.id === editingGoal.id ? {
          ...g, // Keep original createdAt, etc.
          ...data, // Apply form data updates
          startDate: startDate, // Ensure updated date is valid
          unit,
          completed: false, // Reset completion on edit
          completedAt: null,
      } : g));
      toast({ title: "Goal Updated!", description: `"${data.title}" updated successfully.` });
    } else {
      // Add new goal
      const newGoal: Goal = {
        ...data,
        id: `goal_${Date.now()}_${Math.random().toString(16).slice(2)}`, // Simple unique ID
        startDate: startDate, // Ensure valid date
        createdAt: new Date(), // Set creation date
        unit: unit,
        completed: false, // Initialize as not completed
        completedAt: null,
      };
      setGoals(prevGoals => [...prevGoals, newGoal]); // Add to existing goals
      toast({ title: "Goal Added!", description: `New goal "${data.title}" created.` });
    }
    setEditingGoal(null); // Clear editing state
    setIsDialogOpen(false); // Close dialog
  }

  function handleDeleteGoal(goalId: string) {
     setGoals(goals.filter(g => g.id !== goalId));
     toast({ title: "Goal Deleted", description: "The goal has been removed.", variant: "destructive" });
  }


   // Function to increment/decrement daily target value in the form
    const adjustFormDailyTargetValue = (amount: number) => {
        const currentVal = form.getValues("dailyTargetValue") || 0;
        const newVal = Math.max(1, currentVal + amount); // Ensure target is at least 1
        form.setValue("dailyTargetValue", newVal, { shouldValidate: true });
    };

   // --- UI Rendering ---
   const renderGoalFormFields = () => (
        <>
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Goal Title</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Run daily for a month" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel className="font-semibold">Goal Type</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                        {goalTypes.map((type) => (
                        <FormItem key={type.value} className="flex-1">
                            <FormControl>
                                <RadioGroupItem value={type.value} id={`type-${type.value}`} className="sr-only" />
                            </FormControl>
                            <FormLabel
                                htmlFor={`type-${type.value}`}
                                className={`flex flex-col items-center justify-center p-3 rounded-md border cursor-pointer transition-colors ${field.value === type.value ? 'border-primary border-2 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                            >
                                <type.icon className="h-5 w-5 mb-1 text-muted-foreground group-hover:text-primary" />
                                {type.label}
                            </FormLabel>
                        </FormItem>
                        ))}
                    </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="dailyTargetValue"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Daily Target ({getUnitByType(form.watch('type'))})</FormLabel>
                    <div className="flex items-center space-x-2">
                         <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => adjustFormDailyTargetValue(-1)}
                            disabled={field.value <= 1}
                            className="h-8 w-8"
                         >
                           <Minus className="h-4 w-4" />
                         </Button>
                        <FormControl>
                        <Input
                            type="number"
                            placeholder="e.g., 5"
                            {...field}
                            value={field.value ?? ''} // Use empty string if null/undefined
                            onChange={e => field.onChange(e.target.valueAsNumber || 0)} // Ensure value is number
                            min="1" // Ensure positive integer
                            className="flex-1 text-center" // Adjust width if needed
                        />
                        </FormControl>
                         <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => adjustFormDailyTargetValue(1)}
                            className="h-8 w-8"
                         >
                           <Plus className="h-4 w-4" />
                         </Button>
                    </div>
                     <FormDescription>The target value you aim to achieve each day.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-semibold">Start Date</FormLabel>
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
                            {/* Ensure field.value is a valid Date before formatting */}
                            {(field.value instanceof Date && isValid(field.value)) ? format(field.value, "PPP") : <span>Pick a start date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value instanceof Date && isValid(field.value) ? field.value : undefined} // Pass valid Date or undefined
                          onSelect={(date) => field.onChange(date || new Date())} // Handle undefined selection
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                     <FormDescription>The day your goal period begins.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
            />

           <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold">Duration Value</FormLabel>
                        <FormControl>
                        <Input
                            type="number"
                            placeholder="e.g., 30"
                            {...field}
                            value={field.value ?? ''} // Use empty string if null/undefined
                            onChange={e => field.onChange(e.target.valueAsNumber || 1)} // Default to 1 if invalid
                            min="1" // Ensure positive integer
                         />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="durationType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">Duration Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {durationTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
           </div>
             <FormDescription>Set the total duration for this goal.</FormDescription>
        </>
    );

    const isLoading = loadingGoals || workoutsLoading;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Your Fitness Goals</h1>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-animated" onClick={() => setEditingGoal(null)} disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                 <DialogTitle className="text-xl">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
                 <DialogDescription>
                   {editingGoal ? 'Update the details of your fitness goal.' : 'Set a new fitness goal with a daily target over a duration.'}
                 </DialogDescription>
               </DialogHeader>
               <Form {...form}>
                  {/* Ensure form submission uses the correct handler */}
                  <form onSubmit={form.handleSubmit(handleAddOrUpdateGoal)} className="space-y-5 py-4 max-h-[70vh] overflow-y-auto pr-2">
                     {renderGoalFormFields()}
                     <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                       <DialogClose asChild>
                         <Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button>
                       </DialogClose>
                       <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={form.formState.isSubmitting}>
                         {editingGoal ? 'Update Goal' : 'Add Goal'}
                       </Button>
                     </DialogFooter>
                  </form>
                </Form>
             </DialogContent>
          </Dialog>
      </div>

      {/* Goals List */}
       {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                  <Card key={`skel-${i}`} className="shadow-md">
                      <CardHeader className="pb-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-5 w-1/4 mt-1" />
                      </CardHeader>
                      <CardContent className="pt-0">
                          <Skeleton className="h-3 w-full mb-2" />
                          <div className="flex justify-between">
                             <Skeleton className="h-4 w-1/3" />
                             <Skeleton className="h-4 w-1/4" />
                          </div>
                          <div className="mt-4 flex gap-2 justify-end">
                              <Skeleton className="h-7 w-7 rounded" />
                              <Skeleton className="h-7 w-24 rounded" />
                          </div>
                      </CardContent>
                  </Card>
              ))}
          </div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-12 shadow-sm border-dashed border-muted-foreground/30 bg-card">
          <CardHeader>
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4 text-xl font-semibold">No Goals Yet!</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Start tracking your progress by adding a new fitness goal.</CardDescription>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                 <Button onClick={() => { setEditingGoal(null); setIsDialogOpen(true);}}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Goal
                </Button>
              </DialogTrigger>
               <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                     <DialogTitle className="text-xl">Add New Goal</DialogTitle>
                     <DialogDescription>
                        Set a new fitness goal with a daily target over a duration.
                     </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                     <form onSubmit={form.handleSubmit(handleAddOrUpdateGoal)} className="space-y-5 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        {renderGoalFormFields()}
                        <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                           <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button></DialogClose>
                           <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={form.formState.isSubmitting}>Add Goal</Button>
                        </DialogFooter>
                     </form>
                  </Form>
               </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
             const { daysMet, totalDaysInDuration, progressPercentage } = calculateGoalProgress(goal, workouts);
             const GoalIcon = getIconByType(goal.type);
             const startDate = goal.startDate instanceof Date && isValid(goal.startDate) ? goal.startDate : null;
             const endDate = startDate ? calculateEndDate(startDate, goal.durationValue, goal.durationType) : null;
             const isCompleted = goal.completed; // Use the stored completion status

            return (
              <Card key={goal.id} className={`shadow-md hover:shadow-lg transition-shadow flex flex-col ${isCompleted ? 'border-green-500/50 border-2 bg-green-50/30' : 'bg-card'}`}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                     <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            {isCompleted && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                             <GoalIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="flex-1">{goal.title}</span>
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                             <CardDescription>
                                Daily Target: {goal.dailyTargetValue} {goal.unit}
                             </CardDescription>
                             {/* Removed Plus/Minus buttons from goal card view */}
                        </div>
                        {startDate && endDate && isValid(startDate) && isValid(endDate) ? (
                             <Badge variant="secondary" className="mt-1 capitalize">
                                {format(startDate, 'MMM d')}
                                {' - '}
                                {format(endDate, 'MMM d, yyyy')} ({totalDaysInDuration} days)
                             </Badge>
                        ) : (
                            <Badge variant="destructive" className="mt-1">Invalid Date Range</Badge>
                        )}
                     </div>
                     <div className="flex space-x-1">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingGoal(goal); setIsDialogOpen(true); }} disabled={isCompleted}>
                           <Edit className="h-4 w-4" />
                           <span className="sr-only">Edit Goal</span>
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                                 <Trash2 className="h-4 w-4" />
                                 <span className="sr-only">Delete Goal</span>
                               </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/>Are you sure?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   This action cannot be undone. This will permanently delete the goal "{goal.title}".
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                   Delete Goal
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between pt-0">
                 <div> {/* Container for progress */}
                    <Progress value={progressPercentage} className="w-full h-2.5 mb-2" aria-label={`Goal progress: ${progressPercentage}%`} />
                    <div className="text-sm text-muted-foreground flex justify-between">
                       <span>{daysMet} / {totalDaysInDuration} days met</span>
                       <span>{progressPercentage}%</span>
                    </div>
                 </div>
                 {isCompleted && (
                     <div className="mt-4 text-center text-green-600 font-medium flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Goal Achieved! 🎉 {goal.completedAt instanceof Date && isValid(goal.completedAt) ? `(on ${format(goal.completedAt, 'MMM d')})` : ''}
                     </div>
                 )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

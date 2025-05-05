
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dumbbell, Target, Activity, LineChart, Trash2, AlertTriangle, Clock, Flame, TrendingUp, ShieldCheck, BarChart3 as BarChartIcon, Lock, Info } from 'lucide-react'; // Renamed BarChart3 import
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'; // Use alias for recharts BarChart
import type { ChartConfig } from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { useStreak } from '@/hooks/useStreak';
import { isSameMonth, startOfMonth, format, getMonth, isValid, parseISO } from 'date-fns'; // Added isValid, parseISO
import { Skeleton } from '@/components/ui/skeleton';
import type { Workout } from '@/types/workout';
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// Chart configuration updated for Duration (hrs)
const chartConfig = {
  durationHours: {
    label: "Duration (hrs)",
    color: "hsl(var(--chart-1))", // Teal
    icon: Clock, // Added icon for duration
  },
  calories: {
    label: "Calories Burned",
    color: "hsl(var(--chart-2))", // Orange
    icon: Flame, // Updated icon for calories
  },
} satisfies ChartConfig;

// Helper function to safely parse date string or return null
const safeParseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
};


// Helper function to aggregate data by month, calculating total duration in hours
const aggregateMonthlyData = (workouts: Workout[]) => {
  const monthlyData: { [key: string]: { month: string; monthNum: number; durationMinutes: number; calories: number } } = {};

  workouts.forEach(workout => {
    // Ensure workout.date is a Date object
    const workoutDate = workout.date instanceof Date ? workout.date : safeParseDate(workout.date as unknown as string);
    if (!workoutDate || !isValid(workoutDate)) {
        console.warn("Invalid date found in workout:", workout);
        return; // Skip this workout if the date is invalid
    }

    const monthNum = getMonth(workoutDate); // 0-indexed month number
    const monthName = format(workoutDate, 'MMM'); // e.g., "Jan"
    const year = workoutDate.getFullYear();
    const key = `${year}-${monthNum}`; // Unique key per month/year

    if (!monthlyData[key]) {
      monthlyData[key] = { month: monthName, monthNum: monthNum, durationMinutes: 0, calories: 0 };
    }

    monthlyData[key].durationMinutes += workout.duration || 0; // Add duration in minutes, handle undefined
    monthlyData[key].calories += workout.caloriesBurned || 0;
  });

  // Convert to array, calculate hours, and sort by month number
  return Object.values(monthlyData)
    .map(data => ({
      ...data,
      durationHours: parseFloat((data.durationMinutes / 60).toFixed(1)), // Calculate hours, round to 1 decimal
    }))
    .sort((a, b) => a.monthNum - b.monthNum);
};


// --- Streak Milestones & Badges ---
const streakMilestones = [
  { days: 7, badge: "7-Day Streak!", icon: Flame, variant: "secondary", shareText: "Reached a 7-day workout streak on FitTrack Lite!" },
  { days: 14, badge: "14-Day Warrior!", icon: TrendingUp, variant: "default", shareText: "Became a 14-Day Warrior on FitTrack Lite!" },
  { days: 30, badge: "30-Day Legend!", icon: ShieldCheck, variant: "destructive", shareText: "Achieved 30-Day Legend status on FitTrack Lite! 🎉" }, // Using destructive for emphasis
  { days: 60, badge: "60-Day Titan!", icon: BarChartIcon, variant: "outline", shareText: "I'm a 60-Day Titan on FitTrack Lite! 💪" }, // Use renamed icon import
];


// Helper to check if a specific milestone is achieved
const isMilestoneAchieved = (currentStreak: number, milestoneDays: number): boolean => {
  return currentStreak >= milestoneDays;
};

export default function DashboardPage() {
  const { workouts, loading: workoutsLoading, resetWorkouts } = useWorkouts();
  const { streakData, loading: streakLoading } = useStreak();
  const loading = workoutsLoading || streakLoading; // Combined loading state

  // Recalculate summary stats based on current workouts state
  const currentMonthStart = startOfMonth(new Date());
  const workoutsThisMonth = workouts.filter(w => {
    const workoutDate = w.date instanceof Date ? w.date : safeParseDate(w.date as unknown as string);
     return workoutDate && isValid(workoutDate) && isSameMonth(workoutDate, currentMonthStart);
  });

  const totalWorkoutsThisMonth = workoutsThisMonth.length;
  const totalCaloriesThisMonth = workoutsThisMonth.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const avgCaloriesPerWorkout = totalWorkoutsThisMonth > 0 ? Math.round(totalCaloriesThisMonth / totalWorkoutsThisMonth) : 0;
  const totalDurationThisMonthMinutes = workoutsThisMonth.reduce((sum, w) => sum + (w.duration || 0), 0); // Ensure duration is handled

  // Aggregate data for the chart
  const monthlyChartData = aggregateMonthlyData(workouts);
  const dataAvailable = !loading && monthlyChartData.some(d => d.durationHours > 0 || d.calories > 0);

  const handleReset = () => {
    resetWorkouts(); // Resets workouts and streak data via WorkoutContext
  };

  // --- Summary Analysis ---
  const summaryAnalysis = React.useMemo(() => {
    if (loading || workouts.length === 0) {
      return "Log workouts to see your summary analysis.";
    }

    const totalDurationMinutes = workouts.reduce((sum, w) => sum + (w.duration || 0), 0); // Handle undefined
    const totalDurationHours = (totalDurationMinutes / 60).toFixed(1);
    const totalCalories = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const avgDuration = workouts.length > 0 ? (totalDurationMinutes / workouts.length).toFixed(0) : 0;
    const avgCalories = workouts.length > 0 ? (totalCalories / workouts.length).toFixed(0) : 0;

    const mostFrequentType = workouts.reduce((acc, w) => {
      acc[w.exerciseType] = (acc[w.exerciseType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topType = Object.entries(mostFrequentType).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Capitalize the first letter of the top type
    const formattedTopType = topType.charAt(0).toUpperCase() + topType.slice(1);


    return `Overall, you've logged ${workouts.length} workouts totaling ${totalDurationHours} hours and burning approximately ${totalCalories.toLocaleString()} kcal. Your average workout lasts ${avgDuration} minutes, burning ${avgCalories} kcal. Your most frequent activity is ${formattedTopType}.`;
    // Future: Add weight change, steps, kms if data is available.
  }, [workouts, loading]);

  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
                <p className="text-muted-foreground">Here's your fitness dashboard overview.</p>
            </div>
            {/* Streak Info Card */}
            <Card className="shadow-md border rounded-lg p-4 w-full lg:w-auto bg-card">
                 <CardTitle className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary"/> Streak Status
                 </CardTitle>
                 <div className="flex flex-wrap items-center justify-around sm:justify-start gap-x-6 gap-y-3">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Current</div>
                        {loading ? <Skeleton className="h-7 w-12 mx-auto mt-1" /> : <div className="text-3xl font-bold text-primary">{streakData.currentStreak}</div>}
                        <div className="text-xs text-muted-foreground">days</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Longest</div>
                        {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <div className="text-xl font-bold text-muted-foreground">{streakData.longestStreak}</div>}
                        <div className="text-xs text-muted-foreground">days</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Freezes</div>
                        {loading ? <Skeleton className="h-6 w-8 mx-auto mt-1" /> :
                          <div className="flex items-center justify-center gap-1">
                            <div className="text-xl font-bold text-blue-500">{streakData.streakFreezes}</div>
                            <ShieldCheck className="h-4 w-4 text-blue-500" />
                         </div>
                        }
                        <div className="text-xs text-muted-foreground">available</div>
                    </div>
                </div>
            </Card>
          </div>

          {/* Streak Milestones Badges Card */}
          <Card className="shadow-md border rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Streak Milestones
              </CardTitle>
              <CardDescription>Keep the streak going to unlock these badges! Hover for details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 sm:gap-4">
              {loading ? (
                // Skeleton loaders for badges
                Array.from({ length: streakMilestones.length }).map((_, i) => (
                  <Skeleton key={`skel-badge-${i}`} className="h-8 w-28 rounded-full" />
                ))
              ) : (
                streakMilestones.map((milestone) => {
                  const achieved = isMilestoneAchieved(streakData.currentStreak, milestone.days);
                  return (
                    <Tooltip key={milestone.days}>
                      <TooltipTrigger asChild>
                         <div className={`relative flex items-center ${!achieved ? 'cursor-help' : ''}`}>
                             {achieved ? (
                                <Badge
                                   variant={milestone.variant}
                                   className="text-sm px-3 py-1" // Slightly larger badge
                                   shareable // Enable sharing
                                   shareContent={{ text: milestone.shareText }} // Pass share text
                                >
                                  <milestone.icon className="mr-1.5 h-4 w-4" />
                                  {milestone.badge}
                                </Badge>
                             ) : (
                               <Badge variant="outline" className="text-sm px-3 py-1 bg-muted/60 text-muted-foreground border-dashed border-muted-foreground/50 cursor-help">
                                  <milestone.icon className="mr-1.5 h-4 w-4" />
                                  {milestone.badge}
                                  <Lock className="ml-1.5 h-3 w-3 opacity-70" />
                               </Badge>
                             )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{achieved ? `Achieved! Requires ${milestone.days} day streak.` : `Requires ${milestone.days} day streak to unlock.`}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </CardContent>
          </Card>


          {/* Summary Cards */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Workouts Card */}
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Workouts This Month</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{totalWorkoutsThisMonth}</div>}
                {!loading && <p className="text-xs text-muted-foreground mt-1">{totalWorkoutsThisMonth > 0 ? `Keep up the great work!` : `Log workouts to see data`}</p>}
              </CardContent>
            </Card>
            {/* Total Duration Card */}
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Duration This Month</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{`${Math.floor(totalDurationThisMonthMinutes / 60)}h ${totalDurationThisMonthMinutes % 60}m`}</div>}
                {!loading && <p className="text-xs text-muted-foreground mt-1">Total time spent working out</p>}
              </CardContent>
            </Card>
            {/* Total Calories Card */}
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Calories Burned (Month)</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{totalCaloriesThisMonth.toLocaleString()} <span className="text-lg text-muted-foreground">kcal</span></div>}
                {!loading && <p className="text-xs text-muted-foreground mt-1">Estimated total this month</p>}
              </CardContent>
            </Card>
            {/* Avg Calories Card */}
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Calories / Workout</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{avgCaloriesPerWorkout} <span className="text-lg text-muted-foreground">kcal</span></div>}
                {!loading && <p className="text-xs text-muted-foreground mt-1">Average this month</p>}
              </CardContent>
            </Card>
          </div>

          {/* Summary Analysis Card */}
          <Card className="shadow-md border rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-primary" /> {/* Use renamed icon import */}
                Your Fitness Summary
              </CardTitle>
              <CardDescription>
                An overall analysis of your logged activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-10 w-full" /> : <p className="text-base text-muted-foreground leading-relaxed">{summaryAnalysis}</p>}
            </CardContent>
          </Card>


          {/* Progress Chart */}
          <Card className="shadow-md border rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" /> {/* Use LineChart icon from lucide */}
                Monthly Progress
              </CardTitle>
              <CardDescription>
                {loading ? "Loading chart data..." :
                dataAvailable ? "Your total workout duration (hours) and calorie trends over recent months." : "Log workouts to see your monthly progress chart."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
                    <Skeleton className="h-3/4 w-3/4" />
                </div>
              ) : dataAvailable ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={monthlyChartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" label={{ value: 'Duration (hrs)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, dy: 40, fontSize:12 }} stroke="hsl(var(--chart-1))" fontSize={12}/>
                      <YAxis yAxisId="right" label={{ value: 'Calories (kcal)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, dy: -40, fontSize:12 }} orientation="right" stroke="hsl(var(--chart-2))" fontSize={12}/>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <ChartLegend content={<ChartLegendContent icon={Info} />} />
                      <Bar yAxisId="left" dataKey="durationHours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name={chartConfig.durationHours.label} />
                      <Bar yAxisId="right" dataKey="calories" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name={chartConfig.calories.label}/>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground bg-muted/50 rounded-md p-6">
                  <BarChartIcon className="h-12 w-12 mb-4 text-muted-foreground/70" /> {/* Use renamed icon import */}
                  <p className="font-medium">No workout data available yet.</p>
                  <p className="text-sm mb-4">Log your first workout to see your progress chart populate here.</p>
                    <Link href="/log-workout">
                        <Button size="sm" variant="outline">
                          Log Workout
                        </Button>
                    </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out border rounded-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Link href="/log-workout" className="flex-1">
                    <Button className="w-full btn-animated" variant="default">
                      <Dumbbell className="mr-2 h-4 w-4" /> Log Workout
                    </Button>
                  </Link>
                  <Link href="/statistics" className="flex-1">
                    <Button className="w-full btn-animated" variant="outline">
                      <LineChart className="mr-2 h-4 w-4" /> View Stats
                    </Button>
                  </Link>
                   <Link href="/goals" className="flex-1">
                    <Button className="w-full btn-animated" variant="outline">
                      <Target className="mr-2 h-4 w-4" /> Manage Goals
                    </Button>
                  </Link>
                </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out border rounded-lg bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full btn-animated" disabled={loading || workouts.length === 0}>
                          <Trash2 className="mr-2 h-4 w-4" /> Reset All Stats
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/> Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all your logged workout data, streak history, and earned freezes. Goals might also be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-xs text-destructive/80 mt-2 text-center">This action is irreversible.</p>
                </CardContent>
            </Card>
          </div>

          {/* Removed Separator and centered reset button */}

        </div>
    </TooltipProvider>
  );
}

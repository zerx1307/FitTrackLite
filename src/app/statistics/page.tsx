
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, BarChart, TrendingUp, Activity, History, Clock, Flame, CalendarClock } from 'lucide-react'; // Added Flame, CalendarClock
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, ComposedChart, BarChart as RechartsBarChart } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Use RadioGroup
import { Label } from "@/components/ui/label"; // Import Label for RadioGroup
import { useWorkouts } from '@/contexts/WorkoutContext'; // Import the context hook
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, eachDayOfInterval, getMonth, getYear } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workout } from '@/types/workout';


// Chart Configurations
const weeklyChartConfig = {
  workouts: { label: "Workouts", color: "hsl(var(--chart-1))" }, // Teal
  duration: { label: "Duration (min)", color: "hsl(var(--chart-2))" }, // Orange
} satisfies ChartConfig;

// Updated monthly chart config for duration (hours)
const monthlyChartConfig = {
  durationHours: { label: "Duration (hrs)", color: "hsl(var(--chart-1))", icon: Clock }, // Teal
  calories: { label: "Calories", color: "hsl(var(--chart-2))", icon: Flame }, // Orange
} satisfies ChartConfig;

const historyChartConfig = {
  count: { label: "Count", color: "hsl(var(--chart-1))" },
  avgDuration: { label: "Avg. Duration (min)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

// Helper Functions for Data Aggregation
const aggregateWeeklyData = (workouts: Workout[], weekStart: Date, weekEnd: Date) => {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weeklyMap: { [key: string]: { day: string; workouts: number; duration: number } } = {};

  days.forEach(day => {
    const dayKey = format(day, 'eee'); // Mon, Tue, etc.
    weeklyMap[dayKey] = { day: dayKey, workouts: 0, duration: 0 };
  });

  workouts.forEach(workout => {
    const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
    if (!isNaN(workoutDate.getTime()) && isWithinInterval(workoutDate, { start: weekStart, end: weekEnd })) {
      const dayKey = format(workoutDate, 'eee');
      if (weeklyMap[dayKey]) {
        weeklyMap[dayKey].workouts += 1;
        weeklyMap[dayKey].duration += workout.duration || 0; // Handle undefined duration
      }
    }
  });

  // Ensure the order Mon-Sun
  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return orderedDays.map(dayKey => weeklyMap[dayKey]);
};

// Updated function to aggregate monthly data by duration (hours) and calories
const aggregateMonthlyData = (workouts: Workout[], monthStart: Date, monthEnd: Date) => {
   // Aggregate by week within the month
   const monthlyMap: { [key: string]: { date: string; durationMinutes: number; calories: number } } = {
     "Wk 1": { date: "Wk 1", durationMinutes: 0, calories: 0 },
     "Wk 2": { date: "Wk 2", durationMinutes: 0, calories: 0 },
     "Wk 3": { date: "Wk 3", durationMinutes: 0, calories: 0 },
     "Wk 4": { date: "Wk 4", durationMinutes: 0, calories: 0 },
     "Wk 5": { date: "Wk 5", durationMinutes: 0, calories: 0 }, // Handle months with 5 weeks
   };
   let week5Exists = false;

   workouts.forEach(workout => {
     const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
     if (!isNaN(workoutDate.getTime()) && isWithinInterval(workoutDate, { start: monthStart, end: monthEnd })) {
        const dayOfMonth = workoutDate.getDate();
        let weekKey = "Wk 1";
        if (dayOfMonth > 28) weekKey = "Wk 5";
        else if (dayOfMonth > 21) weekKey = "Wk 4";
        else if (dayOfMonth > 14) weekKey = "Wk 3";
        else if (dayOfMonth > 7) weekKey = "Wk 2";

        if (weekKey === "Wk 5") week5Exists = true;

        monthlyMap[weekKey].durationMinutes += workout.duration || 0; // Sum duration in minutes
        monthlyMap[weekKey].calories += workout.caloriesBurned || 0;
     }
   });

   const result = Object.values(monthlyMap).map(data => ({
       ...data,
       durationHours: parseFloat((data.durationMinutes / 60).toFixed(1)), // Calculate hours
   }));
   return week5Exists ? result : result.slice(0, 4); // Remove Wk 5 if no data
};


const aggregateHistoryData = (workouts: Workout[]) => {
  const historyMap: { [type: string]: { count: number; totalDuration: number } } = {};

  workouts.forEach(workout => {
    const type = workout.exerciseType;
    if (!historyMap[type]) {
      historyMap[type] = { count: 0, totalDuration: 0 };
    }
    historyMap[type].count += 1;
    historyMap[type].totalDuration += workout.duration || 0; // Handle undefined duration
  });

  return Object.entries(historyMap).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize
    count: data.count,
    avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
  })).sort((a, b) => b.count - a.count); // Sort by count descending
};

// Time Range Options for RadioGroup
const timeRangeOptions = [
    { value: "weekly", label: "This Week" },
    { value: "monthly", label: "This Month" },
    // { value: "all", label: "All Time" }, // Future possibility
];

export default function StatisticsPage() {
  const { workouts, loading } = useWorkouts();
  const [timeRange, setTimeRange] = React.useState("weekly"); // weekly, monthly

  // Calculate date ranges based on current date
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);

  // Filter workouts based on selected time range
  const filteredWorkouts = React.useMemo(() => {
    if (timeRange === 'weekly') {
      return workouts.filter(w => {
          const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
          return !isNaN(workoutDate.getTime()) && isWithinInterval(workoutDate, { start: currentWeekStart, end: currentWeekEnd });
      });
    } else if (timeRange === 'monthly') {
       return workouts.filter(w => {
           const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
           return !isNaN(workoutDate.getTime()) && isWithinInterval(workoutDate, { start: currentMonthStart, end: currentMonthEnd });
       });
    }
    // else if (timeRange === 'all') { return workouts; } // Future
    return workouts; // Default fallback (though UI prevents this)
  }, [workouts, timeRange, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd]);


  // Calculate aggregated data based on filtered workouts
  const weeklyData = timeRange === 'weekly' ? aggregateWeeklyData(filteredWorkouts, currentWeekStart, currentWeekEnd) : [];
  const monthlyData = timeRange === 'monthly' ? aggregateMonthlyData(filteredWorkouts, currentMonthStart, currentMonthEnd) : [];
  const historyData = aggregateHistoryData(workouts); // History is always based on all workouts

  // Determine current data and config based on timeRange
  const getCurrentData = () => {
      switch(timeRange) {
          case 'monthly': return monthlyData;
          case 'weekly':
          default: return weeklyData;
      }
  }
  const currentData = getCurrentData();
  const currentChartConfig = timeRange === 'monthly' ? monthlyChartConfig : weeklyChartConfig;

  // Updated keys based on time range and chart config
  const mainChartKey1 = timeRange === 'monthly' ? 'calories' : 'duration';
  const mainChartKey2 = timeRange === 'monthly' ? 'durationHours' : 'workouts';

  // Check if data is available for the *selected* period
   const dataAvailable = !loading && currentData.length > 0 && currentData.some(d =>
     (d as any)[mainChartKey2] > 0 || (d as any)[mainChartKey1] > 0
   );
  const historyAvailable = !loading && historyData.length > 0;

  // Calculate total stats for the selected period using filtered workouts
  const totalWorkoutsPeriod = filteredWorkouts.length;
  const totalDurationMinutesPeriod = filteredWorkouts.reduce((sum, d) => sum + (d.duration || 0), 0); // Handle undefined
  const totalDurationFormattedPeriod = `${Math.floor(totalDurationMinutesPeriod / 60)}h ${totalDurationMinutesPeriod % 60}m`;
  const totalCaloriesPeriod = filteredWorkouts.reduce((sum, d) => sum + (d.caloriesBurned || 0), 0);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Your Statistics</h1>
        {/* RadioGroup for Time Range Selection */}
        <RadioGroup
            value={timeRange}
            onValueChange={setTimeRange}
            className="flex space-x-2 border p-1 rounded-lg bg-muted"
        >
          {timeRangeOptions.map(option => (
              <div key={option.value}>
                 <RadioGroupItem value={option.value} id={`time-${option.value}`} className="sr-only" />
                 <Label
                    htmlFor={`time-${option.value}`}
                    className={`px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                        timeRange === option.value
                         ? 'bg-background text-foreground shadow-sm'
                         : 'text-muted-foreground hover:bg-background/80'
                     }`}
                  >
                   {option.label}
                 </Label>
              </div>
          ))}
        </RadioGroup>
      </div>

      {/* Key Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
         {/* Total Workouts Card */}
         <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalWorkoutsPeriod}</div>}
             {!loading && <p className="text-xs text-muted-foreground">in selected period</p>}
          </CardContent>
        </Card>
        {/* Total Duration Card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalDurationFormattedPeriod}</div>}
            {!loading && <p className="text-xs text-muted-foreground">in selected period</p>}
          </CardContent>
        </Card>
        {/* Total Calories Card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calories Burned</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalCaloriesPeriod.toLocaleString()} kcal</div>}
            {!loading && <p className="text-xs text-muted-foreground">in selected period</p>}
          </CardContent>
        </Card>
      </div>

      {/* Main Progress Chart */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> {/* Changed icon */}
            {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Progress ({timeRange === 'weekly' ? format(currentWeekStart, 'MMM d') + ' - ' + format(currentWeekEnd, 'MMM d') : format(currentMonthStart, 'MMMM yyyy')})
          </CardTitle>
           <CardDescription>
            {loading ? "Loading chart data..." :
             dataAvailable
              ? `Visualize your ${timeRange === 'monthly' ? 'total duration (hrs) and calories' : 'workout frequency and duration (min)'} over the selected period.`
              : "Log some workouts in this period to see the chart."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[350px]">
               <Skeleton className="h-full w-full" />
            </div>
           ) : dataAvailable ? (
             <ChartContainer config={currentChartConfig} className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 {/* Conditional Rendering based on timeRange */}
                 {timeRange === 'weekly' ? (
                    <ComposedChart data={currentData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis yAxisId="left" label={{ value: weeklyChartConfig.workouts.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dy: 40 }} stroke="hsl(var(--chart-1))" allowDecimals={false} />
                      <YAxis yAxisId="right" label={{ value: weeklyChartConfig.duration.label, angle: 90, position: 'insideRight', style: { textAnchor: 'middle' }, dy: -40 }} orientation="right" stroke="hsl(var(--chart-2))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="workouts" yAxisId="left" name={weeklyChartConfig.workouts.label} fill="hsl(var(--chart-1))" barSize={20} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="duration" yAxisId="right" name={weeklyChartConfig.duration.label} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                    </ComposedChart>
                 ) : ( // Monthly View
                    <ComposedChart data={currentData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis yAxisId="left" label={{ value: monthlyChartConfig.durationHours.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dy: 40 }} stroke="hsl(var(--chart-1))" />
                      <YAxis yAxisId="right" label={{ value: monthlyChartConfig.calories.label, angle: 90, position: 'insideRight', style: { textAnchor: 'middle' }, dy: -40 }} orientation="right" stroke="hsl(var(--chart-2))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="durationHours" yAxisId="left" name={monthlyChartConfig.durationHours.label} fill="hsl(var(--chart-1))" barSize={20} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="calories" yAxisId="right" name={monthlyChartConfig.calories.label} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                 )}
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex flex-col items-center justify-center h-[350px] text-center text-muted-foreground">
                <CalendarClock className="h-12 w-12 mb-4" />
                <p>No data available for this period.</p>
                <p className="text-sm">Log workouts in this timeframe to see the chart.</p>
             </div>
           )}
        </CardContent>
      </Card>

       {/* Workout Type History Chart */}
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> {/* Changed icon color */}
            Workout History Breakdown
          </CardTitle>
           <CardDescription>
             {loading ? "Loading history..." :
              historyAvailable
              ? "Frequency and average duration by workout type (all time)."
              : "Log workouts to see your history breakdown."}
          </CardDescription>
        </CardHeader>
        <CardContent>
         {loading ? (
            <div className="flex items-center justify-center h-[300px]">
               <Skeleton className="h-full w-full" />
            </div>
          ) : historyAvailable ? (
             <ChartContainer config={historyChartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={historyData} layout="vertical" barGap={4} margin={{ right: 30 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={4} name={historyChartConfig.count.label} />
                  <Bar dataKey="avgDuration" fill="hsl(var(--chart-2))" radius={4} name={historyChartConfig.avgDuration.label} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <History className="h-12 w-12 mb-4" />
               <p>No workout history data available.</p>
               <p className="text-sm">Your logged workouts will appear here over time.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

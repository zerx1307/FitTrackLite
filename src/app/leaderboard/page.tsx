
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Activity, Target, Flame, CalendarDays, Award, Star, CalendarClock, TrendingUp } from 'lucide-react'; // Added CalendarClock, TrendingUp
import { useWorkouts } from '@/contexts/WorkoutContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

// --- XP Calculation Logic (Simulated) ---
// In a real app, this logic would be more centralized, potentially in `src/lib/xp.ts`
// and integrated with `WorkoutContext`. For now, we simulate fetching XP.
const XP_KEY = 'fitTrackUserXP';
const LEADERBOARD_MOCK_KEY = 'fitTrackLeaderboardMock';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  totalXp: number; // Renamed from xp
  weeklyXp: number; // Added weekly XP
}

// Function to generate mock leaderboard data (only run once)
// Updated to include weeklyXp and use totalXp
const generateMockLeaderboard = (currentUserTotalXP: number): LeaderboardUser[] => {
  // Simulate weekly XP (e.g., a percentage of total or random amount)
  const simulateWeeklyXp = (totalXp: number): number => {
    // Example: Weekly XP is roughly 5-15% of total, capped, with some randomness
    const weeklyRatio = 0.05 + Math.random() * 0.10; // 5% to 15%
    return Math.min(500, Math.max(20, Math.round(totalXp * weeklyRatio))); // Cap at 500, min 20
  };

  const mockUsers: Omit<LeaderboardUser, 'weeklyXp'>[] = [
    { id: 'user_0', name: 'Fit Guru', avatar: `https://i.pravatar.cc/40?u=guru`, totalXp: 15800 },
    { id: 'user_1', name: 'Cardio King', avatar: `https://i.pravatar.cc/40?u=cardio`, totalXp: 12100 },
    { id: 'user_2', name: 'Iron Lifter', avatar: `https://i.pravatar.cc/40?u=lifter`, totalXp: 9500 },
    { id: 'user_3', name: 'Yoga Master', avatar: `https://i.pravatar.cc/40?u=yoga`, totalXp: 7200 },
    { id: 'current_user', name: 'You', avatar: `https://i.pravatar.cc/40?u=you`, totalXp: currentUserTotalXP },
    { id: 'user_4', name: 'Steady Progress', avatar: `https://i.pravatar.cc/40?u=steady`, totalXp: 5150 },
    { id: 'user_5', name: 'Weekend Warrior', avatar: `https://i.pravatar.cc/40?u=weekend`, totalXp: 3800 },
    { id: 'user_6', name: 'Newcomer', avatar: `https://i.pravatar.cc/40?u=new`, totalXp: 1500 },
    { id: 'user_7', name: 'Getting Started', avatar: `https://i.pravatar.cc/40?u=start`, totalXp: 750 },
    { id: 'user_8', name: 'Just Joined', avatar: `https://i.pravatar.cc/40?u=joined`, totalXp: 200 },
  ];

  // Add weekly XP and sort by total XP
  const leaderboard = mockUsers
    .map(user => ({ ...user, weeklyXp: simulateWeeklyXp(user.totalXp) }))
    .sort((a, b) => b.totalXp - a.totalXp); // Sort by total XP

   // Save mock data to localStorage
   try {
       localStorage.setItem(LEADERBOARD_MOCK_KEY, JSON.stringify(leaderboard));
   } catch (error) {
       console.error("Failed to save mock leaderboard data:", error);
   }
   return leaderboard;
};


export default function LeaderboardPage() {
  // Renamed context variable for clarity
  const { xp: currentUserTotalXP, workouts, loading: contextLoading } = useWorkouts();
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  // Calculate current user's *actual* weekly XP from workout logs
  const currentUserActualWeeklyXP = React.useMemo(() => {
      if (contextLoading) return 0; // Wait for context to load

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

      // Filter workouts for the current week
      const workoutsThisWeek = workouts.filter(w => {
          const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
          return !isNaN(workoutDate.getTime()) && isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
      });

      // Calculate XP earned from these workouts (simplified: base XP per workout)
      // In a real scenario, you'd need timestamped XP events or calculate based on workout details + milestones hit that week.
      let weeklyXpCalc = 0;
      workoutsThisWeek.forEach(workout => {
          weeklyXpCalc += 10; // Simplified: +10 XP per workout this week
          // Add more complex logic here if needed, e.g., based on intensity, milestones hit this week
      });
      // Note: This doesn't capture goal completion XP or precise milestone XP earned *this week*.
      // It's a basic estimation based on workout logs this week.
      return weeklyXpCalc;

  }, [workouts, contextLoading]);


  React.useEffect(() => {
    setLoading(true);
    try {
        const storedMock = localStorage.getItem(LEADERBOARD_MOCK_KEY);
        let loadedData: LeaderboardUser[];

        if (storedMock) {
            loadedData = JSON.parse(storedMock);
            // Update 'You' entry with the latest total XP from context and actual weekly XP
            const youIndex = loadedData.findIndex(u => u.id === 'current_user');
            if (youIndex > -1) {
                loadedData[youIndex].totalXp = currentUserTotalXP;
                loadedData[youIndex].weeklyXp = currentUserActualWeeklyXP; // Use calculated actual weekly XP
            } else {
                loadedData.push({
                    id: 'current_user',
                    name: 'You',
                    avatar: `https://i.pravatar.cc/40?u=you`,
                    totalXp: currentUserTotalXP,
                    weeklyXp: currentUserActualWeeklyXP // Use calculated actual weekly XP
                });
            }
            // Re-sort by total XP after updating 'You'
            loadedData.sort((a, b) => b.totalXp - a.totalXp);

        } else {
            // Generate fresh mock data if none exists
            // Note: The initial generation uses simulated weekly XP.
            // The block above corrects 'You' entry with actual calculation on subsequent loads.
            loadedData = generateMockLeaderboard(currentUserTotalXP);
             // Update 'You' entry immediately after generation as well
            const youIndex = loadedData.findIndex(u => u.id === 'current_user');
             if (youIndex > -1) {
                 loadedData[youIndex].totalXp = currentUserTotalXP;
                 loadedData[youIndex].weeklyXp = currentUserActualWeeklyXP;
                 loadedData.sort((a, b) => b.totalXp - a.totalXp); // Re-sort
             }
            toast({ title: "Leaderboard Generated", description: "Mock leaderboard data has been created." });
        }
        setLeaderboard(loadedData);

    } catch (error) {
        console.error("Error loading or generating leaderboard data:", error);
        toast({ title: "Error", description: "Could not load leaderboard.", variant: "destructive" });
        setLeaderboard([]); // Fallback to empty on error
    } finally {
      // Combine loading states
      setLoading(contextLoading);
    }
    // Include currentUserActualWeeklyXP in dependencies
  }, [currentUserTotalXP, currentUserActualWeeklyXP, contextLoading, toast]);

  // Find the user's rank
  const userRank = leaderboard.findIndex(user => user.id === 'current_user') + 1;


  // --- Point System Explanation ---
  const pointSystemInfo = [
    { action: "Log any workout", points: "+10 XP", icon: Activity },
    { action: "Complete a daily goal target", points: "+5 XP", icon: Target },
    { action: "Maintain 7-day streak milestone", points: "+50 XP", icon: Flame },
    { action: "Maintain 14-day streak milestone", points: "+100 XP", icon: Flame },
    { action: "Maintain 30-day streak milestone", points: "+250 XP", icon: Flame },
    { action: "Maintain 60-day streak milestone", points: "+500 XP", icon: Flame },
    { action: "Complete a Goal (full duration)", points: "+(Varies by difficulty)", icon: CalendarDays }, // Points vary
  ];

  const isLoading = loading || contextLoading; // Combined loading state check

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="text-accent h-8 w-8" /> Leaderboard
        </h1>
        <Card className="p-3 shadow-sm border rounded-lg text-center bg-muted/50">
            <CardDescription className="text-xs mb-1">Your Rank</CardDescription>
            {isLoading ? <Skeleton className="h-6 w-16 mx-auto" /> : (
                 <div className="text-xl font-bold text-primary">
                    {userRank > 0 ? `#${userRank}` : 'N/A'}
                    <span className="text-sm font-normal text-muted-foreground"> / {leaderboard.length}</span>
                 </div>
            )}
        </Card>
      </div>
      <CardDescription>See how you stack up against other fitness enthusiasts!</CardDescription>

      {/* Point System Explanation */}
      <Card className="shadow-md bg-card">
          <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> How XP is Earned</CardTitle>
              <CardDescription>Gain experience points (XP) by staying active and achieving milestones.</CardDescription>
          </CardHeader>
          <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                  {pointSystemInfo.map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="flex-grow">{item.action}</span>
                          <Badge variant="secondary" className="font-mono">{item.points}</Badge>
                      </li>
                  ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">*Note: This is a simulated leaderboard and XP system. Weekly XP for 'You' is estimated based on workouts logged this week.</p>
          </CardContent>
      </Card>


      {/* Leaderboard Table */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>Top Fitness Champions</CardTitle>
           <CardDescription>Ranking based on total XP earned. Weekly XP shows recent activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px] text-center">Rank</TableHead>
                    <TableHead>User</TableHead>
                    {/* Removed Level Header */}
                    <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                           <CalendarClock className="h-4 w-4" /> Weekly XP
                        </div>
                    </TableHead>
                    <TableHead className="text-right">
                         <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4" /> Total XP
                         </div>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    // Skeleton loader rows
                    Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                        <TableCell className="text-center font-medium"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </TableCell>
                        {/* Removed Level Cell Skeleton */}
                        <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell> {/* Weekly XP Skeleton */}
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell> {/* Total XP Skeleton */}
                    </TableRow>
                    ))
                ) : leaderboard.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Leaderboard data is not available yet.
                        </TableCell>
                     </TableRow>
                ) : (
                    leaderboard.map((user, index) => {
                        const rank = index + 1;
                        const isCurrentUser = user.id === 'current_user';
                        return (
                            <TableRow key={user.id} className={isCurrentUser ? 'bg-primary/5' : ''}>
                            <TableCell className="text-center font-medium">
                                {rank === 1 && <Trophy className="h-5 w-5 text-yellow-500 mx-auto" />}
                                {rank === 2 && <Award className="h-5 w-5 text-gray-400 mx-auto" />}
                                {rank === 3 && <Award className="h-5 w-5 text-orange-400 mx-auto" />}
                                {rank > 3 && rank}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={user.avatar} alt={`${user.name}'s avatar`} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className={`font-medium ${isCurrentUser ? 'text-primary' : ''}`}>{user.name}</span>
                                </div>
                            </TableCell>
                             {/* Removed Level Cell */}
                             <TableCell className="text-center">
                                <Badge variant={isCurrentUser ? "outline" : "secondary"} className="font-mono text-xs">
                                    {user.weeklyXp.toLocaleString()} XP
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold font-mono">{user.totalXp.toLocaleString()} XP</TableCell>
                            </TableRow>
                        );
                    })
                )}
                </TableBody>
             </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
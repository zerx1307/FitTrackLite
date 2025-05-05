
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Image as ImageIcon, Share2, BarChart3, Target, Flame, TrendingUp, ShieldCheck, ThumbsUp, MessageSquare, Users } from "lucide-react"; // Added Users icon
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStreak } from '@/hooks/useStreak'; // Assuming useStreak hook exists
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Streak Milestones & Badges (copied from dashboard for badge sharing)
const streakMilestones = [
  { days: 7, badge: "7-Day Streak!", icon: Flame, variant: "secondary", shareText: "Reached a 7-day workout streak on FitTrack Lite!" },
  { days: 14, badge: "14-Day Warrior!", icon: TrendingUp, variant: "default", shareText: "Became a 14-Day Warrior on FitTrack Lite!" },
  { days: 30, badge: "30-Day Legend!", icon: ShieldCheck, variant: "destructive", shareText: "Achieved 30-Day Legend status on FitTrack Lite! 🎉" },
  { days: 60, badge: "60-Day Titan!", icon: BarChart3, variant: "outline", shareText: "I'm a 60-Day Titan on FitTrack Lite! 💪" },
];

// Helper to get the highest achieved milestone badge
const getStreakBadge = (currentStreak: number) => {
  let achievedBadge = null;
  for (let i = streakMilestones.length - 1; i >= 0; i--) {
    if (currentStreak >= streakMilestones[i].days) {
      achievedBadge = streakMilestones[i];
      break;
    }
  }
  return achievedBadge;
};

// --- Post Data Structure ---
interface CommunityPost {
  id: string;
  author: string; // Simulated author name
  avatar: string; // Simulated avatar URL
  timestamp: Date;
  content: string;
  imageUrl?: string; // Optional image URL (will store data URI)
  sharedItem?: { // Optional shared item details
    type: 'streak' | 'goal' | 'badge';
    value: string | number;
    details?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined; // Add badge variant if sharing badge
    BadgeIcon?: React.ElementType; // Add badge icon
  };
  likes: number; // Simulated likes
  comments: number; // Simulated comments
}

// --- Form Schema ---
// Updated schema to handle FileList for image uploads
const postFormSchema = z.object({
  content: z.string().min(1, "Post cannot be empty.").max(500, "Post cannot exceed 500 characters."),
  imageFile: z.instanceof(FileList).optional(), // Accept FileList, optional
});

type PostFormValues = z.infer<typeof postFormSchema>;

// Helper function to read file as data URI
const readFileAsDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
};


// --- Community Page Component ---
export default function CommunityPage() {
  const { toast } = useToast();
  const { streakData, loading: streakLoading } = useStreak(); // Get streak data
  const [posts, setPosts] = React.useState<CommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = React.useState(true); // Loading state for posts
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Simulated goals data (replace with actual loading if available)
  const [goals, setGoals] = React.useState<{ title: string; id: string }[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = React.useState(true);

  // --- Load Posts and Goals (Simulated with localStorage) ---
  React.useEffect(() => {
    setIsLoadingPosts(true);
    setIsLoadingGoals(true);
    try {
      const storedPosts = localStorage.getItem('communityPosts');
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts).map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp), // Parse date string
        })));
      }
      // Simulate loading goals (replace with actual logic if available)
      const storedGoals = localStorage.getItem('fitnessGoals');
      if (storedGoals) {
        setGoals(JSON.parse(storedGoals).map((g: any) => ({ title: g.title, id: g.id })));
      }
    } catch (error) {
      console.error("Error loading community data:", error);
      toast({ title: "Error", description: "Could not load community posts or goals.", variant: "destructive" });
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingGoals(false);
    }
  }, [toast]);

  // --- Save Posts (Simulated with localStorage) ---
  React.useEffect(() => {
    if (!isLoadingPosts) {
      try {
        localStorage.setItem('communityPosts', JSON.stringify(posts));
      } catch (error) {
        console.error("Error saving community posts:", error);
        // Handle potential storage quota issues if images are large
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            toast({
                title: "Storage Limit Reached",
                description: "Could not save new posts due to storage limits. Try removing older posts with large images.",
                variant: "destructive",
                duration: 5000,
            });
        }
      }
    }
  }, [posts, isLoadingPosts, toast]);

  // --- Form Setup ---
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: "",
      imageFile: undefined, // Default to undefined
    },
    mode: "onChange",
  });

  // --- Handlers ---
 const handleAddPost = async (data: PostFormValues, sharedItem?: CommunityPost['sharedItem']) => { // Make async
    setIsSubmitting(true);
    let imageUrl: string | undefined = undefined;

    // Handle file upload
    if (data.imageFile && data.imageFile.length > 0) {
      const file = data.imageFile[0];
      // Optional: Add file size validation
      if (file.size > 5 * 1024 * 1024) { // Example: 5MB limit
           toast({
             title: "Image Too Large",
             description: "Please upload an image smaller than 5MB.",
             variant: "destructive",
           });
           setIsSubmitting(false);
           return;
      }
      try {
        imageUrl = await readFileAsDataURI(file); // Use the helper function
      } catch (error) {
        console.error("Error reading file:", error);
        toast({
          title: "Error Uploading Image",
          description: "Could not process the selected image file.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return; // Stop submission if file reading fails
      }
    }

    const newPost: CommunityPost = {
      id: `post_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      author: "Fit User", // Replace with actual user name if auth exists
      avatar: `https://i.pravatar.cc/40?u=user_${Math.random()}`, // Placeholder avatar
      timestamp: new Date(),
      content: data.content,
      imageUrl: imageUrl, // Use the generated data URI
      sharedItem: sharedItem,
      likes: 0,
      comments: 0,
    };

    setPosts(prevPosts => [newPost, ...prevPosts]); // Add new post to the beginning
    toast({ title: "Post Shared!", description: "Your update is live on the community feed." });
    form.reset({ content: "", imageFile: undefined }); // Reset form, explicitly clearing imageFile
    setIsSubmitting(false);
  };

  const handleShareStreak = () => {
    if (streakLoading) return; // Don't share if streak data isn't loaded
    if (streakData.currentStreak <= 0) {
       toast({ title: "No Streak to Share", description: "Start logging workouts consistently to build a streak!", variant: "default" });
       return;
    }
    const streakValue = streakData.currentStreak;
    // Pass form data (only content) and shared item separately
    handleAddPost(
        { content: `Sharing my ${streakValue}-day workout streak! 🔥 Keeping the momentum going!` },
        { type: 'streak', value: streakValue }
    );
  };

  const handleShareBadge = () => {
     if (streakLoading) return;
     const currentBadge = getStreakBadge(streakData.currentStreak);
     if (!currentBadge) {
        toast({ title: "No Badge Yet", description: "Keep up the streak to earn badges!", variant: "default" });
        return;
     }
      // Pass form data (only content) and shared item separately
      handleAddPost(
        { content: `Proud to share my ${currentBadge.badge}! 💪 ${currentBadge.shareText}` },
        {
          type: 'badge',
          value: currentBadge.badge,
          details: `${currentBadge.days} Days`,
          badgeVariant: currentBadge.variant,
          BadgeIcon: currentBadge.icon
        }
      );
  };

   const handleShareGoal = (goal: { title: string; id: string }) => {
        // Pass form data (only content) and shared item separately
        handleAddPost(
            { content: `Sharing my goal: "${goal.title}". Let's crush it! 🎯` },
            { type: 'goal', value: goal.title }
        );
   };

  // Simulate liking a post
  const handleLikePost = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  // Simulate commenting (just increments count for now)
  const handleCommentPost = (postId: string) => {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post
        )
      );
     toast({ title: "Comment Added (Simulated)", description: "In a full app, this would open a comment section." });
  };

  // --- Collage Images - Using fitness/exercise related seeds ---
  const collageImages = [
    "https://picsum.photos/seed/workout/600/400",
    "https://picsum.photos/seed/fitness/600/400",
    "https://picsum.photos/seed/exercise/600/400",
    "https://picsum.photos/seed/weights/600/400", // Kept specific one
    "https://picsum.photos/seed/athlete/600/400",
    "https://picsum.photos/seed/personrunning/600/400", // More specific running
  ];

  const currentBadge = getStreakBadge(streakData.currentStreak);
  const fileRef = form.register("imageFile"); // Register the file input

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Community Hub</h1>
       <CardDescription>Share your progress, motivate others, and see what the community is up to!</CardDescription>

       {/* --- Sharing Section --- */}
       <Card className="shadow-lg border border-border/20">
           <CardHeader>
               <CardTitle className="flex items-center gap-2 text-xl">
                   <Share2 className="h-5 w-5 text-primary" /> Share Your Update
               </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
               <Form {...form}>
                   {/* Use form.handleSubmit to handle the form submission */}
                   <form onSubmit={form.handleSubmit(data => handleAddPost(data))} className="space-y-4">
                       <FormField
                           control={form.control}
                           name="content"
                           render={({ field }) => (
                               <FormItem>
                                   <FormLabel className="sr-only">Post Content</FormLabel>
                                   <FormControl>
                                       <Textarea placeholder="What's on your mind? Share your workout, thoughts, or progress..." {...field} />
                                   </FormControl>
                                   <FormMessage />
                               </FormItem>
                           )}
                       />
                       {/* Update Image Upload Field */}
                       <FormField
                            control={form.control}
                            name="imageFile"
                            render={({ field }) => ( // field doesn't include value/onChange directly for file inputs handled this way
                                <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-1"><ImageIcon className="h-4 w-4"/> Add Image (Optional, max 5MB)</FormLabel>
                                    <FormControl>
                                        {/* Use the ref from form.register */}
                                        <Input
                                            type="file"
                                            accept="image/png, image/jpeg, image/gif" // Specify acceptable image types
                                            {...fileRef} // Spread the props from register
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                       <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                           <PlusCircle className="mr-2 h-4 w-4" /> {isSubmitting ? "Posting..." : "Post Update"}
                       </Button>
                   </form>
               </Form>
               <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
                   <Button variant="outline" size="sm" onClick={handleShareStreak} disabled={streakLoading || streakData.currentStreak <= 0}>
                       <Flame className="mr-2 h-4 w-4" /> Share Current Streak ({streakLoading ? '...' : streakData.currentStreak})
                   </Button>
                   {currentBadge && (
                       <Button variant="outline" size="sm" onClick={handleShareBadge} disabled={streakLoading}>
                            <currentBadge.icon className="mr-2 h-4 w-4" /> Share Badge ({currentBadge.badge})
                       </Button>
                   )}
                   {isLoadingGoals ? <Skeleton className="h-8 w-24 rounded-md" /> : goals.slice(0, 2).map(goal => ( // Show first 2 goals
                       <Button key={goal.id} variant="outline" size="sm" onClick={() => handleShareGoal(goal)}>
                           <Target className="mr-2 h-4 w-4" /> Share Goal: "{goal.title.substring(0, 15)}{goal.title.length > 15 ? '...' : ''}"
                       </Button>
                   ))}
                   {/* Add dropdown for more goals if needed */}
               </div>
           </CardContent>
       </Card>

        {/* --- Image Collage --- */}
        <Card className="overflow-hidden shadow-md">
            <CardHeader>
                <CardTitle className="text-xl">Community Showcase</CardTitle>
                <CardDescription>Inspiration from fellow fitness enthusiasts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {collageImages.map((src, index) => (
                        <div key={index} className="relative aspect-video rounded-md overflow-hidden group">
                             <Image
                                src={src}
                                alt={`Fitness collage image ${index + 1}`}
                                fill={true} // Use fill instead of layout
                                style={{objectFit:"cover"}} // Use style for objectFit
                                className="transition-transform duration-300 ease-in-out group-hover:scale-105"
                             />
                             <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div> {/* Subtle overlay */}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>


       {/* --- Community Feed --- */}
       <div className="space-y-6">
           <h2 className="text-2xl font-semibold tracking-tight border-b pb-2">Community Feed</h2>
           {isLoadingPosts ? (
               // Skeleton Loader for Posts
               <div className="space-y-6">
                   {[1, 2, 3].map(i => (
                       <Card key={`skel-${i}`} className="shadow-sm">
                           <CardHeader className="flex flex-row items-center gap-3 pb-3">
                               <Skeleton className="h-10 w-10 rounded-full" />
                               <div className="space-y-1">
                                   <Skeleton className="h-4 w-24" />
                                   <Skeleton className="h-3 w-16" />
                               </div>
                           </CardHeader>
                           <CardContent className="space-y-3">
                               <Skeleton className="h-4 w-full" />
                               <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-32 w-full rounded-md" /> {/* Image Placeholder */}
                           </CardContent>
                           <CardFooter className="flex justify-start gap-4 pt-3">
                               <Skeleton className="h-6 w-16 rounded-md" />
                               <Skeleton className="h-6 w-16 rounded-md" />
                           </CardFooter>
                       </Card>
                   ))}
               </div>
           ) : posts.length === 0 ? (
               <Card className="text-center py-12 shadow-sm border-dashed border-muted-foreground/30">
                   <CardHeader>
                       <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                       <CardTitle className="mt-4 text-xl font-semibold">The Community Feed is Quiet...</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <CardDescription>Be the first to share something!</CardDescription>
                   </CardContent>
               </Card>
           ) : (
               posts.map(post => (
                   <Card key={post.id} className="shadow-sm transition-shadow hover:shadow-md">
                       <CardHeader className="flex flex-row items-center gap-3 pb-3">
                           <Avatar>
                               <AvatarImage src={post.avatar} alt={`${post.author}'s avatar`} />
                               <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div>
                               <p className="font-semibold text-sm">{post.author}</p>
                               <p className="text-xs text-muted-foreground">
                                   {post.timestamp.toLocaleDateString()} at {post.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </p>
                           </div>
                       </CardHeader>
                       <CardContent className="space-y-3">
                           <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                           {/* Display Shared Item if exists */}
                           {post.sharedItem && (
                               <div className="border p-3 rounded-md bg-muted/50 flex items-center gap-2">
                                   {post.sharedItem.type === 'streak' && <Flame className="h-5 w-5 text-orange-500" />}
                                   {post.sharedItem.type === 'goal' && <Target className="h-5 w-5 text-blue-500" />}
                                   {post.sharedItem.type === 'badge' && post.sharedItem.BadgeIcon && (
                                        <Badge variant={post.sharedItem.badgeVariant ?? 'secondary'}>
                                            <post.sharedItem.BadgeIcon className="mr-1 h-4 w-4"/>
                                             {post.sharedItem.value}
                                        </Badge>
                                    )}
                                    <span className="text-sm italic">
                                        {post.sharedItem.type === 'streak' && `Shared Streak: ${post.sharedItem.value} days`}
                                        {post.sharedItem.type === 'goal' && `Shared Goal: "${post.sharedItem.value}"`}
                                        {post.sharedItem.type === 'badge' && !post.sharedItem.BadgeIcon && `Shared Badge: ${post.sharedItem.value}`}
                                        {/* Badge text is handled within the Badge component itself if icon exists */}
                                    </span>
                               </div>
                           )}
                           {/* Display Image if exists (Data URI) */}
                            {post.imageUrl && (
                               <div className="mt-3 overflow-hidden rounded-md border max-h-96 flex justify-center items-center bg-muted/20">
                                   {/* Use standard img tag for data URIs */}
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img
                                       src={post.imageUrl}
                                       alt="User shared image"
                                       className="object-contain max-w-full max-h-96 h-auto"
                                       onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide image on error
                                   />
                               </div>
                           )}
                       </CardContent>
                       <CardFooter className="flex justify-start gap-4 pt-3 border-t">
                           <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => handleLikePost(post.id)}>
                               <ThumbsUp className="mr-2 h-4 w-4" /> Like ({post.likes})
                           </Button>
                           <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => handleCommentPost(post.id)}>
                               <MessageSquare className="mr-2 h-4 w-4" /> Comment ({post.comments})
                           </Button>
                           {/* Add Share button for individual posts */}
                           <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                               <Share2 className="mr-2 h-4 w-4" /> Share
                           </Button>
                       </CardFooter>
                   </Card>
               ))
           )}
       </div>
    </div>
  );
}

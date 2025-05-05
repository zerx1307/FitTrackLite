
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Share2 } from "lucide-react"; // Import share icon

import { cn } from "@/lib/utils"
import { Button } from "./button"; // Import button for share action
import { useToast } from "@/hooks/use-toast"; // Import toast for feedback

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
      shareable?: boolean; // Add shareable prop
      shareContent?: { title?: string; text?: string; url?: string }; // Content to share
    }

function Badge({ className, variant, shareable = false, shareContent, children, ...props }: BadgeProps) {
  const { toast } = useToast();

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
     event.stopPropagation(); // Prevent badge click event if inside a clickable element
     const contentToShare = {
        title: shareContent?.title || document.title || 'Check out my achievement!',
        text: shareContent?.text || `I just earned the "${children}" badge on FitTrack Lite!`,
        url: shareContent?.url || window.location.href,
     };

    if (navigator.share) {
      try {
        await navigator.share(contentToShare);
        toast({ title: "Shared successfully!" });
      } catch (error) {
         console.error("Error sharing:", error);
         // Attempt to copy link as fallback if sharing fails or isn't supported well
          if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(`${contentToShare.text} ${contentToShare.url}`);
                    toast({ title: "Link Copied!", description: "Sharing failed, but the link was copied to your clipboard." });
                } catch (copyError) {
                    console.error("Error copying link:", copyError);
                    toast({ title: "Sharing failed", description: "Could not share or copy the link.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Sharing failed", description: "Your browser doesn't support sharing.", variant: "destructive" });
            }
      }
    } else if (navigator.clipboard) {
         // Fallback for browsers without navigator.share but with clipboard access
         try {
            await navigator.clipboard.writeText(`${contentToShare.text} ${contentToShare.url}`);
            toast({ title: "Link Copied!", description: "Sharing not supported, link copied instead." });
         } catch (error) {
            console.error("Error copying link:", error);
            toast({ title: "Sharing failed", description: "Could not copy the link.", variant: "destructive" });
         }
    } else {
      // Fallback for browsers without share or clipboard API
      toast({ title: "Sharing Not Supported", description: "Your browser doesn't support the Web Share API or Clipboard API.", variant: "destructive" });
    }
  };


  return (
    <div className={cn("relative group", className)}> {/* Added group for hover effect */}
        <div className={cn(badgeVariants({ variant }), "flex items-center gap-1")} {...props}>
            {children}
            {shareable && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                         // Adjust color based on badge variant for better contrast
                         variant === 'default' || variant === 'destructive' ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-foreground/70 hover:text-foreground'
                     )}
                    onClick={handleShare}
                    aria-label="Share this badge"
                >
                    <Share2 className="h-3 w-3" />
                </Button>
            )}
        </div>
    </div>
  )
}

export { Badge, badgeVariants }


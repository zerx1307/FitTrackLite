
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, LineChart, Target, LayoutDashboard, Users, Trophy } from 'lucide-react'; // Added Users and Trophy icons
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Updated nav items: Dashboard first, Community added, Leaderboard added, Goals last
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard }, // Dashboard is now the root
  { href: '/log-workout', label: 'Log Workout', icon: Dumbbell },
  { href: '/statistics', label: 'Statistics', icon: LineChart },
  { href: '/community', label: 'Community', icon: Users }, // Added Community
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy }, // Added Leaderboard
  { href: '/goals', label: 'Goals', icon: Target }, // Goals is now the last item
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
             <Link href="/" className="flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors"> {/* Link points to dashboard ('/') */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
                 <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.941 1.152 9.753 9.753 0 0 0-3.776-3.171.75.75 0 0 0-.136-1.071Zm1.433 5.718a.75.75 0 0 0 .967-.527 8.96 8.96 0 0 1 2.731-3.792.75.75 0 0 0-.527-.967 8.963 8.963 0 0 1-3.792 2.731.75.75 0 0 0-.967.527Zm.967 6.465.002.001a.75.75 0 0 0 .725-.024 8.963 8.963 0 0 1 2.682-1.872.75.75 0 1 0-.884-.884 8.963 8.963 0 0 1-1.873 2.682.75.75 0 0 0 .024.725Zm-5.862-3.18a.75.75 0 0 0-.884-.884 8.963 8.963 0 0 1-1.873 2.682.75.75 0 1 0 .725.024 8.963 8.963 0 0 1 2.682-1.873.75.75 0 0 0-.65-.949Z" clipRule="evenodd" />
               </svg>
               <span className="font-bold text-xl">FitTrack Lite</span>
            </Link>
            {/* Show nav items regardless of login status */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            {/* Removed login/signup/user dropdown */}
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                     </svg>
                   </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56" align="end" forceMount>
                   {navItems.map((item) => ( // Iterate over the updated navItems
                     <DropdownMenuItem key={item.href} asChild>
                       <Link href={item.href}>
                         <item.icon className="mr-2 h-4 w-4" />
                         <span>{item.label}</span>
                       </Link>
                     </DropdownMenuItem>
                   ))}
                   {/* Removed logout/login/signup from mobile menu */}
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}



import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Toaster } from "@/components/ui/toaster";
import { WorkoutProvider } from '@/contexts/WorkoutContext';
import { Watermark } from '@/components/layout/watermark'; // Import the Watermark component

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FitTrack Lite',
  description: 'Log workouts, track progress, and reach your fitness goals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-background relative`}> {/* Added relative positioning */}
        {/* Removed AuthProvider wrapper */}
        <WorkoutProvider> {/* WorkoutProvider remains */}
          <Navbar />
          <Watermark /> {/* Add the Watermark component here */}
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10"> {/* Ensure main content is above watermark */}
            {children}
          </main>
          <footer className="bg-muted py-4 mt-auto z-10"> {/* Ensure footer content is above watermark */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
              © {new Date().getFullYear()} FitTrack Lite. All rights reserved.
            </div>
          </footer>
          <Toaster />
        </WorkoutProvider>
      </body>
    </html>
  );
}

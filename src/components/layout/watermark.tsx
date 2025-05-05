
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Watermark() {
  return (
    <div
      className={cn(
        'fixed inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden'
      )}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center text-primary/10 opacity-30 transform -rotate-12 scale-150">
        {/* Replicated SVG from Navbar for consistency */}
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-32 h-32">
            <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.941 1.152 9.753 9.753 0 0 0-3.776-3.171.75.75 0 0 0-.136-1.071Zm1.433 5.718a.75.75 0 0 0 .967-.527 8.96 8.96 0 0 1 2.731-3.792.75.75 0 0 0-.527-.967 8.963 8.963 0 0 1-3.792 2.731.75.75 0 0 0-.967.527Zm.967 6.465.002.001a.75.75 0 0 0 .725-.024 8.963 8.963 0 0 1 2.682-1.872.75.75 0 1 0-.884-.884 8.963 8.963 0 0 1-1.873 2.682.75.75 0 0 0 .024.725Zm-5.862-3.18a.75.75 0 0 0-.884-.884 8.963 8.963 0 0 1-1.873 2.682.75.75 0 1 0 .725.024 8.963 8.963 0 0 1 2.682-1.873.75.75 0 0 0-.65-.949Z" clipRule="evenodd" />
         </svg>
        <span className="font-bold text-8xl tracking-wider">FitTrack Lite</span>
      </div>
    </div>
  );
}

## FitTrack Lite

FitTrack Lite is your personal companion for tracking your fitness journey! Whether you're just starting out or you're a seasoned athlete, FitTrack Lite helps you monitor your workouts, set goals, and stay motivated.

## Features

*   **Workout Logging:** Easily log your exercises, including the type of activity, duration, and intensity.
*   **Calorie Tracking:** Automatically calculate the calories burned during your workouts.
*   **Daily Goal Setting:** Define your daily targets for workout duration, distance, frequency, and calorie expenditure.
*   **Workout Streaks:** Keep your motivation high with our streak system. See how many days in a row you can maintain your fitness routine!
*   **Shareable Badges:** Earn and share milestone badges as you progress.
*   Workout Logging (Exercise Type, Duration, Intensity)
*   Automatic Calorie Calculation (via Formula in Flow - Can be switched to AI)
*   Daily Goal Setting (Duration, Distance, Frequency, Calories) with Timeframes
*   Workout Streaks with Automatic Freeze Usage and Sunday Rest Day Exception
*   Streak Milestone Badges (Shareable)
*   Dashboard with Summary Stats (Workouts, Duration, Calories This Month)
*   Monthly Progress Chart (Duration in Hours, Calories Burned)
*   Statistics Page (Weekly/Monthly Views, History Breakdown)
*   Responsive UI using Shadcn UI components

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2. **Run this in codespace now**
    ```bash
    npm run dev
    ```
5.  **Open the App:**
    Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser.


## Notes

*   Workout data, goals, and streak information are currently stored in **localStorage**. This means data is specific to the browser and will be lost if the browser data is cleared or you use a different browser/device. For persistent storage, integrate Firebase Firestore or Realtime Database.
*   **Authentication is not currently implemented.** The login/signup UI elements are placeholders.
*   **Ensure you have correctly configured your Google AI API key** in `.env.local`. The application **requires** this key for Genkit initialization, even if the current calorie calculation doesn't directly call an LLM.
*   **Make sure both the Next.js server (`npm run dev`) and the Genkit server (`npm run genkit:dev` or `genkit:watch`) are running.** Check both terminal windows for any errors. Errors like "Error reaching server" often indicate a problem with the Genkit flow setup (missing API key or Genkit server not running).

```

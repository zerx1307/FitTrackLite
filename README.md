# FitTrack Lite

This is a Next.js fitness tracker application built in Firebase Studio.

## Features

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
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Set up Firebase (Optional - for future database integration):**
    *   If you plan to add database persistence later:
        *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
        *   Enable **Firestore Database** or **Realtime Database**.
        *   Go to Project Settings -> Your apps -> Web app.
        *   Register your app and copy the Firebase configuration object.

3.  **Configure Environment Variables:**
    *   Create a file named `.env.local` in the root of your project.
    *   Add your Firebase configuration details if you set up Firebase in step 2, prefixing each variable with `NEXT_PUBLIC_`:

    ```.env.local
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional

    # === IMPORTANT: Google AI API Key ===
    # Get one from Google AI Studio: https://aistudio.google.com/app/apikey
    # This key is REQUIRED for the application to run correctly,
    # even if the calorie calculation currently uses a formula.
    # The Genkit framework initializes the Google AI plugin, which needs this key.
    GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
    ```
    *   **Important:** Replace `YOUR_...` placeholders with your actual Firebase credentials if applicable, and **ensure you provide a valid Google AI API key**. `.env.local` is gitignored by default, so your keys won't be committed.
    *   **Restart the development server** (`npm run dev` or similar) after creating or modifying `.env.local`.

4.  **Run the Development Server:**
    *   **You need to run BOTH the Next.js server and the Genkit server concurrently.**
    *   **Terminal 1:** Start the Next.js app.
        ```bash
        npm run dev
        # or
        yarn dev
        # or
        pnpm dev
        ```
    *   **Terminal 2:** Start the Genkit development server.
        ```bash
        npm run genkit:dev
        # or use watch mode for automatic restarts on flow changes:
        # npm run genkit:watch
        ```

5.  **Open the App:**
    Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser.


## Notes

*   Workout data, goals, and streak information are currently stored in **localStorage**. This means data is specific to the browser and will be lost if the browser data is cleared or you use a different browser/device. For persistent storage, integrate Firebase Firestore or Realtime Database.
*   **Authentication is not currently implemented.** The login/signup UI elements are placeholders.
*   **Ensure you have correctly configured your Google AI API key** in `.env.local`. The application **requires** this key for Genkit initialization, even if the current calorie calculation doesn't directly call an LLM.
*   **Make sure both the Next.js server (`npm run dev`) and the Genkit server (`npm run genkit:dev` or `genkit:watch`) are running.** Check both terminal windows for any errors. Errors like "Error reaching server" often indicate a problem with the Genkit flow setup (missing API key or Genkit server not running).

```
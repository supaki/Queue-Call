# Queue Management System

## Overview
A web application for managing queues, built using Google Apps Script and Google Sheets. Suitable for small organizations, clinics, or events. It allows users to book queue tickets, administrators to manage the queues and system settings, and a public display screen to show current queue status.

## Features
*   User Login & Authentication (Username/Password based)
*   Session Management (using `PropertiesService`)
*   Queue Booking & Printable Ticket Display
*   Admin Panel for Queue Management (Call Next, Recall, Skip, Mark as Completed)
*   Real-time Updates on Admin Panel and Display Screen (via polling)
*   Public Queue Display Screen with YouTube Video Integration
*   **Advanced Sound Announcements:** Plays sequenced audio for queue calls (e.g., 'Now calling' + 'Digit 0' + 'Digit 0' + 'Digit 1' + 'at Counter 1').
*   Configurable Service Channels (Add, Edit, Enable/Disable via Settings page)
*   Configurable YouTube Video ID for the Display Screen (via Settings page)
*   Configurable Sound Files for Announcements (via Settings page and `SoundLibrary` sheet)
*   System Initialization & Default Data Setup via a Custom Menu in Google Sheets

## ⚠️ CRITICAL SECURITY WARNING ⚠️
**Plain Text Passwords:** Currently, this system stores user passwords in **PLAIN TEXT** in the `Users` sheet within the Google Sheet. This is a **SEVERE security risk**. 

**DO NOT use this system in a production environment with real user data or for any sensitive application until robust password hashing is implemented.**

It is strongly recommended to research and implement a suitable password hashing library or technique compatible with Google Apps Script (e.g., a JavaScript SHA-256 library with strong salting, or explore integration with external identity providers if feasible for your use case).

## Setup Instructions

**1. Copy/Create the Google Sheet:**
*   **Option A (Recommended if a template is provided):** If you have a link to a template Google Sheet for this project, open it and make a copy (`File > Make a copy`).
*   **Option B (Create New):** Create a new Google Sheet (`sheets.new`). This sheet will serve as your application's database.
*   **Note your Spreadsheet ID:** After creating or copying, note the ID of your Google Sheet. You can find it in the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`. You will need this `SPREADSHEET_ID`.

**2. Copy the Google Apps Script Project Code:**
*   Open your Google Sheet.
*   Go to `Extensions > Apps Script`. This will open the Apps Script editor.
*   **Replicate Project Structure and Code:**
    *   Delete any existing code in `Code.gs` (or other default files if present).
    *   In the Apps Script editor, create the following folder structure and files by right-clicking on `Files` and choosing `Folder` or `Script` (`.gs`) / `HTML` (`.html`).
        *   `appsscript.json` (Manifest file - content below)
        *   **`src`** (Folder)
            *   **`backend`** (Folder)
                *   `auth.gs`
                *   `database.gs`
                *   `display.gs`
                *   `main.gs`
                *   `queue_management.gs`
                *   `settings_management.gs`
                *   `utils.gs`
            *   **`frontend`** (Folder)
                *   `admin_panel.html`
                *   `dashboard.html`
                *   `display_screen.html`
                *   `login.html`
                *   `queue_booking.html`
                *   `scripts.html`
                *   `settings.html`
                *   `styles.html`
    *   Copy the content from each corresponding file in this project's source into the files you've just created in your Apps Script editor.
    *   **Manifest File (`appsscript.json`):**
        *   Click on `Project Settings` (the gear icon ⚙️) in the Apps Script editor.
        *   Check the box "Show "appsscript.json" manifest file in editor".
        *   Return to the `Editor` ( `<>` icon).
        *   Copy the content of this project's `appsscript.json` file into the `appsscript.json` file in your editor.

**3. Configure Spreadsheet ID (Important!):**
*   In the Apps Script editor, open the file `src/backend/database.gs`.
*   Find the line: `const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";`
*   Replace `"YOUR_SPREADSHEET_ID"` with the actual ID of *your* Google Sheet that you noted in Step 1.
    *   *Note:* While the "Initialize System" function uses `SpreadsheetApp.getActiveSpreadsheet()`, some other database functions (`getUsersSheet`, `getQueuesSheet`, etc.) directly use this `SPREADSHEET_ID` constant. It's crucial for these functions that this ID is set correctly to your sheet.

**4. Initialize the System:**
*   Save all script files in the Apps Script editor (File > Save all, or Ctrl+S/Cmd+S).
*   Go back to your Google Sheet page in your browser and **refresh the page**.
*   A new custom menu item "Queue System" should appear after a few seconds.
*   Click `Queue System > Initialize/Verify System`.
*   **Authorize the script:** A dialog box will appear asking for authorization. Click "Continue" or "Review permissions," select your Google account, and then click "Allow" on the next screen to grant the script the necessary permissions (to manage spreadsheets, run as a web app, etc.).
*   This initialization process will:
    *   Create the required sheets (`Users`, `Queues`, `ServiceChannels`, `AppSettings`) if they don't already exist.
    *   Set the correct headers for each sheet.
    *   Freeze the header rows.
    *   Populate the sheets with default data (e.g., a default admin user, sample service channels, and default application settings).
    *   You should see a success message ("System initialized successfully...") when done.

## Deployment as Web App

1.  **Open Deployment Dialog:** In the Apps Script editor, click `Deploy > New deployment`.
2.  **Select Type:**
    *   Click the gear icon next to "Select type" and choose `Web app`.
3.  **Configure Deployment:**
    *   **Description:** Enter a description for this version (e.g., "Queue Management System v1.0").
    *   **Execute as:** Select `Me ([your Google account email])`. This means the web app will always run with your permissions, regardless of who is accessing it.
    *   **Who has access:**
        *   Choose `Anyone` if you want the app to be publicly accessible (users will still need to log in unless specific pages are designed for public access like the display screen).
        *   Choose `Anyone within [Your Google Workspace Organization]` if you want to restrict access to users within your organization.
        *   Choose `Only myself` for testing purposes.
4.  **Deploy:** Click `Deploy`.
5.  **Authorization (if prompted again):** You might be asked to authorize permissions again for the web app deployment.
6.  **Copy Web App URL:** Once deployment is complete, a "Deployment details" dialog will show a **Web app URL**. Copy this URL. This is the main link to your Queue Management System.
    *   The "Open Web App" item in the "Queue System" menu (in your Google Sheet) can also be used to open the deployed application.

## Usage

*   **Accessing the App:** Open the Web app URL obtained after deployment in your browser.
*   **Default Admin Login:**
    *   Username: `adminuser`
    *   Password: `adminpass` (Note: The `addTestData` function sets it as `adminpass`. The previous README mentioned `password123`, which was incorrect based on the code.)
    *   **IMPORTANT:** Change this password immediately after setting up proper password hashing! Since hashing is not yet implemented, you would currently change it directly in the `Users` sheet.
*   **Admin Tasks:**
    *   Log in as the admin user.
    *   Navigate to **Settings** (from the Dashboard) to:
        *   Add, edit, or disable/enable Service Channels.
        *   Configure the YouTube Video ID for the public display screen.
    *   Navigate to **Manage Queues** (Admin Panel, from the Dashboard) to:
        *   Select a service channel.
        *   Call the next waiting queue.
        *   Recall, mark as completed, or skip the currently calling queue.
        *   View lists of waiting and recently processed queues.
*   **User Tasks (e.g., Staff):**
    *   Log in with their credentials (e.g., default `staffuser` with password `staffpass`).
    *   Navigate to **Book a Queue Ticket** (from the Dashboard) to get a queue number. The system will assign them to an available service channel.
*   **Display Screen:**
    *   The public display screen can be accessed directly without login. The URL is typically: `YOUR_WEB_APP_URL?page=display_screen`.
    *   It shows currently serving queue numbers and a short list of waiting numbers.
    *   It plays a sound notification when a new queue number is called.
    *   It displays a configured YouTube video.

## Key Configuration (via Settings Page)

*   **YouTube Video ID:** Admins can set this on the "Settings" page. This ID determines which YouTube video is played on the public display screen.
*   **Default Notification Sound URL (Legacy):** The "Settings" page has an input for "Default Notification Sound URL". This was used by an older, simpler notification system on the display screen. While still present, the primary sound announcement now uses the "Advanced Sound Configuration" below. For the sequenced audio to work, the individual sound components must be configured in the `SoundLibrary` via the Settings page. If the sequenced audio fails or some components are missing, the `display_screen.html` might not produce sound or might have incomplete announcements.

## Advanced Sound Configuration

The system uses a sequence of audio files to announce queue numbers and service channels (e.g., "Now calling... A... 0... 2... 1... at... Counter 1"). This requires configuration by an administrator.

**1. Overview:**
*   Sound configurations are stored in a sheet named `SoundLibrary` within your Google Sheet.
*   This sheet is managed via the **Settings** page in the web application, under the "Sound File Configuration" section.
*   The `initializeSystem` function automatically populates the `SoundLibrary` sheet with the required `SoundID`s and their descriptions. Your task is to provide the actual sound file for each.

**2. Configuring Sounds via Settings Page:**
*   Navigate to the **Settings** page in the web application.
*   Scroll to the **"Sound File Configuration"** section.
*   You will see a table listing `SoundID`s (e.g., `INTRO_PHRASE`, `DIGIT_0`, `CHANNEL_SC01_AUDIO`), their `Description`, and an input field for `FileID or URL`.
*   For each `SoundID`, you need to provide a valid Google Drive File ID or a direct HTTPS URL to an audio file.

**3. Using Google Drive Files (Recommended for simplicity with Google Apps Script):**
*   Upload your audio files (e.g., `.mp3`, `.wav`) to a folder in your Google Drive.
*   For each audio file:
    *   Right-click the file in Google Drive and select "Get link".
    *   Ensure the sharing setting is changed from "Restricted" to **"Anyone with the link"** (role: Viewer). This is crucial for the script to access the files.
    *   Copy the link. The link will look something like: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`.
    *   Extract the `FILE_ID` from this link.
    *   Paste only the `FILE_ID` into the corresponding "FileID or URL" field on the Settings page for the relevant `SoundID`.
*   The system will automatically construct the correct playable URL for Google Drive files (using `https://drive.google.com/uc?export=download&id=FILE_ID`).

**4. Using Direct HTTPS URLs:**
*   If your audio files are hosted on a publicly accessible server (not requiring authentication), you can paste the full HTTPS URL (e.g., `https://example.com/sounds/digit_1.mp3`) directly into the "FileID or URL" field.
*   Ensure these URLs are stable and the files are directly playable.

**5. Required `SoundID`s for Full Announcement:**
    The `initializeSystem` function creates these `SoundID`s. You need to provide the audio source for them:
    *   `INTRO_PHRASE`: Played at the beginning (e.g., "Now calling," or "Now serving,").
    *   `DIGIT_0` through `DIGIT_9`: Individual sounds for each digit. These are essential for announcing the numeric part of the queue number.
    *   `AT_CHANNEL`: An optional phrase like "at" or "please proceed to," played before the channel name/sound.
    *   `CHANNEL_{ServiceChannelID}_AUDIO`: A specific sound for announcing the service channel name (e.g., `CHANNEL_SC01_AUDIO` for "Counter 1", `CHANNEL_SC02_AUDIO` for "Information Desk"). These `SoundID`s are automatically generated in the `SoundLibrary` sheet by the `initializeSystem` function based on the Service Channels you have defined or that were created by `addTestData`. You need to provide the audio file for each of these.

**6. Sound File Format & Quality:**
*   Use web-playable audio formats like MP3, WAV, or OGG.
*   Keep audio clips short, clear, and at a consistent volume level for the best user experience.
*   Test the full announcement sequence after configuring to ensure it sounds correct.

## Troubleshooting

*   **"Authorization required" errors:** If you encounter permission errors when running the script or accessing the web app, ensure you have correctly authorized all requested permissions during the initialization (Step 4) or deployment (Step 6). You might need to re-authorize via `Deploy > Manage deployments`, select your deployment, edit, and re-deploy to trigger the auth flow again.
*   **`getScriptUrl is not a function` JavaScript error:** This error message might appear if an older version of the code is cached or due to specific environment issues. The current codebase uses a server-side function `getServedUrl(pageName)` to generate navigation URLs. Ensure you are running the latest version of all script files. Try clearing your browser cache for the web app URL or accessing it in an incognito/private browsing window.
*   **Menu Not Appearing:** If the "Queue System" menu doesn't appear in your Google Sheet after refreshing, ensure the `onOpen()` function is correctly copied into `src/backend/main.gs` and that there are no syntax errors in any of your `.gs` files preventing the script from loading. Check `Extensions > Apps Script > Executions` for any errors on `onOpen` triggers.
*   **Web App Shows "Error" or "Page Not Found":**
    *   Double-check that the `SPREADSHEET_ID` in `src/backend/database.gs` is correctly set to *your* sheet's ID.
    *   Ensure all HTML files are correctly named and their content copied into the Apps Script editor under the `frontend/` path (simulated by filename prefix if folders not truly supported by older editor).
    *   Verify the `doGet(e)` function in `src/backend/main.gs` has the correct file paths for each page.
    *   Check `View > Logs` or `View > Executions` in the Apps Script editor for server-side errors when you try to load the web app.

## Future Enhancements & Known Issues

*   **Password Hashing (CRITICAL):** Implement robust password hashing immediately.
*   **Dynamic YouTube URL on Display:** The `display_screen.html` should ideally fetch the `youtubeVideoId` from `AppSettings` via a backend function call, rather than using a hardcoded default. This part of the "Key Configuration" is complete on the settings page but not fully utilized by the display screen yet.
*   **Dynamic Default Notification Sound URL on Display:** Similar to the YouTube ID, the `defaultNotificationSoundUrl` from `AppSettings` (now configurable on the Settings page) should be fetched and used by `display_screen.html` for its *single* notification sound, if the advanced sequenced sound fails or as a simpler alternative. The advanced sound system uses the `SoundLibrary`.
*   **Advanced Sound Sequence Playback:**
    *   Currently, if multiple new queues are called simultaneously, only the sound sequence for the *first one detected* will be played to avoid overlapping audio. Subsequent new calls will only play if the previous sequence has finished.
    *   There's no complex queuing or mixing of sound sequences.
*   **ServiceChannelID Generation:** The `addServiceChannel` function in `database.gs` uses a simple method for `ServiceChannelID`. For better uniqueness, consider changing this to use `Utilities.getUuid()`.
*   **Error Handling & User Feedback:** Can be further enhanced, especially for audio playback issues on the display screen.
*   **Concurrency:** For high-volume usage, `LockService` use should be reviewed.
*   **UI/UX Improvements:** Pagination for long lists, more sophisticated modal validations, etc.
*   **Accessibility (a11y):** Review and improve web accessibility.

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
*   Sound Notification for New Calls on the Public Display Screen
*   Configurable Service Channels (Add, Edit, Enable/Disable via Settings page)
*   Configurable YouTube Video ID for the Display Screen (via Settings page)
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
*   **Notification Sound URL:**
    *   **TODO:** The "Settings" page needs an input field for "Default Notification Sound URL".
    *   The `display_screen.html` currently uses a hardcoded placeholder sound URL (`https://actions.google.com/sounds/v1/alarms/bell_timer.ogg`).
    *   This should be updated so `display_screen.html` fetches this URL from `AppSettings` (via a backend function in `display.gs`) and uses it for notifications.

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
*   **Dynamic YouTube/Sound URL on Display:** Complete the implementation for `display_screen.html` to fetch the YouTube Video ID and Notification Sound URL from `AppSettings` (via a backend call). The Settings page also needs an input for the sound URL.
*   **Distinct Recall Sound:** The current sound notification on the display screen triggers for any new queue ID appearing in the "calling" list. A distinct sound or visual cue for "recalled" queues might require more specific logic.
*   **ServiceChannelID Generation:** The `addServiceChannel` function in `database.gs` uses a simple random method for `ServiceChannelID`. For better uniqueness, consider changing this to use `Utilities.getUuid()`, similar to how `UserID` and `QueueID` are generated.
*   **Error Handling & User Feedback:** Enhance global error handling and provide more specific, user-friendly feedback for various actions.
*   **Concurrency:** For high-volume usage, review and potentially enhance the use of `LockService` to prevent race conditions in spreadsheet updates or `PropertiesService` access.
*   **UI/UX Improvements:**
    *   Add pagination for long lists (e.g., queue history in Admin Panel).
    *   Improve visual feedback for background operations.
    *   Consider a more sophisticated UI for the Edit Channel modal instead of a simple browser alert for validation.
*   **Customizable Sounds:** Implement the originally planned `Sounds` sheet and Google Drive integration if custom notification sounds are desired.
*   **Accessibility (a11y):** Review and improve web accessibility of the frontend pages.

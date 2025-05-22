# Queue Management System

This project is a queue management system built using Google Apps Script, HTML, Tailwind CSS, and JavaScript.

## Features

- User authentication (login)
- Dashboard for staff
- Queue booking
- Admin panel for managing service channels, sounds, and other settings
- Public display screen for queue information
- Customizable sounds for notifications
- YouTube video integration for the display screen

## Project Structure

- `src/frontend/`: Contains HTML, CSS, and client-side JavaScript files.
- `src/backend/`: Contains Google Apps Script files for server-side logic.
- `appsscript.json`: Manifest file for Google Apps Script project.
- `README.md`: This file.

## Google Sheet Structure

The project uses a Google Sheet as its database. The following sheets and columns are defined:

1.  **Users Sheet:**
    *   `UserID` (Primary Key, auto-generated or email)
    *   `Username`
    *   `PasswordHash` (Hashed password)
    *   `Email`
    *   `Role` (e.g., 'admin', 'staff')
2.  **Queues Sheet:**
    *   `QueueID` (Primary Key, auto-generated)
    *   `QueueNumber` (e.g., A001, B001)
    *   `ServiceChannelID` (Foreign Key to ServiceChannels Sheet)
    *   `TimestampCreated`
    *   `TimestampCalled`
    *   `TimestampCompleted`
    *   `Status` (e.g., 'waiting', 'calling', 'completed', 'skipped')
    *   `CalledByUserID` (Foreign Key to Users Sheet)
3.  **ServiceChannels Sheet:**
    *   `ServiceChannelID` (Primary Key, auto-generated)
    *   `ChannelName` (e.g., "Counter 1", "Registration")
    *   `ChannelCode` (e.g., "A", "B" - for queue number prefix)
    *   `IsEnabled` (Boolean)
4.  **Sounds Sheet:**
    *   `SoundID` (Primary Key, auto-generated)
    *   `SoundName` (e.g., "Call Tone 1")
    *   `FileID` (Google Drive File ID of the uploaded sound)
5.  **AppSettings Sheet:** (For general settings)
    *   `SettingName`
    *   `SettingValue` (e.g., YouTube URL for display, default sound)

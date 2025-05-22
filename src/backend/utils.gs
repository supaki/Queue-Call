// Collection of utility functions for the application, such as password generation and system initialization.

/**
 * Generates a random alphanumeric string of a specified length.
 * Useful for creating temporary passwords or unique identifiers.
 * @param {number} [length=8] The desired length of the generated string. Defaults to 8 if not specified.
 * @return {string} The randomly generated alphanumeric string.
 */
function generateTemporaryPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  Logger.log("Generated temporary password of length " + length + ".");
  return password;
}

/**
 * Initializes the system by creating necessary Google Sheets (if they don't exist),
 * setting up their headers, and populating them with initial/default data.
 * This function is typically called from a custom menu in the Google Sheet.
 * It uses constants for sheet names and header definitions defined in `database.gs`.
 */
function initializeSystem() {
  const ui = SpreadsheetApp.getUi(); // Get the UI environment to show alerts.
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // Get the currently active spreadsheet.
    Logger.log("Starting system initialization for spreadsheet: " + ss.getName() + " (ID: " + ss.getId() + ")");

    // Define the structure for each sheet that needs to be initialized.
    // These constants (USERS_SHEET_NAME, etc.) are expected to be globally available (e.g., from database.gs).
    const sheetDefinitions = [
      { name: USERS_SHEET_NAME, headers: ["UserID", "Username", "PasswordHash", "Email", "Role"] },
      { name: QUEUES_SHEET_NAME, headers: ["QueueID", "QueueNumber", "ServiceChannelID", "TimestampCreated", "TimestampCalled", "TimestampCompleted", "Status", "CalledByUserID"] },
      { name: SERVICE_CHANNELS_SHEET_NAME, headers: ["ServiceChannelID", "ChannelName", "ChannelCode", "IsEnabled"] },
      { name: APP_SETTINGS_SHEET_NAME, headers: ["SettingName", "SettingValue"] }
    ];

    // Iterate through each sheet definition to create/verify its structure.
    sheetDefinitions.forEach(def => {
      let sheet = ss.getSheetByName(def.name);
      if (!sheet) {
        // If the sheet doesn't exist, create it.
        sheet = ss.insertSheet(def.name);
        Logger.log("Sheet '" + def.name + "' created.");
      } else {
        Logger.log("Sheet '" + def.name + "' already exists. Ensuring headers are correct.");
        // If sheet exists, we will still ensure the header row is set correctly.
        // Clearing the first row only. A more destructive approach would be sheet.clearContents().
      }
      
      // Ensure the header row is correctly set up.
      // Clear the first row before writing headers to prevent issues if headers changed or were malformed.
      if (sheet.getLastRow() > 0 || sheet.getLastColumn() > 0) { // Check if there's any content or formatting
          // sheet.getRange(1, 1, 1, sheet.getMaxColumns()).clearContent(); // Clears only content of the first row
          // A slightly more robust way if there are many columns from previous state:
          if (sheet.getLastRow() >= 1) { // Only clear if there's at least one row.
            sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), def.headers.length)).clearContent();
          }
      }
      // Set the headers for the current sheet.
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      sheet.setFrozenRows(1); // Freeze the header row for better usability.
      Logger.log("Headers set and first row frozen for sheet '" + def.name + "'.");
    });

    Logger.log("All sheets and headers initialized successfully.");

    // Populate initial data using the addTestData function (expected from database.gs).
    Logger.log("Populating initial/default data using addTestData()...");
    addTestData(); 
    Logger.log("Initial data population process complete.");

    // Notify the user of successful initialization.
    ui.alert("System Initialization Complete", "The system has been initialized successfully. All necessary sheets, headers, and default data have been set up.", ui.ButtonSet.OK);

  } catch (e) {
    // Log any errors and notify the user if initialization fails.
    Logger.log("CRITICAL: Error during system initialization: " + e.message + " Stack: " + e.stack);
    ui.alert("Initialization Failed", "An error occurred during system initialization: " + e.message + ". Check logs for details.", ui.ButtonSet.OK);
  }
}

// Collection of functions for direct interaction with the Google Spreadsheet, acting as a database layer.

// --- Global Constants for Sheet Names ---
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // Placeholder, consider using SpreadsheetApp.getActiveSpreadsheet() for bound scripts.
const USERS_SHEET_NAME = "Users";
const QUEUES_SHEET_NAME = "Queues";
const SERVICE_CHANNELS_SHEET_NAME = "ServiceChannels";
const APP_SETTINGS_SHEET_NAME = "AppSettings";

// --- Sheet Accessor Functions ---

/**
 * Gets the 'Users' sheet object from the active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The Users sheet object, or null if not found.
 */
function getUsersSheet() {
  // Consider using SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME)
  // if SPREADSHEET_ID is not reliably set or for better portability of bound scripts.
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID); 
  return spreadsheet ? spreadsheet.getSheetByName(USERS_SHEET_NAME) : null;
}

/**
 * Gets the 'Queues' sheet object from the active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The Queues sheet object, or null if not found.
 */
function getQueuesSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet ? spreadsheet.getSheetByName(QUEUES_SHEET_NAME) : null;
}

/**
 * Gets the 'ServiceChannels' sheet object from the active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The ServiceChannels sheet object, or null if not found.
 */
function getServiceChannelsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet ? spreadsheet.getSheetByName(SERVICE_CHANNELS_SHEET_NAME) : null;
}

/**
 * Gets the 'AppSettings' sheet object from the active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The AppSettings sheet object, or null if not found.
 */
function getAppSettingsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet ? spreadsheet.getSheetByName(APP_SETTINGS_SHEET_NAME) : null;
}

/**
 * Gets the 'SoundLibrary' sheet object from the active spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The SoundLibrary sheet object, or null if not found.
 */
function getSoundLibrarySheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet ? spreadsheet.getSheetByName("SoundLibrary") : null; // Assuming "SoundLibrary" is the sheet name
}

// --- Data Transformation Utilities ---

/**
 * Converts a sheet data row (array) into an object, using headers as keys.
 * @param {Array<string>} headers An array of strings representing the column headers.
 * @param {Array<any>} rowData An array of data corresponding to a single row.
 * @return {object} An object where each header is a key and the corresponding row data is the value.
 */
function rowToObject_(headers, rowData) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = rowData[index];
  });
  return obj;
}

// --- User Management Functions ---

/**
 * Finds a user by their username in the 'Users' sheet.
 * @param {string} username The username to search for.
 * @return {object|null} The user object (a row converted to an object) if found, or null otherwise.
 */
function getUserByUsername(username) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("getUserByUsername: Users sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues(); // Get all data from the sheet
  const headers = data[0]; // First row is assumed to be headers
  const usernameCol = headers.indexOf("Username");

  if (usernameCol === -1) {
    Logger.log("getUserByUsername: 'Username' column not found in Users sheet.");
    return null;
  }

  // Iterate through rows (starting from the second row, after headers)
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameCol] === username) {
      return rowToObject_(headers, data[i]); // Convert the found row to an object
    }
  }
  Logger.log("getUserByUsername: User '" + username + "' not found.");
  return null;
}

/**
 * Finds a user by their email address in the 'Users' sheet.
 * @param {string} email The email address to search for.
 * @return {object|null} The user object if found, or null otherwise.
 */
function getUserByEmail(email) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("getUserByEmail: Users sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf("Email");

  if (emailCol === -1) {
    Logger.log("getUserByEmail: 'Email' column not found in Users sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      return rowToObject_(headers, data[i]);
    }
  }
  Logger.log("getUserByEmail: Email '" + email + "' not found.");
  return null;
}

/**
 * Updates the password for a user identified by their email in the 'Users' sheet.
 * FIXME: Passwords should be hashed. This function currently stores plain text passwords.
 * @param {string} email The email of the user whose password is to be updated.
 * @param {string} newPassword The new plain text password.
 * @return {boolean} True if the password was updated successfully, false otherwise.
 */
function updateUserPassword(email, newPassword) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("updateUserPassword: Users sheet not found.");
    return false;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf("Email");
  const passwordCol = headers.indexOf("PasswordHash"); // Column where password (hash) is stored

  if (emailCol === -1 || passwordCol === -1) {
    Logger.log("updateUserPassword: 'Email' or 'PasswordHash' column not found.");
    return false;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      sheet.getRange(i + 1, passwordCol + 1).setValue(newPassword); // i+1 for 1-based indexing, passwordCol+1 for 1-based indexing
      Logger.log("updateUserPassword: Password updated for user '" + email + "'.");
      return true;
    }
  }
  Logger.log("updateUserPassword: User '" + email + "' not found for password update.");
  return false;
}

// --- Service Channel Management Functions ---

/**
 * Gets all active (IsEnabled = true) service channels from the 'ServiceChannels' sheet.
 * @return {Array<object>} An array of active service channel objects. Returns empty if sheet not found or no active channels.
 */
function getActiveServiceChannels() {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("getActiveServiceChannels: ServiceChannels sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data rows beyond headers
  const headers = data[0];
  const activeChannels = [];
  for (let i = 1; i < data.length; i++) {
    const channel = rowToObject_(headers, data[i]);
    // Ensure IsEnabled is strictly true (boolean or string "TRUE")
    if (channel.IsEnabled === true || String(channel.IsEnabled).toUpperCase() === "TRUE") {
      activeChannels.push(channel);
    }
  }
  return activeChannels;
}

/**
 * Gets all service channels from the 'ServiceChannels' sheet, regardless of their 'IsEnabled' status.
 * @return {Array<object>} An array of all service channel objects. Returns empty if sheet not found.
 */
function getAllServiceChannels() {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("getAllServiceChannels: ServiceChannels sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data rows beyond headers
  const headers = data[0];
  const allChannels = [];
  for (let i = 1; i < data.length; i++) {
    allChannels.push(rowToObject_(headers, data[i]));
  }
  Logger.log("getAllServiceChannels: Fetched " + allChannels.length + " channels.");
  return allChannels;
}


/**
 * Gets a specific service channel by its ID from the 'ServiceChannels' sheet.
 * @param {string} channelId The ID of the service channel to find.
 * @return {object|null} The service channel object if found, or null otherwise.
 */
function getServiceChannelById(channelId) {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("getServiceChannelById: ServiceChannels sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ServiceChannelID");

  if (idCol === -1) {
     Logger.log("getServiceChannelById: 'ServiceChannelID' column not found in ServiceChannels sheet.");
     return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === channelId) {
      return rowToObject_(headers, data[i]);
    }
  }
  Logger.log("getServiceChannelById: Channel with ID '" + channelId + "' not found.");
  return null;
}

// --- Queue Management Functions ---

/**
 * Generates the next queue number for a given service channel (e.g., "A001", "A002").
 * The number resets daily for each channel.
 * @param {string} serviceChannelID The ID of the service channel.
 * @param {string} channelCode The prefix code for the channel (e.g., "A").
 * @return {string} The next formatted queue number (e.g., "A001").
 */
function getNextQueueNumber(serviceChannelID, channelCode) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("getNextQueueNumber: Queues sheet not found. Defaulting queue number to " + channelCode + "001.");
    return channelCode + "001"; // Default if sheet doesn't exist
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return channelCode + "001"; // No data beyond headers, so start with 001

  const headers = data[0];
  const queueNumCol = headers.indexOf("QueueNumber");
  const channelIdCol = headers.indexOf("ServiceChannelID");
  const timestampCol = headers.indexOf("TimestampCreated");

  if (queueNumCol === -1 || channelIdCol === -1 || timestampCol === -1) {
    Logger.log("getNextQueueNumber: Required columns (QueueNumber, ServiceChannelID, TimestampCreated) missing in Queues sheet. Defaulting queue number.");
    return channelCode + "001"; // Default if critical columns are missing
  }

  let maxNum = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the start of today for date comparison

  // Iterate through existing queue entries for the specific channel and today's date
  for (let i = 1; i < data.length; i++) {
    const rowChannelId = data[i][channelIdCol];
    const timestampStr = data[i][timestampCol];
    const queueNumStr = data[i][queueNumCol];

    if (rowChannelId === serviceChannelID && timestampStr) {
      const itemDate = new Date(timestampStr);
      itemDate.setHours(0, 0, 0, 0); // Normalize item's date

      // Check if the queue entry is for today and matches the channel code prefix
      if (itemDate.getTime() === today.getTime() && queueNumStr && queueNumStr.startsWith(channelCode)) {
        const numPart = parseInt(queueNumStr.substring(channelCode.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart; // Update max number found for today for this channel
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  // Format number with leading zeros (e.g., 1 -> "001", 12 -> "012", 123 -> "123")
  return channelCode + ("000" + nextNum).slice(-3);
}

/**
 * Adds a new queue record to the 'Queues' sheet.
 * @param {object} queueData An object containing the data for the new queue.
 *                           Expected properties: QueueID, QueueNumber, ServiceChannelID, TimestampCreated, Status.
 *                           Optional: TimestampCalled, TimestampCompleted, CalledByUserID.
 * @return {boolean} True if the queue was added successfully, false otherwise.
 */
function addNewQueue(queueData) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("addNewQueue: Queues sheet not found. Cannot add new queue.");
    return false;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Map queueData to an array in the order of headers, providing empty string for missing properties
  const newRow = headers.map(header => queueData[header] !== undefined ? queueData[header] : ""); 
  try {
    sheet.appendRow(newRow);
    Logger.log("addNewQueue: New queue added - " + JSON.stringify(queueData));
    return true;
  } catch (e) {
    Logger.log("addNewQueue: Error adding new queue - " + e.message);
    return false;
  }
}

/**
 * Gets a specific queue by its ID from the 'Queues' sheet.
 * @param {string} queueId The ID of the queue to find.
 * @return {object|null} The queue object if found, or null otherwise.
 */
function getQueueById(queueId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("getQueueById: Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("QueueID");

  if (idCol === -1) {
    Logger.log("getQueueById: 'QueueID' column not found in Queues sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === queueId) {
      return rowToObject_(headers, data[i]);
    }
  }
  Logger.log("getQueueById: Queue with ID '" + queueId + "' not found.");
  return null;
}

/**
 * Gets the oldest 'waiting' queue for a specific service channel.
 * @param {string} serviceChannelId The ID of the service channel.
 * @return {object|null} The oldest waiting queue object, or null if no waiting queues are found for the channel.
 */
function getOldestWaitingQueue(serviceChannelId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("getOldestWaitingQueue: Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null; // No data rows
  const headers = data[0];
  const channelIdCol = headers.indexOf("ServiceChannelID");
  const statusCol = headers.indexOf("Status");
  const timestampCol = headers.indexOf("TimestampCreated");

  if (channelIdCol === -1 || statusCol === -1 || timestampCol === -1) {
    Logger.log("getOldestWaitingQueue: Required columns (ServiceChannelID, Status, TimestampCreated) not found.");
    return null;
  }

  let oldestQueue = null;
  let oldestTimestamp = null;

  // Iterate through queues to find the oldest one that is 'waiting' for the specified channel
  for (let i = 1; i < data.length; i++) {
    if (data[i][channelIdCol] === serviceChannelId && data[i][statusCol] === "waiting") {
      const currentTimestamp = new Date(data[i][timestampCol]);
      if (!oldestQueue || currentTimestamp < oldestTimestamp) {
        oldestTimestamp = currentTimestamp;
        oldestQueue = rowToObject_(headers, data[i]);
      }
    }
  }
  if (oldestQueue) {
    Logger.log("getOldestWaitingQueue: Found oldest waiting queue ID '" + oldestQueue.QueueID + "' for channel '" + serviceChannelId + "'.");
  } else {
    Logger.log("getOldestWaitingQueue: No waiting queues found for channel '" + serviceChannelId + "'.");
  }
  return oldestQueue;
}

/**
 * Updates the status and related fields (like timestamps and user ID) of a specific queue.
 * @param {string} queueId The ID of the queue to update.
 * @param {string} newStatus The new status (e.g., "calling", "completed", "skipped").
 * @param {string} adminUserId The UserID of the admin/staff performing the action.
 * @return {object|null} The updated queue object if successful, or null if the queue is not found or an error occurs.
 */
function updateQueueStatus(queueId, newStatus, adminUserId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("updateQueueStatus: Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues(); // Get all data once
  const headers = data[0];
  const idCol = headers.indexOf("QueueID");
  const statusCol = headers.indexOf("Status");
  const calledByCol = headers.indexOf("CalledByUserID");
  const tsCalledCol = headers.indexOf("TimestampCalled");
  const tsCompletedCol = headers.indexOf("TimestampCompleted");

  if (idCol === -1 || statusCol === -1 || calledByCol === -1 || tsCalledCol === -1 || tsCompletedCol === -1) {
    Logger.log("updateQueueStatus: One or more required columns are missing in Queues sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === queueId) {
      const rowNum = i + 1; // 1-based index for sheet range
      // Update status and the user who performed the action
      sheet.getRange(rowNum, statusCol + 1).setValue(newStatus);
      sheet.getRange(rowNum, calledByCol + 1).setValue(adminUserId); 

      // Update timestamps based on the new status
      if (newStatus === "calling") {
        sheet.getRange(rowNum, tsCalledCol + 1).setValue(new Date().toISOString());
      } else if (newStatus === "completed") {
        sheet.getRange(rowNum, tsCompletedCol + 1).setValue(new Date().toISOString());
      }
      // For "skipped", TimestampCalled might be cleared or left as is depending on workflow.
      
      // Fetch the updated row data to return the updated object
      const updatedRowValues = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
      const updatedQueue = rowToObject_(headers, updatedRowValues);
      Logger.log("updateQueueStatus: Queue '" + queueId + "' updated to status '" + newStatus + "' by user '" + adminUserId + "'. Details: " + JSON.stringify(updatedQueue));
      return updatedQueue;
    }
  }
  Logger.log("updateQueueStatus: Queue with ID '" + queueId + "' not found for status update.");
  return null;
}

/**
 * Fetches queues from the 'Queues' sheet based on specified filters, sorting, and limit.
 * @param {string|null} serviceChannelId Filter by service channel ID. Pass null or empty string to fetch for all channels.
 * @param {Array<string>|null} statusFiltersArray Array of statuses to filter by (e.g., ["waiting", "calling"]). Pass null or empty array for all statuses.
 * @param {number} limit The maximum number of queue records to return.
 * @param {string} sortField The field name (column header) to sort by (e.g., "TimestampCreated").
 * @param {boolean} sortAscending True for ascending sort, false for descending.
 * @return {Array<object>} An array of queue objects matching the criteria.
 */
function fetchQueues(serviceChannelId, statusFiltersArray, limit, sortField, sortAscending) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("fetchQueues: Queues sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data rows
  const headers = data[0];
  
  const sortFieldCol = headers.indexOf(sortField); // Check if sortField is a valid header

  if (sortFieldCol === -1 && sortField) { // Only log if sortField was provided but not found
    Logger.log("fetchQueues: Sort field '" + sortField + "' not found in Queues sheet. Results will not be sorted by this field.");
  }

  let results = [];
  // Filter data
  for (let i = 1; i < data.length; i++) {
    const queue = rowToObject_(headers, data[i]);
    
    // Apply serviceChannelId filter
    if (serviceChannelId && queue.ServiceChannelID !== serviceChannelId) continue;
    // Apply status filter
    if (statusFiltersArray && statusFiltersArray.length > 0 && !statusFiltersArray.includes(queue.Status)) continue;
    
    results.push(queue);
  }

  // Sort results if a valid sortField is provided
  if (sortField && sortFieldCol !== -1) {
    results.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      // Handle date strings by converting to Date objects for proper comparison
      if (sortField === "TimestampCreated" || sortField === "TimestampCalled" || sortField === "TimestampCompleted") {
        valA = valA ? new Date(valA) : null; // Handle empty/null date strings
        valB = valB ? new Date(valB) : null;
      }
      
      // Handle null or undefined values in sorting to prevent errors
      if (valA === null || valA === undefined || valA === "") return sortAscending ? 1 : -1; // Push nulls/empty to end
      if (valB === null || valB === undefined || valB === "") return sortAscending ? -1 : 1; // Push nulls/empty to end

      if (valA < valB) return sortAscending ? -1 : 1;
      if (valA > valB) return sortAscending ? 1 : -1;
      return 0;
    });
  }

  // Limit results
  if (limit && limit > 0 && results.length > limit) {
    results = results.slice(0, limit);
  }
  Logger.log("fetchQueues: Fetched " + results.length + " queues with given criteria.");
  return results;
}

// --- Settings Management Database Functions ---

/**
 * Gets all application settings from the 'AppSettings' sheet.
 * Returns default values for expected settings if they are not found in the sheet.
 * @return {object} An object where keys are SettingName and values are SettingValue.
 */
function getAppSettings() {
  // Define default settings to ensure the application has fallback values
  const defaultSettings = {
    youtubeVideoId: "dQw4w9WgXcQ", // Default: Rick Astley - Never Gonna Give You Up
    defaultNotificationSoundUrl: "https://actions.google.com/sounds/v1/alarms/bell_timer.ogg" // Default sound
  };
  const sheet = getAppSettingsSheet();
  if (!sheet) {
    Logger.log("getAppSettings: AppSettings sheet not found. Returning default settings.");
    return defaultSettings;
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { // Only headers or empty sheet
      Logger.log("getAppSettings: AppSettings sheet is empty or has only headers. Returning default settings.");
      return defaultSettings;
  }
  const headers = data[0];
  const nameCol = headers.indexOf("SettingName");
  const valueCol = headers.indexOf("SettingValue");

  if (nameCol === -1 || valueCol === -1) {
    Logger.log("getAppSettings: 'SettingName' or 'SettingValue' column not found in AppSettings. Returning default settings.");
    return defaultSettings;
  }

  const settings = {};
  for (let i = 1; i < data.length; i++) {
    if(data[i][nameCol]) { // Ensure setting name is not empty
        settings[data[i][nameCol]] = data[i][valueCol];
    }
  }
  // Merge fetched settings with defaults. Fetched settings will override defaults if present.
  // This ensures that all keys in defaultSettings are present in the returned object.
  return Object.assign({}, defaultSettings, settings);
}

/**
 * Updates a specific application setting in the 'AppSettings' sheet.
 * If the setting name does not exist, it adds a new row for the setting.
 * @param {string} name The name of the setting (e.g., "youtubeVideoId").
 * @param {string} value The new value for the setting.
 * @return {boolean} True if the setting was updated or added successfully, false otherwise.
 */
function updateSetting(name, value) {
  const sheet = getAppSettingsSheet();
  if (!sheet) {
    Logger.log("updateSetting: AppSettings sheet not found. Cannot update setting.");
    return false;
  }
  // Ensure headers are present if sheet is empty (though initializeSystem should handle this)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["SettingName", "SettingValue"]);
    Logger.log("updateSetting: Added headers to empty AppSettings sheet.");
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const nameCol = headers.indexOf("SettingName");
  const valueCol = headers.indexOf("SettingValue");

  if (nameCol === -1 || valueCol === -1) {
    Logger.log("updateSetting: 'SettingName' or 'SettingValue' column not found in AppSettings. Cannot update.");
    return false;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const nameCol = headers.indexOf("SettingName");
  const valueCol = headers.indexOf("SettingValue");

  if (nameCol === -1 || valueCol === -1) {
    Logger.log("updateSetting: 'SettingName' or 'SettingValue' column not found in AppSettings. Cannot update.");
    return false;
  }

  // Try to find and update existing setting
  for (let i = 1; i < data.length; i++) {
    if (data[i][nameCol] === name) {
      sheet.getRange(i + 1, valueCol + 1).setValue(value);
      Logger.log("updateSetting: Setting '" + name + "' updated to '" + value + "'.");
      return true;
    }
  }

  // Setting not found, add it as a new row
  sheet.appendRow([name, value]);
  Logger.log("updateSetting: Setting '" + name + "' added with value '" + value + "'.");
  return true;
}

/**
 * Adds a new service channel to the 'ServiceChannels' sheet.
 * @param {string} name The name of the new service channel.
 * @param {string} code The code for the new service channel (e.g., "A", "B").
 * @return {object|null} The new channel object (including generated ServiceChannelID) if successful, or null if an error occurs.
 */
function addServiceChannel(name, code) {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("addServiceChannel: ServiceChannels sheet not found. Cannot add channel.");
    return null;
  }
  // Simple ID generation: "SC" + First 3 chars of name (uppercase) + 2 random digits.
  // Consider using Utilities.getUuid() for more robust unique IDs, especially if channel names can be similar.
  const newId = "SC" + (name ? name.substring(0,3).toUpperCase().replace(/\s/g, '') : "NUL") + Math.floor(Math.random() * 90 + 10);
  
  const newChannel = {
    ServiceChannelID: newId,
    ChannelName: name,
    ChannelCode: code,
    IsEnabled: true // New channels default to being enabled
  };

  try {
    sheet.appendRow([newChannel.ServiceChannelID, newChannel.ChannelName, newChannel.ChannelCode, newChannel.IsEnabled]);
    Logger.log("addServiceChannel: New service channel added - " + JSON.stringify(newChannel));
    return newChannel;
  } catch(e) {
    Logger.log("addServiceChannel: Error adding service channel - " + e.message);
    return null;
  }
}

/**
 * Updates an existing service channel in the 'ServiceChannels' sheet.
 * Allows partial updates: if a parameter (name, code, isEnabled) is null or undefined, that field is not changed.
 * @param {string} id The ID of the service channel to update.
 * @param {string|null} name The new name (or null/undefined to not change).
 * @param {string|null} code The new code (or null/undefined to not change).
 * @param {boolean|null} isEnabled The new enabled status (or null/undefined to not change).
 * @return {object|null} The updated channel object if successful, or null if the channel is not found or an error occurs.
 */
function updateServiceChannel(id, name, code, isEnabled) {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("updateServiceChannel: ServiceChannels sheet not found. Cannot update channel.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ServiceChannelID");
  const nameCol = headers.indexOf("ChannelName");
  const codeCol = headers.indexOf("ChannelCode");
  const enabledCol = headers.indexOf("IsEnabled");

  if (idCol === -1 || nameCol === -1 || codeCol === -1 || enabledCol === -1) {
     Logger.log("updateServiceChannel: One or more required columns missing in ServiceChannels sheet.");
     return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      const rowNum = i + 1; // 1-based index for sheet range
      let updated = false; // Flag to track if any changes were made
      
      // Update ChannelName if 'name' parameter is provided and different from current
      if (name !== null && name !== undefined && data[i][nameCol] !== name) {
        sheet.getRange(rowNum, nameCol + 1).setValue(name);
        updated = true;
      }
      // Update ChannelCode if 'code' parameter is provided and different
      if (code !== null && code !== undefined && data[i][codeCol] !== code) {
        sheet.getRange(rowNum, codeCol + 1).setValue(code);
        updated = true;
      }
      // Update IsEnabled status if 'isEnabled' parameter is provided and different
      if (isEnabled !== null && isEnabled !== undefined && data[i][enabledCol] !== isEnabled) {
        sheet.getRange(rowNum, enabledCol + 1).setValue(isEnabled);
        updated = true;
      }

      if (updated) {
        // Fetch the updated row data to return the updated object
        const updatedRowValues = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
        const updatedChannel = rowToObject_(headers, updatedRowValues);
        Logger.log("updateServiceChannel: Service channel '" + id + "' updated. Details: " + JSON.stringify(updatedChannel));
        return updatedChannel;
      } else {
        Logger.log("updateServiceChannel: Service channel '" + id + "': No changes provided or values were same as current.");
        return rowToObject_(headers, data[i]); // Return current channel object if no changes were made
      }
    }
  }
  Logger.log("updateServiceChannel: Service channel '" + id + "' not found for update.");
  return null;
}

// --- Test Data Initialization ---

/**
 * Adds sample/default data to various sheets for testing or initial setup.
 * This function assumes that `initializeSystem()` has already created the sheets and set their headers.
 * It focuses on populating some essential or example data rows.
 */
function addTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // Use active spreadsheet for test data setup

  // Users Sheet: Add default admin and staff users if they don't exist
  const userSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (userSheet) { 
    if (!getUserByUsername("adminuser")) { 
      userSheet.appendRow([Utilities.getUuid(), "adminuser", "adminpass", "admin@example.com", "admin"]);
      Logger.log("addTestData: Default admin user added.");
    }
    if (!getUserByUsername("staffuser")) {
      userSheet.appendRow([Utilities.getUuid(), "staffuser", "staffpass", "staff@example.com", "staff"]);
      Logger.log("addTestData: Default staff user added.");
    }
  } else {
    Logger.log("addTestData: Users sheet not found. Cannot add user data.");
  }

  // ServiceChannels Sheet: Add sample channels if the sheet has no data rows (only headers)
  const scSheet = ss.getSheetByName(SERVICE_CHANNELS_SHEET_NAME);
  if (scSheet) { 
    if (scSheet.getLastRow() < 2) { // Checks if there's data beyond the header row
        scSheet.appendRow(["SC01", "Counter 1", "A", true]);
        scSheet.appendRow(["SC02", "Information Desk", "B", true]);
        scSheet.appendRow(["SC03", "Payments", "C", false]); // Example of a disabled channel
        scSheet.appendRow(["SC04", "Enquiries", "D", true]);
        Logger.log("addTestData: Sample service channels added.");
    } else {
        Logger.log("addTestData: ServiceChannels sheet already has data. Sample data not added to avoid duplication.");
    }
  } else {
    Logger.log("addTestData: ServiceChannels sheet not found. Cannot add channel data.");
  }
  
  // Queues Sheet: No sample data added by default, as it's transactional. Headers are handled by initializeSystem.

  // AppSettings Sheet: Ensure default settings exist.
  const appSettingsSheet = ss.getSheetByName(APP_SETTINGS_SHEET_NAME);
  if (appSettingsSheet) { 
    const currentSettings = getAppSettings(); // Fetches existing or default settings

    const defaultYoutubeId = "dQw4w9WgXcQ";
    const defaultSoundUrl = "https://actions.google.com/sounds/v1/alarms/bell_timer.ogg"; // Default notification sound

    // Update youtubeVideoId if not matching desired default or if it's missing
    if (currentSettings.youtubeVideoId !== defaultYoutubeId) {
        updateSetting("youtubeVideoId", defaultYoutubeId); 
        Logger.log("addTestData: Default youtubeVideoId set/updated in AppSettings.");
    } else { // Ensure the row exists if currentSettings came from defaults (e.g. sheet was empty)
        const data = appSettingsSheet.getDataRange().getValues();
        const nameCol = data.length > 0 ? data[0].indexOf("SettingName") : -1;
        let found = false;
        if (nameCol !== -1) {
            for(let i=1; i<data.length; i++) { if(data[i][nameCol] === "youtubeVideoId") {found=true; break;} }
        }
        if(!found && nameCol !== -1) updateSetting("youtubeVideoId", defaultYoutubeId); // Add if not found & headers exist
    }

    // Update defaultNotificationSoundUrl
    if (currentSettings.defaultNotificationSoundUrl !== defaultSoundUrl) {
        updateSetting("defaultNotificationSoundUrl", defaultSoundUrl);
        Logger.log("addTestData: Default defaultNotificationSoundUrl set/updated in AppSettings.");
    } else {
        const data = appSettingsSheet.getDataRange().getValues();
        const nameCol = data.length > 0 ? data[0].indexOf("SettingName") : -1;
        let found = false;
        if (nameCol !== -1) {
            for(let i=1; i<data.length; i++) { if(data[i][nameCol] === "defaultNotificationSoundUrl") {found=true; break;} }
        }
        if(!found && nameCol !== -1) updateSetting("defaultNotificationSoundUrl", defaultSoundUrl);
    }
  } else {
      Logger.log("addTestData: AppSettings sheet not found. Cannot add app settings data.");
  }

  // SoundLibrary Sheet: Headers are handled by initializeSystem.
  // initializeSystem will be responsible for populating default SoundIDs and descriptions.
  // addTestData could ensure specific FileID_or_URL for some sounds if needed for testing,
  // but for now, we'll let initializeSystem handle the structure and placeholder rows.
  const soundLibSheet = ss.getSheetByName("SoundLibrary");
  if (!soundLibSheet) {
    Logger.log("addTestData: SoundLibrary sheet not found. It will be created by initializeSystem.");
  }
  }
}

// --- Sound Library Database Functions ---

/**
 * Gets a specific sound file's details from the 'SoundLibrary' sheet by its SoundID.
 * @param {string} soundId The ID of the sound to find (e.g., "DIGIT_1", "CHANNEL_SC01_AUDIO").
 * @return {object|null} The sound object (row converted to an object) if found, or null otherwise.
 *                       Expected object: { SoundID: string, Description: string, FileID_or_URL: string }
 */
function getSoundFile(soundId) {
  const sheet = getSoundLibrarySheet();
  if (!sheet) {
    Logger.log("getSoundFile: SoundLibrary sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { // No data rows beyond headers
    Logger.log("getSoundFile: SoundLibrary sheet is empty or has only headers.");
    return null;
  }
  const headers = data[0];
  const soundIdCol = headers.indexOf("SoundID");

  if (soundIdCol === -1) {
    Logger.log("getSoundFile: 'SoundID' column not found in SoundLibrary sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][soundIdCol] === soundId) {
      return rowToObject_(headers, data[i]);
    }
  }
  Logger.log("getSoundFile: Sound with SoundID '" + soundId + "' not found.");
  return null;
}

/**
 * Gets all sound file entries from the 'SoundLibrary' sheet.
 * @return {Array<object>} An array of sound objects. Each object represents a row from the sheet.
 *                         Returns an empty array if the sheet is not found or has no data.
 */
function getAllSoundFiles() {
  const sheet = getSoundLibrarySheet();
  if (!sheet) {
    Logger.log("getAllSoundFiles: SoundLibrary sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { // No data rows beyond headers
    Logger.log("getAllSoundFiles: SoundLibrary sheet is empty or has only headers.");
    return [];
  }
  const headers = data[0];
  const allSounds = [];
  for (let i = 1; i < data.length; i++) {
    if(data[i][0]) { // Basic check to ensure the row is not completely empty, assumes SoundID is first col
       allSounds.push(rowToObject_(headers, data[i]));
    }
  }
  Logger.log("getAllSoundFiles: Fetched " + allSounds.length + " sound entries.");
  return allSounds;
}

/**
 * Updates the 'FileID_or_URL' for a specific sound in the 'SoundLibrary' sheet.
 * @param {string} soundId The 'SoundID' of the sound entry to update.
 * @param {string} fileIdOrUrl The new Google Drive File ID or direct HTTPS URL for the sound file.
 * @return {boolean} True if the update was successful, false otherwise (e.g., soundId not found).
 */
function updateSoundFile(soundId, fileIdOrUrl) {
  const sheet = getSoundLibrarySheet();
  if (!sheet) {
    Logger.log("updateSoundFile: SoundLibrary sheet not found. Cannot update sound file.");
    return false;
  }
  // Ensure headers are present if sheet is empty (though initializeSystem should handle this)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["SoundID", "Description", "FileID_or_URL"]);
    Logger.log("updateSoundFile: Added headers to empty SoundLibrary sheet.");
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const soundIdCol = headers.indexOf("SoundID");
  const fileIdCol = headers.indexOf("FileID_or_URL");

  if (soundIdCol === -1 || fileIdCol === -1) {
    Logger.log("updateSoundFile: 'SoundID' or 'FileID_or_URL' column not found in SoundLibrary sheet. Cannot update.");
    return false;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][soundIdCol] === soundId) {
      sheet.getRange(i + 1, fileIdCol + 1).setValue(fileIdOrUrl);
      Logger.log("updateSoundFile: SoundID '" + soundId + "' updated with FileID_or_URL '" + fileIdOrUrl + "'.");
      return true;
    }
  }
  Logger.log("updateSoundFile: SoundID '" + soundId + "' not found. No update performed.");
  return false; // SoundID not found
}

// Functions for interacting with Google Sheet

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // Replace with your actual Spreadsheet ID
const USERS_SHEET_NAME = "Users";
const QUEUES_SHEET_NAME = "Queues";
const SERVICE_CHANNELS_SHEET_NAME = "ServiceChannels";
const APP_SETTINGS_SHEET_NAME = "AppSettings";

/**
 * Gets the Users sheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The Users sheet.
 */
function getUsersSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(USERS_SHEET_NAME);
}

/**
 * Gets the Queues sheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The Queues sheet.
 */
function getQueuesSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(QUEUES_SHEET_NAME);
}

/**
 * Gets the ServiceChannels sheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The ServiceChannels sheet.
 */
function getServiceChannelsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SERVICE_CHANNELS_SHEET_NAME);
}

/**
 * Converts a sheet row (array) to an object based on headers.
 * @param {Array<string>} headers The header row.
 * @param {Array<any>} rowData The data row.
 * @return {object} The row data as an object.
 */
function rowToObject_(headers, rowData) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = rowData[index];
  });
  return obj;
}

/**
 * Finds a user by username in the Users sheet.
 * @param {string} username The username to search for.
 * @return {object|null} The user's data row as an object or null if not found.
 */
function getUserByUsername(username) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("Users sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const usernameCol = headers.indexOf("Username");

  if (usernameCol === -1) {
    Logger.log("Username column not found in Users sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameCol] === username) {
      return rowToObject_(headers, data[i]);
    }
  }
  return null;
}

/**
 * Finds a user by email in the Users sheet.
 * @param {string} email The email to search for.
 * @return {object|null} The user's data row as an object or null if not found.
 */
function getUserByEmail(email) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("Users sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf("Email");

  if (emailCol === -1) {
    Logger.log("Email column not found in Users sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      return rowToObject_(headers, data[i]);
    }
  }
  return null;
}

/**
 * Updates the password for a user in the Users sheet.
 * @param {string} email The email of the user to update.
 * @param {string} newPassword The new password.
 * @return {boolean} True if successful, false otherwise.
 */
function updateUserPassword(email, newPassword) {
  const sheet = getUsersSheet();
  if (!sheet) {
    Logger.log("Users sheet not found.");
    return false;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf("Email");
  const passwordCol = headers.indexOf("PasswordHash");

  if (emailCol === -1 || passwordCol === -1) {
    Logger.log("Email or PasswordHash column not found in Users sheet.");
    return false;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      sheet.getRange(i + 1, passwordCol + 1).setValue(newPassword);
      return true;
    }
  }
  return false;
}


/**
 * Gets active service channels from the ServiceChannels sheet.
 * @return {Array<object>} An array of active service channel objects.
 */
function getActiveServiceChannels() {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("ServiceChannels sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const activeChannels = [];
  for (let i = 1; i < data.length; i++) {
    const channel = rowToObject_(headers, data[i]);
    if (channel.IsEnabled === true || channel.IsEnabled === "TRUE") {
      activeChannels.push(channel);
    }
  }
  return activeChannels;
}

/**
 * Gets a service channel by its ID from the ServiceChannels sheet.
 * @param {string} channelId The ID of the service channel.
 * @return {object|null} The service channel object or null if not found.
 */
function getServiceChannelById(channelId) {
  const sheet = getServiceChannelsSheet();
  if (!sheet) {
    Logger.log("ServiceChannels sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ServiceChannelID");

  if (idCol === -1) {
     Logger.log("ServiceChannelID column not found in ServiceChannels sheet.");
     return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === channelId) {
      return rowToObject_(headers, data[i]);
    }
  }
  return null;
}


/**
 * Generates the next queue number for a given service channel. Resets daily.
 * @param {string} serviceChannelID The ID of the service channel.
 * @param {string} channelCode The code for the channel (e.g., "A").
 * @return {string} The next formatted queue number (e.g., "A001").
 */
function getNextQueueNumber(serviceChannelID, channelCode) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found. Defaulting queue number.");
    return channelCode + "001";
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const queueNumCol = headers.indexOf("QueueNumber");
  const channelIdCol = headers.indexOf("ServiceChannelID");
  const timestampCol = headers.indexOf("TimestampCreated");

  if (queueNumCol === -1 || channelIdCol === -1 || timestampCol === -1) {
    Logger.log("Required columns missing in Queues sheet. Defaulting queue number.");
    return channelCode + "001";
  }

  let maxNum = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    const rowChannelId = data[i][channelIdCol];
    const timestampStr = data[i][timestampCol];
    const queueNumStr = data[i][queueNumCol];

    if (rowChannelId === serviceChannelID && timestampStr) {
      const itemDate = new Date(timestampStr);
      itemDate.setHours(0, 0, 0, 0);
      if (itemDate.getTime() === today.getTime() && queueNumStr && queueNumStr.startsWith(channelCode)) {
        const numPart = parseInt(queueNumStr.substring(channelCode.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  return channelCode + ("000" + nextNum).slice(-3);
}

/**
 * Adds a new queue record to the Queues sheet.
 * @param {object} queueData The data for the new queue.
 * @return {boolean} True if successful, false otherwise.
 */
function addNewQueue(queueData) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found. Cannot add new queue.");
    return false;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => queueData[header] !== undefined ? queueData[header] : "");
  try {
    sheet.appendRow(newRow);
    Logger.log("New queue added: " + JSON.stringify(queueData));
    return true;
  } catch (e) {
    Logger.log("Error adding new queue: " + e.message);
    return false;
  }
}

/**
 * Gets a queue by its ID from the Queues sheet.
 * @param {string} queueId The ID of the queue.
 * @return {object|null} The queue object or null if not found.
 */
function getQueueById(queueId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("QueueID");

  if (idCol === -1) {
    Logger.log("QueueID column not found in Queues sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === queueId) {
      return rowToObject_(headers, data[i]);
    }
  }
  Logger.log("Queue with ID " + queueId + " not found.");
  return null;
}

/**
 * Gets the oldest waiting queue for a given service channel.
 * @param {string} serviceChannelId The ID of the service channel.
 * @return {object|null} The oldest waiting queue object or null if none.
 */
function getOldestWaitingQueue(serviceChannelId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const channelIdCol = headers.indexOf("ServiceChannelID");
  const statusCol = headers.indexOf("Status");
  const timestampCol = headers.indexOf("TimestampCreated");

  if (channelIdCol === -1 || statusCol === -1 || timestampCol === -1) {
    Logger.log("Required columns (ServiceChannelID, Status, TimestampCreated) not found in Queues sheet.");
    return null;
  }

  let oldestQueue = null;
  let oldestTimestamp = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][channelIdCol] === serviceChannelId && data[i][statusCol] === "waiting") {
      const currentTimestamp = new Date(data[i][timestampCol]);
      if (!oldestQueue || currentTimestamp < oldestTimestamp) {
        oldestTimestamp = currentTimestamp;
        oldestQueue = rowToObject_(headers, data[i]);
      }
    }
  }
  return oldestQueue;
}

/**
 * Updates the status and related fields of a queue in the Queues sheet.
 * @param {string} queueId The ID of the queue to update.
 * @param {string} newStatus The new status (e.g., "calling", "completed", "skipped").
 * @param {string} adminUserId The UserID of the admin performing the action.
 * @return {object|null} The updated queue object or null if not found or error.
 */
function updateQueueStatus(queueId, newStatus, adminUserId) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found.");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("QueueID");
  const statusCol = headers.indexOf("Status");
  const calledByCol = headers.indexOf("CalledByUserID");
  const tsCalledCol = headers.indexOf("TimestampCalled");
  const tsCompletedCol = headers.indexOf("TimestampCompleted");

  if (idCol === -1 || statusCol === -1 || calledByCol === -1 || tsCalledCol === -1 || tsCompletedCol === -1) {
    Logger.log("One or more required columns for updateQueueStatus are missing in Queues sheet.");
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === queueId) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, statusCol + 1).setValue(newStatus);
      sheet.getRange(rowNum, calledByCol + 1).setValue(adminUserId); // Always update who took the action

      if (newStatus === "calling") {
        sheet.getRange(rowNum, tsCalledCol + 1).setValue(new Date().toISOString());
      } else if (newStatus === "completed") {
        sheet.getRange(rowNum, tsCompletedCol + 1).setValue(new Date().toISOString());
      } else if (newStatus === "skipped") {
        // Optionally clear TimestampCalled if it was previously "calling"
        // sheet.getRange(rowNum, tsCalledCol + 1).setValue(""); 
      }
      
      // Read the updated row data
      const updatedRowValues = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
      const updatedQueue = rowToObject_(headers, updatedRowValues);
      Logger.log("Queue " + queueId + " updated to status " + newStatus + " by user " + adminUserId + ". Details: " + JSON.stringify(updatedQueue));
      return updatedQueue;
    }
  }
  Logger.log("Queue with ID " + queueId + " not found for status update.");
  return null;
}

/**
 * Fetches queues based on filters.
 * @param {string|null} serviceChannelId Filter by service channel ID. Null for all.
 * @param {Array<string>} statusFiltersArray Array of statuses to filter by. Empty for all.
 * @param {number} limit Max number of queues to return.
 * @param {string} sortField Field to sort by (e.g., "TimestampCreated").
 * @param {boolean} sortAscending True for ascending, false for descending.
 * @return {Array<object>} An array of queue objects.
 */
function fetchQueues(serviceChannelId, statusFiltersArray, limit, sortField, sortAscending) {
  const sheet = getQueuesSheet();
  if (!sheet) {
    Logger.log("Queues sheet not found.");
    return [];
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const channelIdCol = headers.indexOf("ServiceChannelID");
  const statusCol = headers.indexOf("Status");
  const sortFieldCol = headers.indexOf(sortField);

  if (sortFieldCol === -1) {
    Logger.log("Sort field '" + sortField + "' not found in Queues sheet. Defaulting to no sort.");
    // Or, could default to TimestampCreated or return error
  }

  let results = [];
  for (let i = 1; i < data.length; i++) {
    const queue = rowToObject_(headers, data[i]);
    
    // Filter by serviceChannelId
    if (serviceChannelId && queue.ServiceChannelID !== serviceChannelId) {
      continue;
    }
    
    // Filter by status
    if (statusFiltersArray && statusFiltersArray.length > 0 && !statusFiltersArray.includes(queue.Status)) {
      continue;
    }
    results.push(queue);
  }

  // Sort
  if (sortFieldCol !== -1) {
    results.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle date strings by converting to Date objects for proper comparison
      if (sortField === "TimestampCreated" || sortField === "TimestampCalled" || sortField === "TimestampCompleted") {
        valA = valA ? new Date(valA) : null;
        valB = valB ? new Date(valB) : null;
      }
      
      if (valA === null || valA === undefined || valA === "") return sortAscending ? 1 : -1; // push nulls/empty to end
      if (valB === null || valB === undefined || valB === "") return sortAscending ? -1 : 1;

      if (valA < valB) return sortAscending ? -1 : 1;
      if (valA > valB) return sortAscending ? 1 : -1;
      return 0;
    });
  }

  // Limit
  if (limit && limit > 0 && results.length > limit) {
    results = results.slice(0, limit);
  }

  return results;
}


/**
 * Adds a dummy user and service channels to the sheet for testing.
 */
function addTestData() {
  // Add User Test Data
  const userSheet = getUsersSheet();
  if (userSheet) {
    if (userSheet.getLastRow() === 0) { 
       userSheet.appendRow(["UserID", "Username", "PasswordHash", "Email", "Role"]);
    }
    const existingAdmin = getUserByUsername("adminuser");
    if (!existingAdmin) {
      userSheet.appendRow([Utilities.getUuid(), "adminuser", "adminpass", "admin@example.com", "admin"]);
      Logger.log("Test admin user added.");
    }
    const existingStaff = getUserByUsername("staffuser");
    if (!existingStaff) {
      userSheet.appendRow([Utilities.getUuid(), "staffuser", "staffpass", "staff@example.com", "staff"]);
      Logger.log("Test staff user added.");
    }
  } else {
    Logger.log("Users sheet not found. Cannot add test user data.");
  }

  // Add ServiceChannels Test Data
  const scSheet = getServiceChannelsSheet();
  if (scSheet) {
    if (scSheet.getLastRow() < 2) { 
        scSheet.clearContents(); 
        scSheet.appendRow(["ServiceChannelID", "ChannelName", "ChannelCode", "IsEnabled"]);
        scSheet.appendRow(["SC01", "Counter 1", "A", true]);
        scSheet.appendRow(["SC02", "Information Desk", "B", true]);
        scSheet.appendRow(["SC03", "Payments", "C", false]);
        scSheet.appendRow(["SC04", "Enquiries", "D", true]);
        Logger.log("Test service channels added.");
    }
  } else {
    Logger.log("ServiceChannels sheet not found. Cannot add test service channel data.");
  }
  
  // Add Queues Sheet Headers if not present
  const queueSheet = getQueuesSheet();
  if (queueSheet) {
    if (queueSheet.getLastRow() === 0) { 
      queueSheet.appendRow(["QueueID", "QueueNumber", "ServiceChannelID", "TimestampCreated", "TimestampCalled", "TimestampCompleted", "Status", "CalledByUserID"]);
      Logger.log("Queues sheet headers added.");
    }
  } else {
    Logger.log("Queues sheet not found. Cannot add headers.");
  }
}

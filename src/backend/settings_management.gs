// Provides client-callable functions for managing application settings and service channels.
// All functions in this file perform admin authorization checks.

/**
 * Retrieves all application settings (e.g., YouTube Video ID, default sound URL).
 * This function is intended for admin use only.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `settings` (object, optional): An object where keys are setting names and values are their corresponding values.
 *                  `message` (string, optional): An error message if `success` is false.
 */
function getAppSettingsClient() {
  // Authorization: Ensure the current user is an admin.
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("getAppSettingsClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  try {
    // Retrieve settings from the database layer.
    const settings = getAppSettings(); // from database.gs
    Logger.log("getAppSettingsClient: Fetched settings for admin '" + currentUser.username + "'. Settings: " + JSON.stringify(settings));
    return { success: true, settings: settings };
  } catch (e) {
    Logger.log("getAppSettingsClient: Error for admin '" + currentUser.username + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching app settings: " + e.message };
  }
}

/**
 * Updates a specific application setting.
 * This function is intended for admin use only.
 * @param {string} settingName The name of the setting to update (e.g., "youtubeVideoId").
 * @param {string} settingValue The new value for the setting.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `message` (string): A message indicating the outcome of the operation.
 */
function updateSettingClient(settingName, settingValue) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("updateSettingClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  // Validate input: settingName must be a non-empty string.
  if (!settingName || typeof settingName !== 'string' || settingName.trim() === "") {
    Logger.log("updateSettingClient: Invalid settingName provided by admin '" + currentUser.username + "': '" + settingName + "'");
    return { success: false, message: "Invalid setting name provided. Setting name cannot be empty." };
  }
  // Note: settingValue can be an empty string (e.g., to clear a YouTube video ID).

  try {
    // Update the setting in the database layer.
    const success = updateSetting(settingName, settingValue); // from database.gs
    if (success) {
      Logger.log("updateSettingClient: Setting '" + settingName + "' updated to '" + settingValue + "' by admin '" + currentUser.username + "'.");
      return { success: true, message: "Setting '" + settingName + "' updated successfully." };
    } else {
      // This path might be taken if database.gs encounters an issue but doesn't throw an error (e.g., sheet not found and returns false).
      Logger.log("updateSettingClient: Failed to update setting '" + settingName + "' by admin '" + currentUser.username + "' (database.gs returned false).");
      return { success: false, message: "Failed to update setting '" + settingName + "'." };
    }
  } catch (e) {
    Logger.log("updateSettingClient: Error for admin '" + currentUser.username + "' while updating setting '" + settingName + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while updating the setting: " + e.message };
  }
}

/**
 * Retrieves all service channels, including both enabled and disabled ones.
 * This function is intended for admin use only.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `channels` (Array<object>, optional): An array of service channel objects.
 *                  `message` (string, optional): An error message if `success` is false.
 */
function getServiceChannelsClient() {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("getServiceChannelsClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  try {
    // Retrieve all channels from the database layer.
    const channels = getAllServiceChannels(); // from database.gs
    Logger.log("getServiceChannelsClient: Fetched " + channels.length + " channels for admin '" + currentUser.username + "'.");
    return { success: true, channels: channels };
  } catch (e) {
    Logger.log("getServiceChannelsClient: Error for admin '" + currentUser.username + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching service channels: " + e.message };
  }
}

/**
 * Adds a new service channel to the system.
 * This function is intended for admin use only.
 * @param {string} name The name of the new service channel.
 * @param {string} code The code for the new channel (e.g., "A", "B"). This will be uppercased.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `newChannel` (object, optional): The newly added channel object if successful.
 *                  `message` (string): A message indicating the outcome.
 */
function addServiceChannelClient(name, code) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("addServiceChannelClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  // Validate inputs: name and code must be non-empty strings.
  if (!name || typeof name !== 'string' || name.trim() === "" ||
      !code || typeof code !== 'string' || code.trim() === "") {
    Logger.log("addServiceChannelClient: Invalid name or code provided by admin '" + currentUser.username + "'. Name: '" + name + "', Code: '" + code + "'");
    return { success: false, message: "Channel name and code cannot be empty." };
  }

  try {
    // Add the channel via the database layer.
    const newChannel = addServiceChannel(name.trim(), code.trim().toUpperCase()); // from database.gs
    if (newChannel) {
      Logger.log("addServiceChannelClient: Channel '" + name + "' added by admin '" + currentUser.username + "'. Details: " + JSON.stringify(newChannel));
      return { success: true, newChannel: newChannel, message: "Service channel '" + name + "' added successfully." };
    } else {
      Logger.log("addServiceChannelClient: Failed to add channel '" + name + "' by admin '" + currentUser.username + "' (database.gs returned null).");
      return { success: false, message: "Failed to add service channel. An error occurred in the backend." };
    }
  } catch (e) {
    Logger.log("addServiceChannelClient: Error for admin '" + currentUser.username + "' while adding channel '" + name + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while adding the service channel: " + e.message };
  }
}

/**
 * Updates an existing service channel.
 * This function is intended for admin use only.
 * Fields (name, code, isEnabled) are updated only if new values are provided (not null/undefined).
 * @param {string} id The ID of the service channel to update.
 * @param {string|null} name The new name for the channel. Pass null or undefined to not change.
 * @param {string|null} code The new code for the channel. Pass null or undefined to not change. Will be uppercased.
 * @param {boolean|null} isEnabled The new enabled status. Pass null or undefined to not change.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `updatedChannel` (object, optional): The updated channel object if successful.
 *                  `message` (string): A message indicating the outcome.
 */
function updateServiceChannelClient(id, name, code, isEnabled) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("updateServiceChannelClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  // Validate ID
  if (!id || typeof id !== 'string' || id.trim() === "") {
    Logger.log("updateServiceChannelClient: Invalid ID provided by admin '" + currentUser.username + "'. ID: '" + id + "'");
    return { success: false, message: "Service channel ID is required for update." };
  }
  // Validate optional fields if they are provided (not null/undefined)
  if (name !== null && name !== undefined && (typeof name !== 'string' || name.trim() === "")) {
    return { success: false, message: "Channel name, if provided, cannot be an empty string."};
  }
  if (code !== null && code !== undefined && (typeof code !== 'string' || code.trim() === "")) {
     return { success: false, message: "Channel code, if provided, cannot be an empty string."};
  }
  if (isEnabled !== null && isEnabled !== undefined && typeof isEnabled !== 'boolean') {
     return { success: false, message: "IsEnabled, if provided, must be a boolean value (true or false)."};
  }
  
  // Prepare values for database layer (trim and uppercase code)
  const finalName = (name !== null && name !== undefined) ? name.trim() : null;
  const finalCode = (code !== null && code !== undefined) ? code.trim().toUpperCase() : null;

  try {
    // Update channel via the database layer.
    const updatedChannel = updateServiceChannel(id, finalName, finalCode, isEnabled); // from database.gs
    if (updatedChannel) {
      Logger.log("updateServiceChannelClient: Channel '" + id + "' updated by admin '" + currentUser.username + "'. Details: " + JSON.stringify(updatedChannel));
      return { success: true, updatedChannel: updatedChannel, message: "Service channel '" + (updatedChannel.ChannelName || id) + "' updated successfully." };
    } else {
      // This could happen if the channel ID was not found in database.gs
      Logger.log("updateServiceChannelClient: Failed to update channel '" + id + "' by admin '" + currentUser.username + "' (channel not found or no changes made, database.gs returned null).");
      return { success: false, message: "Failed to update service channel. Ensure ID is correct. If no changes were made, this is also considered a non-success by this endpoint." };
    }
  } catch (e) {
    Logger.log("updateServiceChannelClient: Error for admin '" + currentUser.username + "' while updating channel '" + id + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while updating the service channel: " + e.message };
  }
}

/**
 * Disables a service channel by setting its `IsEnabled` status to false.
 * This is effectively a "soft delete" as the channel record remains.
 * This function is intended for admin use only.
 * @param {string} id The ID of the service channel to disable.
 * @return {object} An object containing:
 *                  `success` (boolean): True if successful, false otherwise.
 *                  `message` (string): A message indicating the outcome.
 */
function deleteServiceChannelClient(id) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("deleteServiceChannelClient: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!id || typeof id !== 'string' || id.trim() === "") {
    Logger.log("deleteServiceChannelClient: Invalid ID provided by admin '" + currentUser.username + "'. ID: '" + id + "'");
    return { success: false, message: "Service channel ID is required for disabling." };
  }

  try {
    // Disable the channel by calling updateServiceChannel with IsEnabled = false.
    // Name and code are passed as null, so the database layer function should not modify them.
    const disabledChannel = updateServiceChannel(id, null, null, false); // from database.gs
    
    if (disabledChannel && disabledChannel.IsEnabled === false) {
      Logger.log("deleteServiceChannelClient: Channel '" + id + "' disabled by admin '" + currentUser.username + "'.");
      return { success: true, message: "Service channel '" + (disabledChannel.ChannelName || id) + "' disabled successfully." };
    } else if (disabledChannel && disabledChannel.IsEnabled === true) {
       // This case indicates the update function found the channel but didn't change its IsEnabled status.
       Logger.log("deleteServiceChannelClient: Channel '" + id + "' was found but NOT disabled by admin '" + currentUser.username + "'. Update function might not have processed IsEnabled=false correctly.");
       return { success: false, message: "Failed to disable service channel. Channel found but status not changed." };
    }
    else {
      // This case implies the channel was not found by updateServiceChannel.
      Logger.log("deleteServiceChannelClient: Failed to disable channel '" + id + "' by admin '" + currentUser.username + "' (channel not found, database.gs returned null).");
      return { success: false, message: "Failed to disable service channel. Ensure ID is correct." };
    }
  } catch (e) {
    Logger.log("deleteServiceChannelClient: Error for admin '" + currentUser.username + "' while disabling channel '" + id + "': " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while disabling the service channel: " + e.message };
  }
}


// --- Test Functions ---
/**
 * Test suite for settings management functions.
 * This function can be run from the Apps Script editor.
 * Note: Requires an admin user to be "logged in" via `PropertiesService`
 * or by calling `login()` first for full testing of authorization.
 */
function testSettingsManagementFunctions() {
  // IMPORTANT: For these tests to run correctly from the editor, 
  // you need to simulate an admin login.
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("userId", "adminTestUserID_Settings");
  userProperties.setProperty("username", "testadmin_settings");
  userProperties.setProperty("userEmail", "testadmin_settings@example.com");
  userProperties.setProperty("userRole", "admin");
  userProperties.setProperty("isLoggedIn", "true");
  const testAdminUsername = userProperties.getProperty("username");

  Logger.log("--- Running Settings Management Tests (User: " + testAdminUsername + ") ---");

  // Test getAppSettingsClient
  Logger.log("Test Step 1: Testing getAppSettingsClient...");
  const settingsResult = getAppSettingsClient();
  Logger.log("getAppSettingsClient Result: " + JSON.stringify(settingsResult));

  // Test updateSettingClient
  Logger.log("Test Step 2: Testing updateSettingClient (youtubeVideoId)...");
  const newVideoId = "TEST_VIDEO_ID_" + new Date().getTime();
  const updateResult = updateSettingClient("youtubeVideoId", newVideoId);
  Logger.log("updateSettingClient Result: " + JSON.stringify(updateResult));
  const updatedSettings = getAppSettingsClient(); // Check if updated
  Logger.log("Settings after update: " + JSON.stringify(updatedSettings));
  if (updatedSettings.success && updatedSettings.settings.youtubeVideoId !== newVideoId) {
    Logger.log("ERROR: youtubeVideoId was not updated as expected!");
  }


  // Test getServiceChannelsClient
  Logger.log("Test Step 3: Testing getServiceChannelsClient...");
  const channelsResult = getServiceChannelsClient();
  Logger.log("getServiceChannelsClient Result: " + JSON.stringify(channelsResult));

  // Test addServiceChannelClient
  Logger.log("Test Step 4: Testing addServiceChannelClient...");
  const channelName = "Test Channel " + Math.floor(Math.random() * 100);
  const channelCode = "T" + Math.floor(Math.random() * 10);
  const addChannelResult = addServiceChannelClient(channelName, channelCode);
  Logger.log("addServiceChannelClient Result: " + JSON.stringify(addChannelResult));
  let newChannelId = null;
  if (addChannelResult.success && addChannelResult.newChannel) {
    newChannelId = addChannelResult.newChannel.ServiceChannelID;
  }

  // Test updateServiceChannelClient (if a new channel was added)
  if (newChannelId) {
    Logger.log("Test Step 5: Testing updateServiceChannelClient for ID: " + newChannelId);
    const updatedName = channelName + " (Updated)";
    const updatedCode = channelCode + "U";
    const updateChannelResult = updateServiceChannelClient(newChannelId, updatedName, updatedCode, false);
    Logger.log("updateServiceChannelClient Result: " + JSON.stringify(updateChannelResult));
    
    // Verify update by fetching all channels again
    const channelsAfterUpdate = getServiceChannelsClient();
    Logger.log("Channels after update: " + JSON.stringify(channelsAfterUpdate));
  } else {
    Logger.log("Skipping updateServiceChannelClient test (Test Step 5) as new channel ID was not available.");
  }
  
  // Test deleteServiceChannelClient (using the first channel from the list, or the newly added one if available)
  // This test is now more robust: it tries to use newChannelId if available,
  // otherwise, it tries to find an existing enabled channel to disable.
  Logger.log("Test Step 6: Preparing for deleteServiceChannelClient test...");
  const channelsForDeleteTest = getServiceChannelsClient();
  let channelToDisableId = newChannelId; // Prioritize the newly added channel if it exists
  
  if (!channelToDisableId && channelsForDeleteTest.success && channelsForDeleteTest.channels.length > 0) {
     // If newChannelId wasn't set (e.g., add failed), try to find another channel to disable.
     // Preferably one that is currently enabled.
     const enabledChannels = channelsForDeleteTest.channels.filter(c => c.IsEnabled === true);
     if (enabledChannels.length > 0) {
        channelToDisableId = enabledChannels[0].ServiceChannelID; // Pick the first enabled one
        Logger.log("Test Step 6: No newly added channel ID for disable test. Using existing enabled channel: " + channelToDisableId);
     } else {
        Logger.log("Test Step 6: No newly added or existing enabled channel to disable for the test.");
     }
  } else if (channelToDisableId) {
     Logger.log("Test Step 6: Will attempt to disable the newly added/updated channel: " + channelToDisableId);
  }


  if (channelToDisableId) {
    Logger.log("Testing deleteServiceChannelClient for ID: " + channelToDisableId);
    const deleteResult = deleteServiceChannelClient(channelToDisableId);
    Logger.log("deleteServiceChannelClient Result: " + JSON.stringify(deleteResult));
    
    // Verify by fetching the channel and checking IsEnabled status
    const channelsAfterDelete = getServiceChannelsClient();
    Logger.log("Channels after delete attempt: " + JSON.stringify(channelsAfterDelete));
    const affectedChannel = channelsAfterDelete.success ? channelsAfterDelete.channels.find(c => c.ServiceChannelID === channelToDisableId) : null;
    if (affectedChannel) {
        Logger.log("Affected channel '" + channelToDisableId + "' status: IsEnabled = " + affectedChannel.IsEnabled);
    } else {
        // This can happen if the channel was actually deleted from the sheet, which this function doesn't do.
        // Or if getServiceChannelsClient has an issue.
        Logger.log("Affected channel '" + channelToDisableId + "' not found after delete test. This might be unexpected if it should only be disabled.");
    }

  } else {
    Logger.log("Skipping deleteServiceChannelClient test (Test Step 6) as no suitable channel ID was available.");
  }

  Logger.log("--- Settings Management Tests Finished ---");
  // PropertiesService.getUserProperties().deleteAllProperties(); // Clean up mock session
}

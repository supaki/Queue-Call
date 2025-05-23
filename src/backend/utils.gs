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
    const sheetDefinitions = [
      { name: USERS_SHEET_NAME, headers: ["UserID", "Username", "PasswordHash", "Email", "Role"] },
      { name: QUEUES_SHEET_NAME, headers: ["QueueID", "QueueNumber", "ServiceChannelID", "TimestampCreated", "TimestampCalled", "TimestampCompleted", "Status", "CalledByUserID"] },
      { name: SERVICE_CHANNELS_SHEET_NAME, headers: ["ServiceChannelID", "ChannelName", "ChannelCode", "IsEnabled"] },
      { name: APP_SETTINGS_SHEET_NAME, headers: ["SettingName", "SettingValue"] },
      { name: "SoundLibrary", headers: ["SoundID", "Description", "FileID_or_URL"] } // Added SoundLibrary
    ];

    // Iterate through each sheet definition to create/verify its structure.
    sheetDefinitions.forEach(def => {
      let sheet = ss.getSheetByName(def.name);
      if (!sheet) {
        sheet = ss.insertSheet(def.name);
        Logger.log("Sheet '" + def.name + "' created.");
      } else {
        Logger.log("Sheet '" + def.name + "' already exists. Ensuring headers are correct.");
      }
      
      if (sheet.getLastRow() >= 1) { 
        sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), def.headers.length)).clearContent();
      }
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      sheet.setFrozenRows(1); 
      Logger.log("Headers set and first row frozen for sheet '" + def.name + "'.");
    });

    Logger.log("All core sheets and headers initialized.");
    
    // Step 1: Populate initial data using addTestData (this ensures ServiceChannels exist for the next step)
    Logger.log("Populating initial/default data (including sample Service Channels) using addTestData()...");
    addTestData(); // from database.gs
    Logger.log("Initial data population process complete.");

    // Step 2: Pre-populate SoundLibrary with default SoundIDs and descriptions, and dynamic channel sounds
    Logger.log("Pre-populating SoundLibrary...");
    const soundLibSheet = ss.getSheetByName("SoundLibrary");
    if (soundLibSheet) {
      // Fetch existing SoundIDs to ensure idempotency
      const existingSoundData = soundLibSheet.getDataRange().getValues(); // Get all data, including headers
      const existingSoundIDs = new Set(existingSoundData.slice(1).map(row => row[0])); // Create Set of existing SoundIDs, skip header

      // Define generic/default sounds
      const defaultSounds = [
        { SoundID: "INTRO_PHRASE", Description: "Introductory phrase (e.g., \"Now calling\")", FileID_or_URL: "" },
        { SoundID: "NOW_SERVING", Description: "Phrase for \"Now serving\" (optional, can be same as INTRO_PHRASE)", FileID_or_URL: "" },
        { SoundID: "AT_CHANNEL", Description: "Phrase for \"at channel\" or \"go to\"", FileID_or_URL: "" },
        { SoundID: "PLEASE_PROCEED_TO", Description: "Phrase for \"please proceed to\" (alternative to AT_CHANNEL)", FileID_or_URL: "" }
      ];
      for (let i = 0; i <= 9; i++) { // Sounds for digits 0-9
        defaultSounds.push({ SoundID: "DIGIT_" + i, Description: "Sound for digit " + i, FileID_or_URL: "" });
      }
      
      // Add generic sounds if they don't already exist
      defaultSounds.forEach(sound => {
        if (!existingSoundIDs.has(sound.SoundID)) {
          soundLibSheet.appendRow([sound.SoundID, sound.Description, sound.FileID_or_URL]);
          Logger.log("Added default SoundID '" + sound.SoundID + "' to SoundLibrary.");
          existingSoundIDs.add(sound.SoundID); // Add to set to prevent re-check if ID is somehow duplicated in defaultSounds
        } else {
          Logger.log("Default SoundID '" + sound.SoundID + "' already exists in SoundLibrary. Skipping.");
        }
      });

      // Dynamically add placeholders for Service Channel specific sounds
      // This uses getAllServiceChannels which should now return channels created by addTestData
      const serviceChannels = getAllServiceChannels(); // from database.gs
      if (serviceChannels && serviceChannels.length > 0) {
        serviceChannels.forEach(channel => {
          const channelSoundID = "CHANNEL_" + channel.ServiceChannelID + "_AUDIO";
          if (!existingSoundIDs.has(channelSoundID)) {
            soundLibSheet.appendRow([channelSoundID, "Sound for announcing " + channel.ChannelName, ""]);
            Logger.log("Added placeholder SoundID '" + channelSoundID + "' for service channel '" + channel.ChannelName + "'.");
            existingSoundIDs.add(channelSoundID); // Add to set
          } else {
            Logger.log("Placeholder SoundID '" + channelSoundID + "' for service channel '" + channel.ChannelName + "' already exists. Skipping.");
          }
        });
      } else {
        Logger.log("No service channels found to create dynamic sound entries. This might be normal if addTestData didn't add any or they were cleared.");
      }
      Logger.log("SoundLibrary population complete.");
    } else {
      Logger.log("CRITICAL: SoundLibrary sheet was not found or created properly for pre-population step.");
    }
    
    ui.alert("System Initialization Complete", "The system has been initialized successfully. All necessary sheets, headers, and default data have been set up.", ui.ButtonSet.OK);

  } catch (e) {
    Logger.log("CRITICAL: Error during system initialization: " + e.message + " Stack: " + e.stack);
    ui.alert("Initialization Failed", "An error occurred during system initialization: " + e.message + ". Check logs for details.", ui.ButtonSet.OK);
  }
}

/**
 * Generates a sequence of sound file URLs for announcing a queue number and service channel.
 *
 * @param {string} queueNumberStr The full queue number string (e.g., "A021").
 * @param {string} serviceChannelId The ServiceChannelID for which the announcement is made.
 * @return {Array<string>} An array of sound file URLs in the order they should be played.
 *                         Returns an empty array or partially filled array if some sounds are not configured.
 */
function generateSoundSequence(queueNumberStr, serviceChannelId) {
  const soundUrlSequence = [];
  
  // Fetch all sound configurations from the database
  // These database functions are assumed to be globally accessible or correctly namespaced.
  const allSoundFiles = getAllSoundFiles(); // from database.gs
  const soundMap = {};
  allSoundFiles.forEach(sound => {
    if (sound && sound.SoundID && sound.FileID_or_URL && sound.FileID_or_URL.trim() !== "") {
      soundMap[sound.SoundID] = sound.FileID_or_URL.trim();
    }
  });

  Logger.log("generateSoundSequence: SoundMap created with " + Object.keys(soundMap).length + " entries.");

  // 1. Add Intro Phrase (e.g., "Now calling")
  const introPhraseUrl = soundMap["INTRO_PHRASE"];
  if (introPhraseUrl) {
    soundUrlSequence.push(introPhraseUrl);
  } else {
    Logger.log("generateSoundSequence: SoundID 'INTRO_PHRASE' not found or has no URL in SoundLibrary.");
  }
  
  // Alternative intro phrase (if NOW_SERVING is preferred and INTRO_PHRASE is generic)
  // const nowServingUrl = soundMap["NOW_SERVING"];
  // if (nowServingUrl) {
  //   soundUrlSequence.push(nowServingUrl);
  // } else {
  //   Logger.log("generateSoundSequence: SoundID 'NOW_SERVING' not found or has no URL in SoundLibrary.");
  // }


  // 2. Process Queue Number for Digit Sounds
  if (queueNumberStr && typeof queueNumberStr === 'string') {
    // Extract numeric part. Assumes format like "A001", "B123", etc.
    // This regex will find all digits in the string.
    const numericPartMatch = queueNumberStr.match(/\d+/g); 
    if (numericPartMatch) {
        const numericPart = numericPartMatch.join(''); // Join if digits are separated, e.g. "A0-01" -> "001"
        Logger.log("generateSoundSequence: Extracted numeric part: '" + numericPart + "' from queue number '" + queueNumberStr + "'.");
        for (let i = 0; i < numericPart.length; i++) {
            const digit = numericPart.charAt(i);
            const digitSoundID = "DIGIT_" + digit;
            const digitUrl = soundMap[digitSoundID];
            if (digitUrl) {
                soundUrlSequence.push(digitUrl);
            } else {
                Logger.log("generateSoundSequence: SoundID '" + digitSoundID + "' not found or has no URL in SoundLibrary.");
            }
        }
    } else {
        Logger.log("generateSoundSequence: No numeric part found in queue number '" + queueNumberStr + "'. Cannot generate digit sounds.");
    }
  } else {
    Logger.log("generateSoundSequence: Invalid or missing queueNumberStr: " + queueNumberStr);
  }

  // 3. Add "At Channel" or "Please Proceed To" Phrase
  let atChannelPhraseUrl = soundMap["AT_CHANNEL"];
  if (!atChannelPhraseUrl) { // Fallback phrase
      atChannelPhraseUrl = soundMap["PLEASE_PROCEED_TO"];
  }
  if (atChannelPhraseUrl) {
    soundUrlSequence.push(atChannelPhraseUrl);
  } else {
    Logger.log("generateSoundSequence: Neither 'AT_CHANNEL' nor 'PLEASE_PROCEED_TO' SoundID found or has URL.");
  }

  // 4. Add Service Channel Specific Sound
  if (serviceChannelId) {
    const channelSoundID = "CHANNEL_" + serviceChannelId + "_AUDIO";
    const channelUrl = soundMap[channelSoundID];
    if (channelUrl) {
      soundUrlSequence.push(channelUrl);
    } else {
      Logger.log("generateSoundSequence: SoundID '" + channelSoundID + "' for service channel not found or has no URL.");
      // Fallback: Try to announce channel code digits if channel-specific audio is missing
      // Example: For SC01, if CHANNEL_SC01_AUDIO is missing, try to say "S", "C", "0", "1" or just "Counter 1" if text-to-speech was an option.
      // This part is complex and depends on how channel names/codes should be announced if specific audio is missing.
      // For now, we just log the missing specific audio.
    }
  } else {
    Logger.log("generateSoundSequence: No serviceChannelId provided. Cannot add channel-specific sound.");
  }
  
  Logger.log("generateSoundSequence: Generated sequence for " + queueNumberStr + " at " + serviceChannelId + ": " + JSON.stringify(soundUrlSequence));
  return soundUrlSequence;
}

// Example Test function for generateSoundSequence
function testGenerateSoundSequence() {
  // Pre-requisite: Ensure SoundLibrary sheet exists and is populated by initializeSystem or manually.
  // Especially: INTRO_PHRASE, DIGIT_0 to DIGIT_9, AT_CHANNEL, and some CHANNEL_SCXX_AUDIO entries.
  // Example:
  // SoundID: INTRO_PHRASE, Description: "Now calling", FileID_or_URL: "url_for_intro_phrase.mp3"
  // SoundID: DIGIT_1, Description: "Digit 1", FileID_or_URL: "url_for_digit_1.mp3"
  // SoundID: DIGIT_0, Description: "Digit 0", FileID_or_URL: "url_for_digit_0.mp3"
  // SoundID: DIGIT_2, Description: "Digit 2", FileID_or_URL: "url_for_digit_2.mp3"
  // SoundID: AT_CHANNEL, Description: "at counter", FileID_or_URL: "url_for_at_counter.mp3"
  // SoundID: CHANNEL_SC01_AUDIO, Description: "Counter 1", FileID_or_URL: "url_for_counter_1.mp3"

  Logger.log("--- Testing generateSoundSequence ---");
  
  // Test Case 1: Full sequence
  const sequence1 = generateSoundSequence("A021", "SC01");
  Logger.log("Test Case 1 (A021, SC01): " + JSON.stringify(sequence1));
  // Expected (example): ["url_for_intro_phrase.mp3", "url_for_digit_0.mp3", "url_for_digit_2.mp3", "url_for_digit_1.mp3", "url_for_at_counter.mp3", "url_for_counter_1.mp3"]

  // Test Case 2: Missing some sounds (e.g., channel audio missing)
  const sequence2 = generateSoundSequence("B103", "SC99_MISSING"); // SC99_MISSING might not have audio
  Logger.log("Test Case 2 (B103, SC99_MISSING): " + JSON.stringify(sequence2));

  // Test Case 3: Queue number without letters, or different format
  const sequence3 = generateSoundSequence("123", "SC02");
  Logger.log("Test Case 3 (123, SC02): " + JSON.stringify(sequence3));
  
  // Test Case 4: Queue number with non-alphanumeric that might affect regex
  const sequence4 = generateSoundSequence("C-007", "SC03");
  Logger.log("Test Case 4 (C-007, SC03): " + JSON.stringify(sequence4));

  // Test Case 5: Missing digit sound
  // To test this, temporarily remove/blank FileID_or_URL for e.g. DIGIT_5 in sheet
  // const sequence5 = generateSoundSequence("D005", "SC04");
  // Logger.log("Test Case 5 (D005, SC04 - with DIGIT_5 missing): " + JSON.stringify(sequence5));
  Logger.log("--- Finished testing generateSoundSequence ---");
}

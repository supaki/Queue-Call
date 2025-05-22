// Manages queue operations such as booking, calling, recalling, skipping, and completing queues.
// Also provides views for admin users.

/**
 * Books a new queue ticket for a user.
 * If `serviceChannelIdRequested` is provided and valid/enabled, the ticket is for that channel.
 * Otherwise, it defaults to the first available active service channel.
 * @param {string} [serviceChannelIdRequested] Optional. The ID of the service channel the user requests.
 * @return {object} An object indicating success or failure.
 *                  On success: `{ success: true, ticket: { queueNumber: string, serviceChannelName: string, timestampCreated: string, serviceChannelId: string } }`
 *                  On failure: `{ success: false, message: string }`
 */
function bookNewQueueTicket(serviceChannelIdRequested) {
  try {
    // Step 1: Retrieve all active service channels from the database.
    const activeChannels = getActiveServiceChannels(); // from database.gs
    if (!activeChannels || activeChannels.length === 0) {
      Logger.log("bookNewQueueTicket: No active service channels available.");
      return { success: false, message: "Sorry, no active service channels are available at the moment." };
    }

    // Step 2: Determine which service channel to use for the booking.
    let serviceChannelToBook = null;
    if (serviceChannelIdRequested) {
      const requestedChannel = getServiceChannelById(serviceChannelIdRequested); // from database.gs
      // Check if the requested channel exists and is enabled.
      if (requestedChannel && (requestedChannel.IsEnabled === true || String(requestedChannel.IsEnabled).toUpperCase() === "TRUE") ) {
        serviceChannelToBook = requestedChannel;
        Logger.log("bookNewQueueTicket: Using requested service channel: " + requestedChannel.ChannelName);
      } else {
         Logger.log("bookNewQueueTicket: Requested service channel '" + serviceChannelIdRequested + "' is invalid or not enabled. Assigning to default active channel.");
      }
    }

    // If no specific channel was requested or the requested one was invalid, use the first active channel as default.
    if (!serviceChannelToBook) {
      serviceChannelToBook = activeChannels[0]; 
      Logger.log("bookNewQueueTicket: Using default active service channel: " + serviceChannelToBook.ChannelName);
    }
    
    // Validate the determined service channel object.
    if (!serviceChannelToBook || !serviceChannelToBook.ServiceChannelID || !serviceChannelToBook.ChannelCode || !serviceChannelToBook.ChannelName) {
        Logger.log("bookNewQueueTicket: Failed to determine a valid service channel. Channel data: " + JSON.stringify(serviceChannelToBook));
        return { success: false, message: "Error determining service channel. Please try again." };
    }

    // Step 3: Generate the next queue number for the selected channel.
    const queueNumber = getNextQueueNumber(serviceChannelToBook.ServiceChannelID, serviceChannelToBook.ChannelCode); // from database.gs
    if (!queueNumber) {
      Logger.log("bookNewQueueTicket: Failed to generate next queue number for channel ID: " + serviceChannelToBook.ServiceChannelID);
      return { success: false, message: "Error generating queue number. Please try again." };
    }

    // Step 4: Prepare the new queue data object.
    const timestamp = new Date().toISOString(); // Record creation time in ISO format.
    const queueData = {
      QueueID: Utilities.getUuid(), // Generate a unique ID for the queue entry.
      QueueNumber: queueNumber,
      ServiceChannelID: serviceChannelToBook.ServiceChannelID,
      TimestampCreated: timestamp,
      Status: "waiting", // Initial status for a new ticket.
      TimestampCalled: "", // To be filled when called.
      TimestampCompleted: "", // To be filled when completed.
      CalledByUserID: "" // To be filled by admin/staff who calls/completes.
    };

    // Step 5: Add the new queue record to the database.
    const added = addNewQueue(queueData); // from database.gs
    if (!added) {
      Logger.log("bookNewQueueTicket: Failed to add new queue to the sheet. Data: " + JSON.stringify(queueData));
      return { success: false, message: "Error saving queue ticket. Please try again." };
    }

    // Step 6: Return success response with ticket details.
    Logger.log("bookNewQueueTicket: Ticket booked successfully. QueueNumber: " + queueNumber + ", Channel: " + serviceChannelToBook.ChannelName);
    return {
      success: true,
      ticket: {
        queueNumber: queueData.QueueNumber,
        serviceChannelName: serviceChannelToBook.ChannelName,
        timestampCreated: queueData.TimestampCreated,
        serviceChannelId: serviceChannelToBook.ServiceChannelID // Useful for client-side logic
      }
    };
  } catch (e) {
    Logger.log("bookNewQueueTicket: An unexpected error occurred: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An unexpected error occurred while booking your ticket. Please try again." };
  }
}


/**
 * Calls the next waiting queue for a specified service channel.
 * This function is intended for admin use only.
 * @param {string} serviceChannelId The ID of the service channel for which to call the next queue.
 * @return {object} Result object:
 *                  On success: `{ success: true, calledQueue: object }` (calledQueue contains details of the updated queue).
 *                  On failure: `{ success: false, message: string }`.
 */
function callNextQueue(serviceChannelId) {
  // Authorization: Ensure the current user is an admin.
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("callNextQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!serviceChannelId) {
    Logger.log("callNextQueue: Service channel ID was not provided by admin " + currentUser.username);
    return { success: false, message: "Service channel ID is required." };
  }

  try {
    // Find the oldest queue with 'waiting' status for the given channel.
    const oldestQueue = getOldestWaitingQueue(serviceChannelId); // from database.gs
    if (!oldestQueue) {
      Logger.log("callNextQueue: No waiting queues for channel '" + serviceChannelId + "'. Admin: " + currentUser.username);
      return { success: false, message: "No waiting queues for this service channel." };
    }

    // Update the queue's status to 'calling'.
    const updatedQueue = updateQueueStatus(oldestQueue.QueueID, "calling", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("callNextQueue: Failed to update queue status to 'calling' for QueueID: " + oldestQueue.QueueID + ". Admin: " + currentUser.username);
      return { success: false, message: "Failed to call queue. Please try again." };
    }
    
    Logger.log("callNextQueue: Successfully called QueueID: '" + updatedQueue.QueueID + "' by Admin: " + currentUser.username);
    return { success: true, calledQueue: updatedQueue };

  } catch (e) {
    Logger.log("callNextQueue: Error for channel '" + serviceChannelId + "' by admin " + currentUser.username + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while calling the next queue." };
  }
}

/**
 * Recalls a specific queue, changing its status to "calling".
 * This function is intended for admin use only.
 * @param {string} queueId The ID of the queue to recall.
 * @return {object} Result object:
 *                  On success: `{ success: true, recalledQueue: object }`.
 *                  On failure: `{ success: false, message: string }`.
 */
function recallQueue(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("recallQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("recallQueue: Queue ID was not provided by admin " + currentUser.username);
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("recallQueue: Queue not found for ID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Queue not found." };
    }

    // Optional: Add logic here to check if the queue can be recalled (e.g., not already completed).
    // if (queue.Status === "completed") {
    //   Logger.log("recallQueue: Attempt to recall already completed QueueID: '" + queueId + "'. Admin: " + currentUser.username);
    //   return { success: false, message: "Cannot recall a completed queue." };
    // }

    // Update the queue's status to 'calling'.
    const updatedQueue = updateQueueStatus(queueId, "calling", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("recallQueue: Failed to update queue status to 'calling' for QueueID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Failed to recall queue. Please try again." };
    }

    Logger.log("recallQueue: Successfully recalled QueueID: '" + updatedQueue.QueueID + "' by Admin: " + currentUser.username);
    return { success: true, recalledQueue: updatedQueue };

  } catch (e) {
    Logger.log("recallQueue: Error for QueueID '" + queueId + "' by admin " + currentUser.username + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while recalling the queue." };
  }
}

/**
 * Skips a specific queue, changing its status to "skipped".
 * This function is intended for admin use only.
 * @param {string} queueId The ID of the queue to skip.
 * @return {object} Result object:
 *                  On success: `{ success: true, skippedQueue: object }`.
 *                  On failure: `{ success: false, message: string }`.
 */
function skipQueue(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("skipQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("skipQueue: Queue ID was not provided by admin " + currentUser.username);
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("skipQueue: Queue not found for ID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Queue not found." };
    }
    
    // Optional: Add logic here to check if the queue can be skipped (e.g., not already completed).
    // if (queue.Status === "completed") {
    //   Logger.log("skipQueue: Attempt to skip already completed QueueID: '" + queueId + "'. Admin: " + currentUser.username);
    //   return { success: false, message: "Cannot skip a completed queue." };
    // }

    // Update the queue's status to 'skipped'.
    const updatedQueue = updateQueueStatus(queueId, "skipped", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("skipQueue: Failed to update queue status to 'skipped' for QueueID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Failed to skip queue. Please try again." };
    }

    Logger.log("skipQueue: Successfully skipped QueueID: '" + updatedQueue.QueueID + "' by Admin: " + currentUser.username);
    return { success: true, skippedQueue: updatedQueue };

  } catch (e) {
    Logger.log("skipQueue: Error for QueueID '" + queueId + "' by admin " + currentUser.username + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while skipping the queue." };
  }
}

/**
 * Marks a specific queue as "completed".
 * This function is intended for admin use only.
 * @param {string} queueId The ID of the queue to mark as completed.
 * @return {object} Result object:
 *                  On success: `{ success: true, completedQueue: object }`.
 *                  On failure: `{ success: false, message: string }`.
 */
function markQueueAsCompleted(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("markQueueAsCompleted: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("markQueueAsCompleted: Queue ID was not provided by admin " + currentUser.username);
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("markQueueAsCompleted: Queue not found for ID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Queue not found." };
    }

    // Optional: Check if the queue is in a state that can be completed (e.g., "calling").
    // if (queue.Status !== "calling") {
    //   Logger.log("markQueueAsCompleted: Attempt to complete QueueID: '" + queueId + "' which is not in 'calling' state. Status: " + queue.Status + ". Admin: " + currentUser.username);
    //   return { success: false, message: "Queue must be in 'calling' state to be completed." };
    // }

    // Update the queue's status to 'completed'.
    const updatedQueue = updateQueueStatus(queueId, "completed", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("markQueueAsCompleted: Failed to update queue status to 'completed' for QueueID: '" + queueId + "'. Admin: " + currentUser.username);
      return { success: false, message: "Failed to mark queue as completed. Please try again." };
    }

    Logger.log("markQueueAsCompleted: Successfully marked QueueID: '" + updatedQueue.QueueID + "' as completed by Admin: " + currentUser.username);
    return { success: true, completedQueue: updatedQueue };

  } catch (e) {
    Logger.log("markQueueAsCompleted: Error for QueueID '" + queueId + "' by admin " + currentUser.username + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while marking the queue as completed." };
  }
}

/**
 * Retrieves queues for the admin panel view, with options for filtering and sorting.
 * This function is intended for admin use only.
 * @param {string|null} serviceChannelId Filter by a specific service channel ID. Pass null for all channels.
 * @param {Array<string>} statusFilters An array of statuses to filter by (e.g., ["waiting", "calling"]). Pass empty array or null for all statuses.
 * @param {number} [count=50] The maximum number of queues to return. Defaults to 50.
 * @param {string} [sortField="TimestampCreated"] The field to sort the queues by. Defaults to "TimestampCreated".
 * @param {boolean} [sortAscending=false] The sort order. True for ascending, false for descending. Defaults to false (descending).
 * @return {object} Result object:
 *                  On success: `{ success: true, queues: Array<object> }`.
 *                  On failure: `{ success: false, message: string }`.
 */
function getQueuesForAdminView(serviceChannelId, statusFilters, count, sortField, sortAscending) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("getQueuesForAdminView: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  try {
    // Set default values for optional parameters if not provided.
    const limit = count || 50;
    const field = sortField || "TimestampCreated";
    const ascending = sortAscending === undefined ? false : sortAscending; // Default to descending for most recent first

    // Fetch queues from the database using the provided criteria.
    const queues = fetchQueues(serviceChannelId, statusFilters, limit, field, ascending); // from database.gs
    
    Logger.log("getQueuesForAdminView: Fetched " + queues.length + " queues for Admin: " + currentUser.username + 
               " with params - channel: " + (serviceChannelId || "All") + 
               ", statuses: " + JSON.stringify(statusFilters || "All") + 
               ", count: " + limit + ", sort: " + field + ", asc: " + ascending);
               
    return { success: true, queues: queues };

  } catch (e) {
    Logger.log("getQueuesForAdminView: Error for admin " + currentUser.username + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching queues for admin view." };
  }
}

/**
 * Retrieves all active service channels.
 * This function acts as a wrapper around `getActiveServiceChannels` from `database.gs`
 * to make it directly callable from the client-side for populating UI elements (e.g., channel selection in Admin Panel).
 * Authorization for this specific function can be added if needed (e.g., only logged-in users can see channels),
 * but currently, it's open as channel information might be considered public for selection purposes.
 * @return {object} Result object:
 *                  On success: `{ success: true, channels: Array<object> }`.
 *                  On failure: `{ success: false, message: string }`.
 */
function getActiveServiceChannelsForClient() {
  // Potential authorization check:
  // const currentUser = getCurrentUser_(); // from auth.gs
  // if (!currentUser) { 
  //   Logger.log("getActiveServiceChannelsForClient: Unauthorized access attempt by non-logged-in user.");
  //   return { success: false, message: "Unauthorized. Please log in." };
  // }

  try {
    const channels = getActiveServiceChannels(); // from database.gs
    Logger.log("getActiveServiceChannelsForClient: Fetched " + channels.length + " active channels.");
    return { success: true, channels: channels };
  } catch (e) {
    Logger.log("getActiveServiceChannelsForClient: Error: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching service channels." };
  }
}


/**
 * Test suite for admin queue operations.
 * This function can be run from the Apps Script editor to test the core admin functionalities.
 * Note: Requires an admin user to be "logged in" via `PropertiesService` or by calling `login()` first for full testing.
 */
function testAdminQueueOperations() {
  // NOTE: To test effectively, ensure an admin user is "logged in"
  // by manually setting PropertiesService or calling login() then running these.
  // For direct editor testing, you might temporarily bypass auth or mock getCurrentUser_()

  // Mocking a logged-in admin user for testing purposes in the editor
  // In a real scenario, the user would log in via the UI
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("userId", "adminTestUserID");
  userProperties.setProperty("username", "testadmin");
  userProperties.setProperty("userEmail", "testadmin@example.com");
  userProperties.setProperty("userRole", "admin");
  userProperties.setProperty("isLoggedIn", "true");
  const testAdminUsername = userProperties.getProperty("username");
  Logger.log("--- Running Admin Queue Operation Tests (User: " + testAdminUsername + ") ---");

  // Assuming SC01 is a valid service channel ID from your addTestData
  const testChannelId = "SC01"; 
  let testQueueId = null;

  // 0. Add some test queues if needed (or rely on previous bookings)
  Logger.log("Test Step 0: Booking a test ticket for channel " + testChannelId + "...");
  const bookingResult = bookNewQueueTicket(testChannelId);
  if (bookingResult.success) {
    testQueueId = getQueueById(bookingResult.ticket.queueNumber.replace(getServiceChannelById(testChannelId).ChannelCode, "") + "001"); // This logic to get QueueID is flawed. Need to get it from response or search.
    // Let's find the queue we just booked to get its ID for other tests
    const queuesAfterBooking = fetchQueues(testChannelId, ["waiting"], 5, "TimestampCreated", false);
    if(queuesAfterBooking.length > 0) {
        testQueueId = queuesAfterBooking[0].QueueID; // Get the latest one
        Logger.log("Test Step 0: Test Queue ID for subsequent operations: " + testQueueId);
    } else {
        Logger.log("Could not find the booked test queue. Some tests might fail.");
    }
  } else {
    Logger.log("Failed to book test ticket: " + bookingResult.message);
  }


  // 1. Test callNextQueue
  Logger.log("Test Step 1: Testing callNextQueue for channel: " + testChannelId);
  const callResult = callNextQueue(testChannelId);
  Logger.log("callNextQueue Result: " + JSON.stringify(callResult));
  let calledQueueId = null;
  if (callResult.success && callResult.calledQueue) {
    calledQueueId = callResult.calledQueue.QueueID;
    Logger.log("Called Queue ID: " + calledQueueId);
  }

  // 2. Test recallQueue (using the queueId from callNextQueue if successful)
  if (calledQueueId) {
    Logger.log("Test Step 2: Testing recallQueue for QueueID: " + calledQueueId);
    const recallResult = recallQueue(calledQueueId);
    Logger.log("recallQueue Result: " + JSON.stringify(recallResult));
  } else {
    Logger.log("Skipping recallQueue test as no queue was successfully called by callNextQueue.");
  }

  // 3. Test markQueueAsCompleted (using the same queueId)
  if (calledQueueId) {
    Logger.log("Test Step 3: Testing markQueueAsCompleted for QueueID: " + calledQueueId);
    const completeResult = markQueueAsCompleted(calledQueueId);
    Logger.log("markQueueAsCompleted Result: " + JSON.stringify(completeResult));
  } else {
    Logger.log("Skipping markQueueAsCompleted test as no queue was successfully called.");
  }

  // 4. Test skipQueue (book another ticket then skip it)
  Logger.log("Test Step 4: Booking another ticket for " + testChannelId + " to test skip...");
  const bookingResult2 = bookNewQueueTicket(testChannelId);
  let skipTestQueueId = null;
  if (bookingResult2.success) {
     const queuesForSkip = fetchQueues(testChannelId, ["waiting"], 5, "TimestampCreated", false);
     if(queuesForSkip.length > 0) {
        skipTestQueueId = queuesForSkip[0].QueueID; // Get the latest waiting one
        Logger.log("Testing skipQueue for QueueID: " + skipTestQueueId);
        const skipResult = skipQueue(skipTestQueueId);
        Logger.log("skipQueue Result: " + JSON.stringify(skipResult));
     } else {
         Logger.log("Could not find the second booked test queue for skipping.");
     }
  } else {
    Logger.log("Failed to book second test ticket for skipping: " + bookingResult2.message);
  }
  

  // 5. Test getQueuesForAdminView
  Logger.log("Test Step 5a: Testing getQueuesForAdminView for channel: " + testChannelId);
  const adminViewResult = getQueuesForAdminView(testChannelId, ["waiting", "calling", "completed", "skipped"], 10, "TimestampCreated", false);
  Logger.log("getQueuesForAdminView Result: " + JSON.stringify(adminViewResult));
  
  Logger.log("Test Step 5b: Testing getQueuesForAdminView (all channels, specific statuses 'calling', 'skipped')");
  const adminViewAllChannels = getQueuesForAdminView(null, ["calling", "skipped"], 10, "TimestampCreated", true);
  Logger.log("getQueuesForAdminView (all channels) Result: " + JSON.stringify(adminViewAllChannels));

  Logger.log("--- Admin Queue Operation Tests Finished ---");
  // PropertiesService.getUserProperties().deleteAllProperties(); // Clean up mock session
}

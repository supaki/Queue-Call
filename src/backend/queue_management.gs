// Functions for booking, calling, skipping queues

/**
 * Books a new queue ticket.
 * @param {string} serviceChannelIdRequested Optional. The ID of the service channel requested by the user.
 * @return {object} An object indicating success or failure, and ticket details if successful.
 */
function bookNewQueueTicket(serviceChannelIdRequested) {
  try {
    const activeChannels = getActiveServiceChannels(); // from database.gs
    if (!activeChannels || activeChannels.length === 0) {
      Logger.log("bookNewQueueTicket: No active service channels available.");
      return { success: false, message: "Sorry, no active service channels are available at the moment." };
    }

    let serviceChannelToBook = null;
    if (serviceChannelIdRequested) {
      const requestedChannel = getServiceChannelById(serviceChannelIdRequested); // from database.gs
      if (requestedChannel && (requestedChannel.IsEnabled === true || requestedChannel.IsEnabled === "TRUE") ) {
        serviceChannelToBook = requestedChannel;
      } else {
         Logger.log("bookNewQueueTicket: Requested service channel " + serviceChannelIdRequested + " is invalid or not enabled. Assigning to default.");
      }
    }

    if (!serviceChannelToBook) {
      serviceChannelToBook = activeChannels[0];
    }
    
    if (!serviceChannelToBook || !serviceChannelToBook.ServiceChannelID || !serviceChannelToBook.ChannelCode || !serviceChannelToBook.ChannelName) {
        Logger.log("bookNewQueueTicket: Failed to determine a valid service channel. Channel data: " + JSON.stringify(serviceChannelToBook));
        return { success: false, message: "Error determining service channel. Please try again." };
    }

    const queueNumber = getNextQueueNumber(serviceChannelToBook.ServiceChannelID, serviceChannelToBook.ChannelCode); // from database.gs
    if (!queueNumber) {
      Logger.log("bookNewQueueTicket: Failed to generate next queue number.");
      return { success: false, message: "Error generating queue number. Please try again." };
    }

    const timestamp = new Date().toISOString();
    const queueData = {
      QueueID: Utilities.getUuid(),
      QueueNumber: queueNumber,
      ServiceChannelID: serviceChannelToBook.ServiceChannelID,
      TimestampCreated: timestamp,
      Status: "waiting",
      TimestampCalled: "",
      TimestampCompleted: "",
      CalledByUserID: ""
    };

    const added = addNewQueue(queueData); // from database.gs
    if (!added) {
      Logger.log("bookNewQueueTicket: Failed to add new queue to the sheet.");
      return { success: false, message: "Error saving queue ticket. Please try again." };
    }

    Logger.log("bookNewQueueTicket: Ticket booked successfully. QueueNumber: " + queueNumber + ", Channel: " + serviceChannelToBook.ChannelName);
    return {
      success: true,
      ticket: {
        queueNumber: queueData.QueueNumber,
        serviceChannelName: serviceChannelToBook.ChannelName,
        timestampCreated: queueData.TimestampCreated,
        serviceChannelId: serviceChannelToBook.ServiceChannelID
      }
    };
  } catch (e) {
    Logger.log("bookNewQueueTicket: An unexpected error occurred: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An unexpected error occurred while booking your ticket. Please try again." };
  }
}


/**
 * Calls the next waiting queue for a specific service channel.
 * Admin-only function.
 * @param {string} serviceChannelId The ID of the service channel.
 * @return {object} Result object with success status and queue details or error message.
 */
function callNextQueue(serviceChannelId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("callNextQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!serviceChannelId) {
    Logger.log("callNextQueue: Service channel ID was not provided.");
    return { success: false, message: "Service channel ID is required." };
  }

  try {
    const oldestQueue = getOldestWaitingQueue(serviceChannelId); // from database.gs
    if (!oldestQueue) {
      Logger.log("callNextQueue: No waiting queues for channel " + serviceChannelId);
      return { success: false, message: "No waiting queues for this service channel." };
    }

    const updatedQueue = updateQueueStatus(oldestQueue.QueueID, "calling", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("callNextQueue: Failed to update queue status for QueueID: " + oldestQueue.QueueID);
      return { success: false, message: "Failed to call queue. Please try again." };
    }
    
    Logger.log("callNextQueue: Successfully called QueueID: " + updatedQueue.QueueID + " by Admin: " + currentUser.username);
    return { success: true, calledQueue: updatedQueue };

  } catch (e) {
    Logger.log("callNextQueue: Error for channel " + serviceChannelId + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while calling the next queue." };
  }
}

/**
 * Recalls a specific queue.
 * Admin-only function.
 * @param {string} queueId The ID of the queue to recall.
 * @return {object} Result object with success status and queue details or error message.
 */
function recallQueue(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("recallQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("recallQueue: Queue ID was not provided.");
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("recallQueue: Queue not found for ID: " + queueId);
      return { success: false, message: "Queue not found." };
    }

    // Optional: Add logic here to check if the queue can be recalled (e.g., not already completed)
    // if (queue.Status === "completed") {
    //   return { success: false, message: "Cannot recall a completed queue." };
    // }

    const updatedQueue = updateQueueStatus(queueId, "calling", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("recallQueue: Failed to update queue status for QueueID: " + queueId);
      return { success: false, message: "Failed to recall queue. Please try again." };
    }

    Logger.log("recallQueue: Successfully recalled QueueID: " + updatedQueue.QueueID + " by Admin: " + currentUser.username);
    return { success: true, recalledQueue: updatedQueue };

  } catch (e) {
    Logger.log("recallQueue: Error for QueueID " + queueId + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while recalling the queue." };
  }
}

/**
 * Skips a specific queue.
 * Admin-only function.
 * @param {string} queueId The ID of the queue to skip.
 * @return {object} Result object with success status and queue details or error message.
 */
function skipQueue(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("skipQueue: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("skipQueue: Queue ID was not provided.");
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("skipQueue: Queue not found for ID: " + queueId);
      return { success: false, message: "Queue not found." };
    }
    
    // Optional: Add logic here to check if the queue can be skipped
    // if (queue.Status === "completed") {
    //   return { success: false, message: "Cannot skip a completed queue." };
    // }

    const updatedQueue = updateQueueStatus(queueId, "skipped", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("skipQueue: Failed to update queue status for QueueID: " + queueId);
      return { success: false, message: "Failed to skip queue. Please try again." };
    }

    Logger.log("skipQueue: Successfully skipped QueueID: " + updatedQueue.QueueID + " by Admin: " + currentUser.username);
    return { success: true, skippedQueue: updatedQueue };

  } catch (e) {
    Logger.log("skipQueue: Error for QueueID " + queueId + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while skipping the queue." };
  }
}

/**
 * Marks a specific queue as completed.
 * Admin-only function.
 * @param {string} queueId The ID of the queue to mark as completed.
 * @return {object} Result object with success status and queue details or error message.
 */
function markQueueAsCompleted(queueId) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("markQueueAsCompleted: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  if (!queueId) {
    Logger.log("markQueueAsCompleted: Queue ID was not provided.");
    return { success: false, message: "Queue ID is required." };
  }

  try {
    const queue = getQueueById(queueId); // from database.gs
    if (!queue) {
      Logger.log("markQueueAsCompleted: Queue not found for ID: " + queueId);
      return { success: false, message: "Queue not found." };
    }

    // Optional: Check if queue is in a state that can be completed (e.g., "calling")
    // if (queue.Status !== "calling") {
    //   return { success: false, message: "Queue must be in 'calling' state to be completed." };
    // }

    const updatedQueue = updateQueueStatus(queueId, "completed", currentUser.userId); // from database.gs
    if (!updatedQueue) {
      Logger.log("markQueueAsCompleted: Failed to update queue status for QueueID: " + queueId);
      return { success: false, message: "Failed to mark queue as completed. Please try again." };
    }

    Logger.log("markQueueAsCompleted: Successfully marked QueueID: " + updatedQueue.QueueID + " as completed by Admin: " + currentUser.username);
    return { success: true, completedQueue: updatedQueue };

  } catch (e) {
    Logger.log("markQueueAsCompleted: Error for QueueID " + queueId + ": " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while marking the queue as completed." };
  }
}

/**
 * Gets queues for the admin view, with filtering and sorting.
 * Admin-only function.
 * @param {string|null} serviceChannelId Filter by service channel ID. Null for all.
 * @param {Array<string>} statusFilters Array of statuses to filter by (e.g., ["waiting", "calling"]). Empty for all.
 * @param {number} count Max number of queues to return. Default 50.
 * @param {string} sortField Field to sort by. Default 'TimestampCreated'.
 * @param {boolean} sortAscending True for ascending, false for descending. Default false.
 * @return {object} Result object with success status and queues list or error message.
 */
function getQueuesForAdminView(serviceChannelId, statusFilters, count, sortField, sortAscending) {
  const currentUser = getCurrentUser_(); // from auth.gs
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log("getQueuesForAdminView: Unauthorized access attempt by user: " + (currentUser ? currentUser.username : "Not logged in"));
    return { success: false, message: "Unauthorized access. Admin role required." };
  }

  try {
    const limit = count || 50;
    const field = sortField || "TimestampCreated";
    const ascending = sortAscending === undefined ? false : sortAscending; // Default to descending

    const queues = fetchQueues(serviceChannelId, statusFilters, limit, field, ascending); // from database.gs
    
    Logger.log("getQueuesForAdminView: Fetched " + queues.length + " queues for Admin: " + currentUser.username + 
               " with params - channel: " + serviceChannelId + ", statuses: " + JSON.stringify(statusFilters) + 
               ", count: " + limit + ", sort: " + field + ", asc: " + ascending);
               
    return { success: true, queues: queues };

  } catch (e) {
    Logger.log("getQueuesForAdminView: Error: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching queues." };
  }
}

/**
 * Gets all active service channels.
 * This is a wrapper around the database function to expose it for client-side calls,
 * and can also include authorization if needed (though for now, assuming all users can see channels).
 * @return {object} Result object with success status and channels list or error message.
 */
function getActiveServiceChannelsForClient() {
  // const currentUser = getCurrentUser_();
  // if (!currentUser) { // Basic check if any user needs to be logged in
  //   return { success: false, message: "Unauthorized." };
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


// Example test functions (can be run from GAS editor)
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
  
  Logger.log("--- Running Admin Queue Operation Tests ---");

  // Assuming SC01 is a valid service channel ID from your addTestData
  const testChannelId = "SC01"; 
  let testQueueId = null;

  // 0. Add some test queues if needed (or rely on previous bookings)
  Logger.log("Booking a test ticket for SC01...");
  const bookingResult = bookNewQueueTicket(testChannelId);
  if (bookingResult.success) {
    testQueueId = getQueueById(bookingResult.ticket.queueNumber.replace(getServiceChannelById(testChannelId).ChannelCode, "") + "001"); // This logic to get QueueID is flawed. Need to get it from response or search.
    // Let's find the queue we just booked to get its ID for other tests
    const queuesAfterBooking = fetchQueues(testChannelId, ["waiting"], 5, "TimestampCreated", false);
    if(queuesAfterBooking.length > 0) {
        testQueueId = queuesAfterBooking[0].QueueID; // Get the latest one
        Logger.log("Test Queue ID for operations: " + testQueueId);
    } else {
        Logger.log("Could not find the booked test queue. Some tests might fail.");
    }
  } else {
    Logger.log("Failed to book test ticket: " + bookingResult.message);
  }


  // 1. Test callNextQueue
  Logger.log("Testing callNextQueue for channel: " + testChannelId);
  const callResult = callNextQueue(testChannelId);
  Logger.log("callNextQueue Result: " + JSON.stringify(callResult));
  let calledQueueId = null;
  if (callResult.success && callResult.calledQueue) {
    calledQueueId = callResult.calledQueue.QueueID;
    Logger.log("Called Queue ID: " + calledQueueId);
  }

  // 2. Test recallQueue (using the queueId from callNextQueue if successful)
  if (calledQueueId) {
    Logger.log("Testing recallQueue for QueueID: " + calledQueueId);
    const recallResult = recallQueue(calledQueueId);
    Logger.log("recallQueue Result: " + JSON.stringify(recallResult));
  } else {
    Logger.log("Skipping recallQueue test as no queue was successfully called by callNextQueue.");
  }

  // 3. Test markQueueAsCompleted (using the same queueId)
  if (calledQueueId) {
    Logger.log("Testing markQueueAsCompleted for QueueID: " + calledQueueId);
    const completeResult = markQueueAsCompleted(calledQueueId);
    Logger.log("markQueueAsCompleted Result: " + JSON.stringify(completeResult));
  } else {
    Logger.log("Skipping markQueueAsCompleted test as no queue was successfully called.");
  }

  // 4. Test skipQueue (book another ticket then skip it)
  Logger.log("Booking another ticket for SC01 to test skip...");
  const bookingResult2 = bookNewQueueTicket(testChannelId);
  let skipTestQueueId = null;
  if (bookingResult2.success) {
     const queuesForSkip = fetchQueues(testChannelId, ["waiting"], 5, "TimestampCreated", false);
     if(queuesForSkip.length > 0) {
        skipTestQueueId = queuesForSkip[0].QueueID;
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
  Logger.log("Testing getQueuesForAdminView for channel: " + testChannelId);
  const adminViewResult = getQueuesForAdminView(testChannelId, ["waiting", "calling", "completed", "skipped"], 10, "TimestampCreated", false);
  Logger.log("getQueuesForAdminView Result: " + JSON.stringify(adminViewResult));
  
  Logger.log("Testing getQueuesForAdminView (all channels, specific statuses)");
  const adminViewAllChannels = getQueuesForAdminView(null, ["calling", "skipped"], 10, "TimestampCreated", true);
  Logger.log("getQueuesForAdminView (all channels) Result: " + JSON.stringify(adminViewAllChannels));

  Logger.log("--- Admin Queue Operation Tests Finished ---");
  // PropertiesService.getUserProperties().deleteAllProperties(); // Clean up mock session
}

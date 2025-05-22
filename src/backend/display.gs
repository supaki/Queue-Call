// Functions dedicated to providing data for the public display screen.

/**
 * Retrieves currently "calling" queues and a short list of "waiting" queues across all active service channels.
 * This function is designed to be called by the public display screen frontend to populate its view.
 *
 * @return {object} An object with a `success` status and a `data` payload.
 *   The `data` payload contains two arrays:
 *   - `calling`: An array of objects, each representing a queue currently being called.
 *                Includes `queueId`, `queueNumber`, `channelName`, `serviceChannelId`, `timestampCalled`.
 *                Sorted by `timestampCalled` descending (most recent first).
 *   - `waiting`: An array of objects, each representing a queue that is waiting.
 *                Includes `queueId`, `queueNumber`, `channelName`, `serviceChannelId`, `timestampCreated`.
 *                Limited to the top 5 oldest waiting queues overall.
 *   If an error occurs, returns { success: false, message: "Error message" }.
 *   If no active channels, returns { success: true, data: { calling: [], waiting: [] } }.
 */
function getCurrentlyCallingAndWaitingQueuesForAllChannels() {
  try {
    // Fetch all active service channels to know which ones to consider.
    const activeChannels = getActiveServiceChannels(); // from database.gs
    if (!activeChannels || activeChannels.length === 0) {
      Logger.log("getCurrentlyCallingAndWaitingQueuesForAllChannels: No active service channels found.");
      return { success: true, data: { calling: [], waiting: [] } }; // No active channels, return empty valid data structure
    }

    let processedCallingQueues = [];
    let processedWaitingQueues = [];

    // Fetch all queues currently in the "calling" state across all channels.
    // Limit to 10 as a reasonable number for display, sorted by when they were called.
    const callingQueuesFromDb = fetchQueues(null, ["calling"], 10, "TimestampCalled", false); 
    
    // Enrich calling queues with their respective channel names.
    callingQueuesFromDb.forEach(queue => {
      const channel = getServiceChannelById(queue.ServiceChannelID); // from database.gs
      if (channel) { // Ensure channel data is found
        processedCallingQueues.push({
          queueId: queue.QueueID,
          queueNumber: queue.QueueNumber,
          channelName: channel.ChannelName,
          serviceChannelId: channel.ServiceChannelID,
          timestampCalled: queue.TimestampCalled // Retain for potential client-side sorting or display logic
        });
      } else {
        Logger.log("getCurrentlyCallingAndWaitingQueuesForAllChannels: Channel data not found for ServiceChannelID: " + queue.ServiceChannelID + " for calling queue " + queue.QueueID);
      }
    });
    
    // Ensure calling queues are sorted by TimestampCalled (most recent first),
    // as fetchQueues might sort differently if multiple sort fields were involved or if sorting failed.
    // This also handles cases where queues from different channels are fetched and then combined.
    processedCallingQueues.sort((a, b) => new Date(b.timestampCalled) - new Date(a.timestampCalled));


    // Fetch a limited number of "waiting" queues.
    // For simplicity and performance, fetch the top 5 oldest waiting queues overall.
    const waitingQueuesFromDb = fetchQueues(null, ["waiting"], 5, "TimestampCreated", true); // true for ascending (oldest first)

    // Enrich waiting queues with their channel names.
    waitingQueuesFromDb.forEach(queue => {
      const channel = getServiceChannelById(queue.ServiceChannelID); // from database.gs
      if (channel) { // Ensure channel data is found
        processedWaitingQueues.push({
          queueId: queue.QueueID,
          queueNumber: queue.QueueNumber,
          channelName: channel.ChannelName,
          serviceChannelId: channel.ServiceChannelID,
          timestampCreated: queue.TimestampCreated // Retain for potential client-side logic
        });
      } else {
         Logger.log("getCurrentlyCallingAndWaitingQueuesForAllChannels: Channel data not found for ServiceChannelID: " + queue.ServiceChannelID + " for waiting queue " + queue.QueueID);
      }
    });

    Logger.log("getCurrentlyCallingAndWaitingQueuesForAllChannels: Processed " + processedCallingQueues.length + " calling queues and " + processedWaitingQueues.length + " waiting queues.");

    return {
      success: true,
      data: {
        calling: processedCallingQueues,
        waiting: processedWaitingQueues
      }
    };

  } catch (e) {
    Logger.log("Error in getCurrentlyCallingAndWaitingQueuesForAllChannels: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "An error occurred while fetching queue data for the display: " + e.message };
  }
}

/**
 * Example test function to demonstrate `getCurrentlyCallingAndWaitingQueuesForAllChannels`.
 * This function can be run from the Apps Script editor to test the display data retrieval.
 * Note: For meaningful test results, ensure there are active service channels and queues
 * in "calling" and "waiting" states in your spreadsheet.
 */
function testGetCurrentlyCallingAndWaiting() {
  // Setup: Ensure some test data exists.
  // 1. Make sure 'ServiceChannels' sheet has active channels (e.g., SC01, SC02 from addTestData).
  // 2. Book some tickets for these channels using `bookNewQueueTicket("SC01")`, etc.
  // 3. Call some of these tickets using `callNextQueue("SC01")` or `recallQueue("...")`.
  
  // Example setup (run these manually or in a separate setup function if needed):
  // Logger.log("Test Data Setup: Booking tickets...");
  // bookNewQueueTicket("SC01"); 
  // bookNewQueueTicket("SC01");
  // bookNewQueueTicket("SC02");
  // Logger.log("Test Data Setup: Calling a ticket for SC01...");
  // const qToCall = getOldestWaitingQueue("SC01");
  // if (qToCall) {
  //   updateQueueStatus(qToCall.QueueID, "calling", "TestAdminUser"); // Ensure an admin user exists or use a placeholder
  // } else {
  //   Logger.log("Test Data Setup: No waiting queue found for SC01 to call.");
  // }

  Logger.log("Running testGetCurrentlyCallingAndWaiting...");
  const result = getCurrentlyCallingAndWaitingQueuesForAllChannels();
  Logger.log("Test Result for getCurrentlyCallingAndWaitingQueuesForAllChannels: " + JSON.stringify(result, null, 2));
}

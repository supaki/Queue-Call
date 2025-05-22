// Functions for the public display screen

/**
 * Gets currently calling and a short list of waiting queues for all active channels.
 *
 * @return {object} An object like:
 *   {
 *     success: true,
 *     data: {
 *       calling: [{ queueNumber: 'A101', channelName: 'Counter 1', serviceChannelId: 'SC01', queueId: 'uuid' }, ...],
 *       waiting: [{ queueNumber: 'A102', channelName: 'Counter 1', serviceChannelId: 'SC01', queueId: 'uuid' }, ...]
 *     }
 *   }
 *   or { success: false, message: "Error message" }
 */
function getCurrentlyCallingAndWaitingQueuesForAllChannels() {
  try {
    const activeChannels = getActiveServiceChannels(); // from database.gs
    if (!activeChannels || activeChannels.length === 0) {
      return { success: true, data: { calling: [], waiting: [] } }; // No active channels, return empty data
    }

    let allCallingQueues = [];
    let allWaitingQueues = [];

    // Fetch calling queues for all active channels
    const callingQueues = fetchQueues(null, ["calling"], 10, "TimestampCalled", false); // Fetch top 10 calling, sorted by time called
    
    // Process calling queues to include channel names
    callingQueues.forEach(queue => {
      const channel = getServiceChannelById(queue.ServiceChannelID); // from database.gs
      if (channel) {
        allCallingQueues.push({
          queueId: queue.QueueID,
          queueNumber: queue.QueueNumber,
          channelName: channel.ChannelName,
          serviceChannelId: channel.ServiceChannelID,
          timestampCalled: queue.TimestampCalled // Useful for sorting or display
        });
      }
    });
    
    // Sort calling queues by TimestampCalled (most recent first if not already)
    allCallingQueues.sort((a, b) => new Date(b.timestampCalled) - new Date(a.timestampCalled));


    // Fetch a few waiting queues for all active channels (e.g., top 5 overall, or top N per channel)
    // For simplicity, let's fetch top 5 waiting queues overall, sorted by creation time
    const waitingQueues = fetchQueues(null, ["waiting"], 5, "TimestampCreated", true); // Fetch top 5 waiting, oldest first

    waitingQueues.forEach(queue => {
      const channel = getServiceChannelById(queue.ServiceChannelID); // from database.gs
      if (channel) {
        allWaitingQueues.push({
          queueId: queue.QueueID,
          queueNumber: queue.QueueNumber,
          channelName: channel.ChannelName,
          serviceChannelId: channel.ServiceChannelID,
          timestampCreated: queue.TimestampCreated
        });
      }
    });

    Logger.log("getCurrentlyCallingAndWaitingQueuesForAllChannels: Found " + allCallingQueues.length + " calling, " + allWaitingQueues.length + " waiting.");

    return {
      success: true,
      data: {
        calling: allCallingQueues,
        waiting: allWaitingQueues
      }
    };

  } catch (e) {
    Logger.log("Error in getCurrentlyCallingAndWaitingQueuesForAllChannels: " + e.message + " Stack: " + e.stack);
    return { success: false, message: "Error fetching queue data for display: " + e.message };
  }
}

// Example Test function
function testGetCurrentlyCallingAndWaiting() {
  // Ensure some queues are in "calling" and "waiting" states for testing
  // You might need to manually set these in your sheet or use other functions to create them
  // Also ensure you have active service channels in "ServiceChannels" sheet
  
  // Example: Manually book and call some tickets via admin panel or other test functions first
  // bookNewQueueTicket("SC01"); // Book one for SC01
  // bookNewQueueTicket("SC02"); // Book one for SC02
  // const q1 = getOldestWaitingQueue("SC01");
  // if (q1) updateQueueStatus(q1.QueueID, "calling", "adminTestUserID");
  // const q2 = getOldestWaitingQueue("SC02");
  // if (q2) updateQueueStatus(q2.QueueID, "calling", "adminTestUserID");

  const result = getCurrentlyCallingAndWaitingQueuesForAllChannels();
  Logger.log(JSON.stringify(result, null, 2));
}

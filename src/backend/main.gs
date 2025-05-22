// Main Google Apps Script file for the web application.
// Handles initial web app requests (doGet), URL generation, server-side includes, and custom spreadsheet menu items.

/**
 * Main entry point for serving the web application.
 * This function is called when a user accesses the web app's URL.
 * It routes requests to the appropriate HTML page based on the 'page' URL parameter.
 *
 * @param {object} e The event parameter from a GET request, containing URL parameters.
 *                   Example: e.parameter.page will give the value of the 'page' query parameter.
 * @return {HtmlService.HtmlOutput} The HTML page to display, or an error message.
 */
function doGet(e) {
  let page = e.parameter.page; // Requested page from URL (e.g., ?page=dashboard)
  let filePath = "";
  let pageTitle = "Queue Management System"; // Default page title

  // If no page parameter is provided, default to the login page.
  if (!page) {
    page = "login"; 
  }

  // Basic server-side session check to redirect to login if trying to access a protected page without a session.
  // Note: Client-side JavaScript and specific server-side functions perform more granular checks.
  const session = checkUserSession(); // from auth.gs; assumes auth.gs functions are globally available
  if (page !== "login" && page !== "display_screen" && (!session || !session.isLoggedIn)) {
      Logger.log("doGet: User not logged in, redirecting to login. Requested page: " + page);
      page = "login"; // Force login page if session is invalid for protected pages
  }

  // Determine the HTML file path and title based on the requested page.
  switch (page.toLowerCase()) {
    case "login":
      filePath = "frontend/login.html";
      pageTitle = "Login - Queue System";
      break;
    case "dashboard":
      filePath = "frontend/dashboard.html";
      pageTitle = "Dashboard - Queue System";
      break;
    case "queue_booking":
      filePath = "frontend/queue_booking.html";
      pageTitle = "Book Ticket - Queue System";
      break;
    case "admin_panel":
      filePath = "frontend/admin_panel.html";
      pageTitle = "Admin Panel - Queue System";
      break;
    case "display_screen":
      filePath = "frontend/display_screen.html";
      pageTitle = "Queue Display Screen";
      break;
    case "settings":
      filePath = "frontend/settings.html";
      pageTitle = "Settings - Queue System";
      break;
    default:
      // If an unknown page is requested, serve the login page or a dedicated "not_found.html".
      Logger.log("doGet: Unknown page requested: '" + page + "'. Serving login page.");
      filePath = "frontend/login.html"; 
      pageTitle = "Page Not Found - Queue System";
      break;
  }

  try {
    // Create an HTML template from the determined file path.
    const template = HtmlService.createTemplateFromFile(filePath);
    
    // Make the 'include' function available to all templates for server-side includes (e.g., common styles/scripts).
    template.include = include; 
    
    // Evaluate the template and set page properties.
    return template.evaluate()
                   .setTitle(pageTitle)
                   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Essential for embedding or iframes.
                   .addMetaTag('viewport', 'width=device-width, initial-scale=1.0'); // For responsive design.
  } catch (err) {
    // Log and return a user-friendly error page if template processing fails.
    Logger.log("Error in doGet for page '" + page + "', filePath '" + filePath + "': " + err.message + " Stack: " + err.stack);
    return HtmlService.createHtmlOutput(
      "<h1>Error</h1><p>Could not load page: " + pageTitle + 
      ". Please try again later or contact support.</p><p style='color:grey; font-size:small;'>Error details: " + err.message + "</p>"
    );
  }
}

/**
 * Generates the full URL for a given page name within the web application.
 * This function is callable from client-side JavaScript to facilitate navigation
 * using `google.script.run`.
 * @param {string} pageName The name of the page (e.g., 'dashboard', 'login').
 *                          This corresponds to the `page` parameter in `doGet`.
 * @return {string} The full URL for the specified page.
 */
function getServedUrl(pageName) {
  if (!pageName) {
    Logger.log("getServedUrl: pageName was not provided. Returning base URL of the web app.");
    return ScriptApp.getService().getUrl(); // Returns the base URL of the deployed web app.
  }
  // Construct the URL with the page parameter.
  const url = ScriptApp.getService().getUrl() + "?page=" + pageName.toLowerCase();
  Logger.log("getServedUrl: Generated URL for page '" + pageName + "': " + url);
  return url;
}

/**
 * Includes the content of another HTML file within an HtmlService template.
 * This enables server-side includes, similar to includes in other templating engines.
 * Usage in HTML template: `<?!= include('path/to/your/file.html'); ?>`
 * @param {string} filename The path to the HTML file to be included (relative to the project root).
 * @return {string} The HTML content of the included file, or an error message if inclusion fails.
 */
function include(filename) {
  try {
    // Creates an HTML output object from the specified file and gets its content.
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    Logger.log("Error in include function for filename '" + filename + "': " + err.message);
    return "Error including file: " + filename; // Return an error message in the template.
  }
}

/**
 * Test function for `getServedUrl`. Can be run from the Apps Script editor.
 */
function testGetServedUrl() {
  Logger.log("Test URL for dashboard: " + getServedUrl("dashboard"));
  Logger.log("Test URL for LOGIN (uppercase): " + getServedUrl("LOGIN"));
  Logger.log("Test URL for admin_panel: " + getServedUrl("admin_panel"));
  Logger.log("Test URL for empty pageName: " + getServedUrl("")); // Should return base URL
}

// Example of how one might test doGet behavior from the editor.
// Note: Full testing of doGet often requires deployment and manual access,
// or more complex mocking of the event object 'e' and session state.
// function testDoGet() {
//   const e_login = { parameter: { page: "login" } };
//   Logger.log("Testing doGet with page=login: " + doGet(e_login).getContent());
  
//   const e_dashboard_no_session = { parameter: { page: "dashboard" } };
//   // PropertiesService.getUserProperties().deleteAllProperties(); // Ensure no session
//   Logger.log("Testing doGet with page=dashboard (no session): " + doGet(e_dashboard_no_session).getContent());
  
//   // Simulate a logged-in admin user for accessing protected pages
//   // PropertiesService.getUserProperties().setProperty("isLoggedIn", "true");
//   // PropertiesService.getUserProperties().setProperty("userRole", "admin"); 
//   // const e_dashboard_with_session = { parameter: { page: "dashboard" } };
//   // Logger.log("Testing doGet with page=dashboard (with session): " + doGet(e_dashboard_with_session).getContent());
//   // PropertiesService.getUserProperties().deleteAllProperties(); // Clean up
// }

/**
 * Trigger function that runs when the Google Sheet associated with this script is opened.
 * It adds a custom menu to the Google Sheet UI for easier access to application functionalities.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Queue System') // Top-level menu name
      .addItem('Initialize/Verify System', 'initializeSystemRunner') // Menu item to run system initialization
      .addSeparator() // Adds a dividing line in the menu
      .addItem('Open Web App', 'openWebApp') // Menu item to open the web application
      .addToUi(); // Adds the menu to the UI
}

/**
 * Runner function to call `initializeSystem()` from the custom menu.
 * This acts as an intermediary, allowing the custom menu to invoke functions
 * that might be located in other .gs files (like `utils.gs`). In Apps Script,
 * functions in any .gs file within the same project are globally accessible
 * unless explicitly namespaced.
 */
function initializeSystemRunner() {
  initializeSystem(); // Directly calls the initializeSystem function (expected to be in utils.gs or globally available)
}

/**
 * Opens the deployed web application in a new browser tab.
 * This function is called from the custom menu item "Open Web App".
 */
function openWebApp() {
  const url = ScriptApp.getService().getUrl(); // Get the URL of the deployed web app
  if (url) {
    // Option 1: Use a small HtmlOutput dialog to execute client-side JavaScript that opens a new tab.
    // This is a common workaround for opening URLs from server-side GAS functions in a user-friendly way.
    const htmlOutput = HtmlService.createHtmlOutput(`<script>window.open("${url}", "_blank");</script>`)
        .setWidth(100) // Minimal dialog size, as its only purpose is to run the script.
        .setHeight(1);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Opening Web App...'); // Display the dialog briefly.

    // Option 2: Show a dialog with the link (alternative if direct opening is problematic or for user info).
    // SpreadsheetApp.getUi().alert('Open Web App', 'Web app URL: ' + url, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    // Handle cases where the web app URL might not be available (e.g., not deployed).
    SpreadsheetApp.getUi().alert('Error', 'Could not retrieve the web app URL. Please ensure the script is deployed as a web app.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

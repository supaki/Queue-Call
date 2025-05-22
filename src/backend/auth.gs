// Functions for user authentication and session management

/**
 * Logs in a user by verifying credentials against the Users sheet.
 * Stores user information in session properties upon successful login.
 * @param {string} username The username entered by the user.
 * @param {string} password The password entered by the user.
 * @return {object} An object indicating success or failure, and user data if successful.
 */
function login(username, password) {
    const user = getUserByUsername(username); // Fetches user details from database.gs

  // FIXME: Implement password hashing. Currently using plain text comparison (vulnerable).
  // Password should be hashed before storing and compared using a secure hashing algorithm.
  if (user && user.PasswordHash === password) {
    // Store user details in session properties for server-side access control
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty("userId", user.UserID); 
    userProperties.setProperty("userEmail", user.Email);
    userProperties.setProperty("username", user.Username);
    userProperties.setProperty("userRole", user.Role);
    userProperties.setProperty("isLoggedIn", "true"); // Session flag

    Logger.log(`User ${username} logged in successfully. Role: ${user.Role}, UserID: ${user.UserID}`);
    return {
      success: true,
      // Return user data to the client (excluding sensitive info like PasswordHash)
      user: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role
      }
    };
  } else {
    Logger.log(`Login failed for username: ${username}`);
    return { success: false, message: "Invalid username or password." };
  }
}

/**
 * Checks the current user's session.
 * @return {object} An object containing session information:
 *                  { isLoggedIn: boolean, user?: { userId: string, username: string, email: string, role: string }, currentPage?: string }
 */
function checkUserSession() {
  const userProperties = PropertiesService.getUserProperties();
  const isLoggedIn = userProperties.getProperty("isLoggedIn") === "true";

  if (isLoggedIn) {
    // Retrieve user details from session properties
    return {
      isLoggedIn: true,
      // Construct user object from stored properties
      user: {
        userId: userProperties.getProperty("userId"),
        username: userProperties.getProperty("username"),
        email: userProperties.getProperty("userEmail"),
        role: userProperties.getProperty("userRole")
      },
      currentPage: userProperties.getProperty("currentPage") || "dashboard" // Default to dashboard
    };
  } else {
    return { isLoggedIn: false };
  }
}

/**
 * Retrieves the current logged-in user's details from session properties.
 * Intended for server-side use (e.g., by other backend functions for authorization).
 * The underscore suffix is a convention to indicate it's not directly called by the client.
 * @return {object|null} The user object { userId: string, username: string, email: string, role: string } or null if not logged in or essential properties are missing.
 */
function getCurrentUser_() {
  const userProperties = PropertiesService.getUserProperties();
  const isLoggedIn = userProperties.getProperty("isLoggedIn") === "true";

  if (isLoggedIn) {
    const user = {
      userId: userProperties.getProperty("userId"),
      username: userProperties.getProperty("username"),
      email: userProperties.getProperty("userEmail"),
      role: userProperties.getProperty("userRole")
    };
    // Validate that essential user properties are present in the session
    if (user.userId && user.role) {
      return user;
    } else {
      Logger.log("getCurrentUser_: User is logged in but session properties (userId or role) are missing. Invalidating session.");
      // Consider clearing properties if essential ones are missing to force re-login
      // PropertiesService.getUserProperties().deleteAllProperties(); 
      return null;
    }
  }
  Logger.log("getCurrentUser_: No user is currently logged in.");
  return null;
}


/**
 * Stores the current page the user is on in their session properties.
 * This can be used to redirect users back to their last page after re-login or session recovery.
 * @param {string} page The name of the page (e.g., 'dashboard', 'settings').
 */
function storeCurrentPage(page) {
  PropertiesService.getUserProperties().setProperty("currentPage", page);
  Logger.log("Current page stored in session: " + page);
}

/**
 * Logs out the current user by deleting all their session properties.
 * @return {object} An object indicating success: { success: true, message: string }.
 */
function logout() {
  PropertiesService.getUserProperties().deleteAllProperties(); // Clears all session data for the current user
  Logger.log("User logged out. Session properties cleared.");
  return { success: true, message: "Logged out successfully." };
}

/**
 * Handles the forgot password request by generating a temporary password
 * and updating it in the Users sheet.
 * @param {string} email The user's email address.
 * @return {object} An object indicating success or failure. If successful,
 *                  it includes the new temporary password (for display/testing only,
 *                  should be emailed in production).
 *                  { success: boolean, newPassword?: string, message: string }
 */
function forgotPassword(email) {
  const user = getUserByEmail(email); // Fetches user from database.gs

  if (user) {
    const tempPassword = generateTemporaryPassword(8); // Generates an 8-character temporary password (from utils.gs)
    
    // TODO: The temporary password should also be hashed before storing if the system uses hashed passwords.
    // For now, it's updating with plain text.
    const passwordUpdated = updateUserPassword(email, tempPassword); // Updates password in database.gs

    if (passwordUpdated) {
      // TODO: Implement actual email sending via MailApp. This is critical for production.
      // Example: MailApp.sendEmail(email, "Your New Temporary Password", "Your new temporary password is: " + tempPassword);
      Logger.log(`Password reset for ${email}. New temporary password: ${tempPassword}. (Email sending is not implemented)`);
      return {
        success: true,
        newPassword: tempPassword, // For testing purposes only. Remove from response in production after email is sent.
        message: "Password reset. A new temporary password has been generated and should be sent to your email (feature pending)."
      };
    } else {
      Logger.log(`Failed to update password for ${email} in the sheet.`);
      return { success: false, message: "Error resetting password. Please try again." };
    }
  } else {
    Logger.log(`Forgot password attempt for non-existent email: ${email}`);
    return { success: false, message: "Email not found. Please check the email address." };
  }
}

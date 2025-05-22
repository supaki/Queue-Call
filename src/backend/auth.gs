// Functions for user authentication

/**
 * Logs in a user.
 * @param {string} username The username.
 * @param {string} password The password.
 * @return {object} An object indicating success or failure, and user data if successful.
 */
function login(username, password) {
  const user = getUserByUsername(username); // From database.gs

  // TODO: Implement password hashing and comparison. For now, plain text comparison.
  if (user && user.PasswordHash === password) {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty("userId", user.UserID); // Store UserID
    userProperties.setProperty("userEmail", user.Email);
    userProperties.setProperty("username", user.Username);
    userProperties.setProperty("userRole", user.Role);
    userProperties.setProperty("isLoggedIn", "true");

    Logger.log(`User ${username} logged in successfully. Role: ${user.Role}`);
    return {
      success: true,
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
 * @return {object} An object containing session information.
 */
function checkUserSession() {
  const userProperties = PropertiesService.getUserProperties();
  const isLoggedIn = userProperties.getProperty("isLoggedIn") === "true";

  if (isLoggedIn) {
    return {
      isLoggedIn: true,
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
 * Intended for server-side use.
 * @return {object|null} The user object {userId, username, email, role} or null if not logged in.
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
    // Ensure essential properties like role and userId are present
    if (user.userId && user.role) {
      return user;
    } else {
      Logger.log("getCurrentUser_: User is logged in but session properties (userId or role) are missing.");
      return null;
    }
  }
  Logger.log("getCurrentUser_: No user is currently logged in.");
  return null;
}


/**
 * Stores the current page in the user's session.
 * @param {string} page The name of the page (e.g., 'dashboard').
 */
function storeCurrentPage(page) {
  PropertiesService.getUserProperties().setProperty("currentPage", page);
}

/**
 * Logs out the current user.
 * @return {object} An object indicating success.
 */
function logout() {
  PropertiesService.getUserProperties().deleteAllProperties();
  Logger.log("User logged out.");
  return { success: true, message: "Logged out successfully." };
}

/**
 * Handles the forgot password request.
 * @param {string} email The user's email.
 * @return {object} An object indicating success or failure, and the new password if successful.
 */
function forgotPassword(email) {
  const user = getUserByEmail(email); // From database.gs

  if (user) {
    const tempPassword = generateTemporaryPassword(8); // From utils.gs
    const passwordUpdated = updateUserPassword(email, tempPassword); // From database.gs

    if (passwordUpdated) {
      // TODO: Implement actual email sending via MailApp.
      // MailApp.sendEmail(email, "Your New Password", "Your new temporary password is: " + tempPassword);
      Logger.log(`Password reset for ${email}. New password: ${tempPassword}`);
      return {
        success: true,
        newPassword: tempPassword, // For testing purposes, remove in production
        message: "Password reset. A new temporary password has been generated."
      };
    } else {
      Logger.log(`Failed to update password for ${email} in the sheet.`);
      return { success: false, message: "Error resetting password. Please try again." };
    }
  } else {
    Logger.log(`Forgot password attempt for non-existent email: ${email}`);
    return { success: false, message: "Email not found." };
  }
}

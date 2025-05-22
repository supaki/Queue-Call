// Utility functions, e.g., initialization

/**
 * Generates a random alphanumeric string.
 * @param {number} length The length of the password to generate. Default is 8.
 * @return {string} The generated password.
 */
function generateTemporaryPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

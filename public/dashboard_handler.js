// File: public/dashboard_handler.js

/**
 * A helper function to display a toast notification on the screen.
 * This can be re-used for any notifications you want to show on the dashboard.
 * @param {string} message The text to display in the toast.
 * @param {boolean} isError If true, styles the toast as an error (red). If false, styles as success (green).
 */
function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    // Safety check: If the toast element doesn't exist on the page, do nothing.
    if (!toast) return;

    // Set the message and apply the correct style
    toast.textContent = message;
    toast.classList.remove('success', 'error'); // Clear any previous styles

    if (isError) {
        toast.classList.add('error'); // Your CSS should handle the red color
    } else {
        toast.classList.add('success'); // Your CSS should handle the green color
    }

    // Make the toast visible
    toast.classList.add('show');

    // Set a timer to automatically hide the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * This is the main logic that runs as soon as the dashboard page has loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. CHECK for a message passed from the login page.
    const message = sessionStorage.getItem('toastMessage');

    // 2. If a message was found...
    if (message) {
        // ...show it in a success toast.
        showToast(message, false);

        // 3. CRITICAL STEP: Remove the message from storage.
        // This prevents the toast from reappearing every time the user refreshes the dashboard.
        sessionStorage.removeItem('toastMessage');
    }
});
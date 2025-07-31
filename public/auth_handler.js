// File: public/auth_handler.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form[action="/login"]');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            // Stop the form from doing a default page refresh
            event.preventDefault();

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                // Send the form data to the server in the background
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    // If login was successful, the server tells us where to go
                    window.location.href = result.redirectUrl;
                } else {
                    // If there was an error, show the toast with the message
                    showToast(result.message, true); // true means it's an error
                }
            } catch (error) {
                // Handle network errors (e.g., server is down)
                showToast('A network error occurred. Please try again.', true);
            }
        });
    }

    // You can add similar logic for the registration form here if you want!
});

// A helper function to show the toast notification
function showToast(message, isError = true) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    
    // Add or remove the 'success' class for different colors
    if (isError) {
        toast.classList.remove('success');
    } else {
        toast.classList.add('success');
    }

    // Make the toast visible
    toast.classList.add('show');

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
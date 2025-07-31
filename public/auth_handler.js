// File: public/auth_handler.js (Refined to handle both Login and Register)

document.addEventListener('DOMContentLoaded', () => {
    // --- LOGIN FORM HANDLER ---
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            // We pass the form and the URL to a generic handler function
            handleAuthForm(event, loginForm, '/login');
        });
    }

    // --- REGISTER FORM HANDLER (NEW!) ---
    const registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            handleAuthForm(event, registerForm, '/register');
        });
    }
});

// A generic function to handle submission for any auth form
async function handleAuthForm(event, formElement, postUrl) {
    // 1. STOP the default browser refresh
    event.preventDefault();

    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());

    try {
        // 2. SEND data in the background
        const response = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        // 3. HANDLE the server's response
        if (result.success) {
            // If successful, redirect to the URL the server provides
            window.location.href = result.redirectUrl;
        } else {
            // If there's an error, show the toast
            showToast(result.message, true);
        }
    } catch (error) {
        showToast('A network error occurred. Please try again.', true);
    }
}

// Helper function to show toasts (no changes needed here)
function showToast(message, isError = true) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = isError ? 'toast show error' : 'toast show success';
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}
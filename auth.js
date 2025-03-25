// Global variables
const CURRENT_USER = 'Manoj-dj';
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 300;
const LOCKOUT_DURATION = 1 * 60 * 1000; // 15 minutes
let lockoutEndTime = null;

// Document ready handler
document.addEventListener('DOMContentLoaded', () => {
    // Get role from URL params and setup initial page state
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');

    // Update page title and form based on role
    if (role === 'admin') {
        document.getElementById('loginTitle').textContent = 'Admin Login';
        document.getElementById('registerCard').classList.add('d-none');
    } else {
        initializeUserLogin();
    }

    // Setup form event listeners
    setupFormListeners();

    // Check for existing session and lockout status
    checkSession();
    checkLockoutStatus();

    // Display current user and timestamp if available
    displayUserInfo();
});

function displayUserInfo() {
    const userInfo = document.createElement('div');
    userInfo.className = 'text-right text-muted small mb-2';
    userInfo.innerHTML = `
        <p class="mb-0">Current User: ${CURRENT_USER}</p>
        <p class="mb-0">Last Login: ${formatDate(new Date())}</p>
    `;
    document.querySelector('.container').prepend(userInfo);
}

function formatDate(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

function setupFormListeners() {
    // Toggle buttons
    const toggleButtons = {
        'registerToggle': 'register',
        'loginToggle': 'login',
        'forgotPasswordToggle': 'forgotPassword',
        'loginToggle2': 'login'
    };

    Object.entries(toggleButtons).forEach(([id, formType]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                toggleForm(formType);
            });
        }
    });

    // Form submissions
    const forms = {
        'loginForm': handleLogin,
        'registerForm': handleRegister,
        'forgotPasswordForm': handleForgotPassword
    };

    Object.entries(forms).forEach(([id, handler]) => {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', (e) => handler(e));
        }
    });
}

function initializeUserLogin() {
    // Set default user credentials for testing
    if (window.location.hostname === 'localhost') {
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        if (username && password) {
            username.value = 'user';
            password.value = 'user123';
        }
    }
}

async function checkSession() {
    try {
        const response = await fetch('/api/auth/check-session', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.isLoggedIn) {
            redirectToDashboard(data.user.role);
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function checkLockoutStatus() {
    const storedLockoutEndTime = localStorage.getItem('lockoutEndTime');
    if (storedLockoutEndTime) {
        lockoutEndTime = new Date(storedLockoutEndTime);
        if (new Date() < lockoutEndTime) {
            disableLoginForm();
            startLockoutTimer();
        } else {
            localStorage.removeItem('lockoutEndTime');
            enableLoginForm();
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') || 'user';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                role
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Store session data
            sessionStorage.setItem('userRole', data.user.role);
            sessionStorage.setItem('username', data.user.username);
            sessionStorage.setItem('loginTime', new Date().toISOString().replace('T', ' ').slice(0, 19));

            // Show success message
            showSuccess('Login successful! Redirecting...');
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
            }, 1500);
        } else {
            showError(data.message || 'Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }

    return false;
}

async function handleRegister(event) {
    event.preventDefault();

    // Clear previous errors
    clearErrors();

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Validation
    if (!validateRegistrationInput(username, email, password, confirmPassword)) {
        return false;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                currentUser: 'Manoj-dj'
            })
        });

        const data = await response.json();

        if (data.success) {
            // Clear form
            document.getElementById('registerForm').reset();
            
            // Show success message
            showSuccess('Registration successful! Please login.');
            
            // Switch to login form after delay
            setTimeout(() => {
                toggleForm('login');
            }, 2000);
        } else {
            // Handle specific error types
            switch (data.errorType) {
                case 'duplicateUsername':
                    showFieldError('regUsername', 'Username already exists');
                    break;
                case 'duplicateEmail':
                    showFieldError('regEmail', 'Email already registered');
                    break;
                default:
                    showError(data.message || 'Registration failed');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please try again.');
    }

    return false;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    field.classList.add('is-invalid');
    field.parentNode.appendChild(errorDiv);
}

function clearErrors() {
    // Remove all error messages and invalid classes
    document.querySelectorAll('.is-invalid').forEach(element => {
        element.classList.remove('is-invalid');
    });
    
    document.querySelectorAll('.invalid-feedback').forEach(element => {
        element.remove();
    });
    
    document.querySelectorAll('.alert').forEach(element => {
        element.remove();
    });
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('resetEmail').value.trim();

    if (!validateEmail(email)) {
        showError('Please enter a valid email address');
        return false;
    }

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                requestTime: formatDate(new Date()),
                requestedBy: CURRENT_USER
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Password reset instructions sent to your email.');
            document.getElementById('forgotPasswordForm').reset();
            setTimeout(() => toggleForm('login'), 2000);
        } else {
            showError(data.message || 'Password reset request failed');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showError('Failed to process password reset request');
    }

    return false;
}

function validateLoginInput(username, password) {
    if (!username || !password) {
        showError('Please enter both username and password');
        return false;
    }
    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return false;
    }
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
    }
    return true;
}

function validateRegistrationInput(username, email, password, confirmPassword) {
    clearErrors();

    let isValid = true;

    if (!username || username.length < 3) {
        showFieldError('regUsername', 'Username must be at least 3 characters long');
        isValid = false;
    }

    if (!email || !validateEmail(email)) {
        showFieldError('regEmail', 'Please enter a valid email address');
        isValid = false;
    }

    if (!password || password.length < 6) {
        showFieldError('regPassword', 'Password must be at least 6 characters long');
        isValid = false;
    }

    if (password !== confirmPassword) {
        showFieldError('regConfirmPassword', 'Passwords do not match');
        isValid = false;
    }

    return isValid;
}

function formatTimestamp(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function toggleForm(formType) {
    const forms = {
        login: 'loginCard',
        register: 'registerCard',
        forgotPassword: 'forgotPasswordCard'
    };

    Object.values(forms).forEach(cardId => {
        document.getElementById(cardId).classList.add('d-none');
    });

    document.getElementById(forms[formType]).classList.remove('d-none');
}

function handleSuccessfulLogin(role, username) {
    loginAttempts = 0;
    localStorage.removeItem('lockoutEndTime');
    
    sessionStorage.setItem('userRole', role);
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('loginTime', formatDate(new Date()));

    showSuccess('Login successful! Redirecting...');
    
    setTimeout(() => redirectToDashboard(role), 1500);
}

function handleFailedLogin() {
    loginAttempts++;
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockoutEndTime = new Date(Date.now() + LOCKOUT_DURATION);
        localStorage.setItem('lockoutEndTime', lockoutEndTime.toISOString());
        disableLoginForm();
        startLockoutTimer();
    }
}

function isLockedOut() {
    return lockoutEndTime && new Date() < lockoutEndTime;
}

function disableLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.querySelectorAll('input, button').forEach(element => {
            element.disabled = true;
        });
    }
}

function enableLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.querySelectorAll('input, button').forEach(element => {
            element.disabled = false;
        });
    }
}

function startLockoutTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'lockoutTimer';
    timerDisplay.className = 'alert alert-warning';
    document.getElementById('loginForm').prepend(timerDisplay);

    const updateTimer = () => {
        const now = new Date();
        if (now < lockoutEndTime) {
            const remainingTime = Math.ceil((lockoutEndTime - now) / 1000);
            timerDisplay.textContent = `Account locked. Please try again in ${remainingTime} seconds.`;
            setTimeout(updateTimer, 1000);
        } else {
            timerDisplay.remove();
            localStorage.removeItem('lockoutEndTime');
            lockoutEndTime = null;
            loginAttempts = 0;
            enableLoginForm();
        }
    };

    updateTimer();
}

function redirectToDashboard(role) {
    window.location.href = role === 'admin' ? '/admin/dashboard' : '/dashboard';
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'danger');
}

function showMessage(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">
            <span>&times;</span>
        </button>
    `;
    
    const cardBody = document.querySelector('.card:not(.d-none) .card-body');
    if (cardBody) {
        cardBody.insertBefore(alertDiv, cardBody.firstChild);
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.clear();
            localStorage.removeItem('lockoutEndTime');
            window.location.href = '/';
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
}

// Export functions for global use
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout = handleLogout;
window.toggleForm = toggleForm;
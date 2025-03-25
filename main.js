// Global variables
let currentUser = null;
let userRole = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const userBtn = document.querySelector('button[onclick="redirectToLogin(\'user\')"]');
    const adminBtn = document.querySelector('button[onclick="redirectToLogin(\'admin\')"]');

    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/login?role=user';
        });
    }

    if (adminBtn) {
        adminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/login?role=admin';
        });
    }
});

// Check if user is logged in
function checkSession() {
    fetch('/api/auth/check-session')
        .then(response => response.json())
        .then(data => {
            if (data.isLoggedIn) {
                currentUser = data.user;
                userRole = data.role;
                updateUIForLoggedInUser();
            }
        })
        .catch(error => console.error('Session check failed:', error));
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Resume template selection
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', () => selectTemplate(card.dataset.templateId));
    });
}

// Handle role selection and redirect to appropriate login page
function redirectToLogin(role) {
    window.location.href = `/login?role=${role}`;
}

// Handle logout
function handleLogout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            sessionStorage.clear();
            window.location.href = '/';
        }
    })
    .catch(error => console.error('Logout failed:', error));
}

// Update UI for logged-in user
function updateUIForLoggedInUser() {
    const navbarRight = document.querySelector('.navbar-right');
    if (navbarRight) {
        navbarRight.innerHTML = `
            <span class="navbar-text mr-3">Welcome, ${currentUser.username}</span>
            <button class="btn btn-outline-light" id="logoutBtn">Logout</button>
        `;
    }

    // Show appropriate navigation based on user role
    if (userRole === 'admin') {
        showAdminNavigation();
    } else {
        showUserNavigation();
    }
}

// Show admin navigation
function showAdminNavigation() {
    const nav = document.querySelector('.navbar-nav');
    if (nav) {
        nav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="/admin/users">Manage Users</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/admin/templates">Manage Templates</a>
            </li>
        `;
    }
}

// Show user navigation
function showUserNavigation() {
    const nav = document.querySelector('.navbar-nav');
    if (nav) {
        nav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="/dashboard">Dashboard</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/my-resumes">My Resumes</a>
            </li>
        `;
    }
}

// Handle real-time preview updates
function updatePreview(sectionId, content) {
    const previewSection = document.querySelector(`#preview-${sectionId}`);
    if (previewSection) {
        previewSection.innerHTML = content;
    }
}

// Save resume draft
function saveResumeDraft() {
    const resumeData = collectResumeData();
    
    fetch('/api/resumes/draft', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resumeData),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Resume draft saved successfully!', 'success');
        }
    })
    .catch(error => {
        console.error('Error saving draft:', error);
        showNotification('Failed to save draft', 'error');
    });
}

// Collect resume data from form
function collectResumeData() {
    return {
        personalInfo: {
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value
        },
        education: Array.from(document.querySelectorAll('.education-entry')).map(entry => ({
            institution: entry.querySelector('.institution').value,
            degree: entry.querySelector('.degree').value,
            year: entry.querySelector('.year').value
        })),
        experience: Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
            company: entry.querySelector('.company').value,
            position: entry.querySelector('.position').value,
            duration: entry.querySelector('.duration').value,
            description: entry.querySelector('.description').value
        })),
        skills: document.getElementById('skills').value.split(',').map(skill => skill.trim())
    };
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} fade show position-fixed`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export resume as PDF
function exportToPDF() {
    const resumeId = document.querySelector('.resume-preview').dataset.resumeId;
    
    fetch(`/api/resumes/${resumeId}/export`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    })
    .catch(error => {
        console.error('Error exporting PDF:', error);
        showNotification('Failed to export PDF', 'error');
    });
}
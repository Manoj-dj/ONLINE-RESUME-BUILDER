// Resume builder functionality
let currentTemplate = null;
let resumeData = {
    personalInfo: {},
    education: [],
    experience: [],
    skills: []
};

document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();
    setupResumeBuilderEvents();
});

// Load resume templates
function loadTemplates() {
    fetch('/api/templates')
        .then(response => response.json())
        .then(templates => {
            displayTemplates(templates);
        })
        .catch(error => console.error('Error loading templates:', error));
}

// Display templates in the UI
function displayTemplates(templates) {
    const container = document.getElementById('templateContainer');
    container.innerHTML = templates.map(template => `
        <div class="col-md-4 mb-4">
            <div class="card template-card" data-template-id="${template._id}">
                <img src="${template.preview}" class="card-img-top template-preview" alt="${template.name}">
                <div class="card-body">
                    <h5 class="card-title">${template.name}</h5>
                    <p class="card-text">${template.description}</p>
                    <button class="btn btn-primary btn-block" onclick="selectTemplate('${template._id}')">
                        Use this template
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Select a template
function selectTemplate(templateId) {
    currentTemplate = templateId;
    document.getElementById('templateSelection').classList.add('d-none');
    document.getElementById('resumeBuilder').classList.remove('d-none');
    
    // Load template specific styling
    fetch(`/api/templates/${templateId}/style`)
        .then(response => response.text())
        .then(style => {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = style;
            document.head.appendChild(styleSheet);
        });
}

// Setup resume builder events
function setupResumeBuilderEvents() {
    // Personal Information
    document.getElementById('personalInfoForm').addEventListener('input', (e) => {
        resumeData.personalInfo[e.target.name] = e.target.value;
        updatePreview();
    });

    // Add Education Entry
    document.getElementById('addEducation').addEventListener('click', () => {
        addEducationEntry();
    });

    // Add Experience Entry
    document.getElementById('addExperience').addEventListener('click', () => {
        addExperienceEntry();
    });

    // Skills
    document.getElementById('skillsInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            addSkill(e.target.value);
            e.target.value = '';
        }
    });
}

// Add education entry
function addEducationEntry() {
    const educationContainer = document.getElementById('educationEntries');
    const entryId = `edu-${Date.now()}`;
    
    const entry = document.createElement('div');
    entry.className = 'education-entry card mb-3';
    entry.id = entryId;
    entry.innerHTML = `
        <div class="card-body">
            <div class="form-row">
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Institution" name="institution">
                </div>
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Degree" name="degree">
                </div>
            </div>
            <div class="form-row">
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Year" name="year">
                </div>
                <div class="col-md-6 text-right">
                    <button class="btn btn-danger" onclick="removeEntry('${entryId}')">Remove</button>
                </div>
            </div>
        </div>
    `;
    
    educationContainer.appendChild(entry);
    updatePreview();
}

// Add experience entry
function addExperienceEntry() {
    const experienceContainer = document.getElementById('experienceEntries');
    const entryId = `exp-${Date.now()}`;
    
    const entry = document.createElement('div');
    entry.className = 'experience-entry card mb-3';
    entry.id = entryId;
    entry.innerHTML = `
        <div class="card-body">
            <div class="form-row">
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Company" name="company">
                </div>
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Position" name="position">
                </div>
            </div>
            <div class="form-row">
                <div class="col-md-12">
                    <textarea class="form-control mb-2" placeholder="Description" name="description" rows="3"></textarea>
                </div>
            </div>
            <div class="form-row">
                <div class="col-md-6">
                    <input type="text" class="form-control mb-2" placeholder="Duration" name="duration">
                </div>
                <div class="col-md-6 text-right">
                    <button class="btn btn-danger" onclick="removeEntry('${entryId}')">Remove</button>
                </div>
            </div>
        </div>
    `;
    
    experienceContainer.appendChild(entry);
    updatePreview();
}

// Add skill
function addSkill(skill) {
    if (!skill) return;
    
    const skillsContainer = document.getElementById('skillsList');
    const skillElement = document.createElement('span');
    skillElement.className = 'badge badge-primary mr-2 mb-2';
    skillElement.innerHTML = `
        ${skill}
        <button type="button" class="close ml-2" onclick="removeSkill(this)">
            <span>&times;</span>
        </button>
    `;
    
    skillsContainer.appendChild(skillElement);
    resumeData.skills.push(skill);
    updatePreview();
}

// Remove entry (education or experience)
function removeEntry(entryId) {
    document.getElementById(entryId).remove();
    updatePreview();
}

// Remove skill
function removeSkill(button) {
    const skill = button.parentElement;
    const skillText = skill.textContent.trim();
    resumeData.skills = resumeData.skills.filter(s => s !== skillText);
    skill.remove();
    updatePreview();
}

// Update resume preview
function updatePreview() {
    const previewContainer = document.getElementById('resumePreview');
    
    // Collect current form data
    collectFormData();
    
    // Update preview based on selected template
    fetch(`/api/templates/${currentTemplate}/preview`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resumeData)
    })
    .then(response => response.text())
    .then(html => {
        previewContainer.innerHTML = html;
    });
}

// Collect form data
function collectFormData() {
    // Personal Info
    const personalInfoForm = document.getElementById('personalInfoForm');
    resumeData.personalInfo = {};
    new FormData(personalInfoForm).forEach((value, key) => {
        resumeData.personalInfo[key] = value;
    });
    
    // Education
    resumeData.education = Array.from(document.querySelectorAll('.education-entry')).map(entry => ({
        institution: entry.querySelector('[name="institution"]').value,
        degree: entry.querySelector('[name="degree"]').value,
        year: entry.querySelector('[name="year"]').value
    }));
    
    // Experience
    resumeData.experience = Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
        company: entry.querySelector('[name="company"]').value,
        position: entry.querySelector('[name="position"]').value,
        description: entry.querySelector('[name="description"]').value,
        duration: entry.querySelector('[name="duration"]').value
    }));
}

// Save resume
function saveResume() {
    collectFormData();
    
    fetch('/api/resumes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            templateId: currentTemplate,
            data: resumeData
        }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Resume saved successfully!', 'success');
        } else {
            showNotification('Failed to save resume', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving resume:', error);
        showNotification('Failed to save resume', 'error');
    });
}

// Export resume as PDF
function exportResume() {
    collectFormData();
    
    fetch('/api/resumes/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            templateId: currentTemplate,
            data: resumeData
        }),
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
        console.error('Error exporting resume:', error);
        showNotification('Failed to export resume', 'error');
    });
}
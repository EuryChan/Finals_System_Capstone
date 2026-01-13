
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeUserMenu();
    initializeStatCards();
    initEligibilityForm();
    initializeSidebarProfile();
});

// ===== NAVIGATION SYSTEM =====
function initializeNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.dataset.page;
            const pageTitle = this.querySelector('span').textContent;
            document.querySelector('.page-title').textContent = pageTitle;
            
            const pages = document.querySelectorAll('.page-content');
            pages.forEach(p => p.classList.remove('active'));
            
            const targetPage = document.getElementById(`${page}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Reinitialize eligibility form when switching to that page
                if (page === 'eligibility') {
                    setTimeout(() => initEligibilityForm(), 100);
                }
            }
            
            targetPage.style.animation = 'none';
            setTimeout(() => {
                targetPage.style.animation = 'fadeIn 0.4s ease-out';
            }, 10);
        });
    });
}

// ===== SIDEBAR PROFILE MENU =====
function initializeSidebarProfile() {
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('sidebarProfileDropdown');
        const toggle = document.querySelector('.profile-menu-toggle');
        
        if (dropdown && toggle) {
            if (!dropdown.contains(event.target) && !toggle.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        }
    });
}

// Sidebar Profile Menu Toggle
window.toggleSidebarProfileMenu = function() {
    const dropdown = document.getElementById('sidebarProfileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

// ===== USER MENU TOGGLE =====
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
    
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.user-menu')) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Initialize user menu on page load
function initializeUserMenu() {
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        // User menu is initialized via toggleUserMenu() function
        // This function exists to satisfy the DOMContentLoaded call
        console.log('User menu initialized');
    }
}

// ===== STAT CARDS ANIMATION =====
function initializeStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===== LOGOUT FUNCTION =====
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const csrfToken = getCookie('csrftoken');
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/logout/';
        
        if (csrfToken) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrfmiddlewaretoken';
            input.value = csrfToken;
            form.appendChild(input);
        }
        
        document.body.appendChild(form);
        form.submit();
    }
}

// ===== HELPER: GET CSRF TOKEN =====
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ===== ALERT MODAL FUNCTIONS =====
function showAlert(type, title, message) {
    const modal = document.getElementById('alertModal');
    const modalContent = modal.querySelector('.alert-modal');
    const icon = document.getElementById('alertIcon');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    
    modalContent.classList.remove('success', 'error', 'warning', 'info');
    modalContent.classList.add(type);
    
    const icons = {
        'success': '✓',
        'error': '✕',
        'warning': '⚠',
        'info': 'ℹ'
    };
    icon.textContent = icons[type] || 'ℹ';
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    modal.classList.add('active');
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    modal.classList.remove('active');
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease-out;
        font-size: 14px;
        font-weight: 500;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ===== ELIGIBILITY FORM VARIABLES =====
let eligCurrentStep = 'elig-intro';
let eligPositionType = null;
let eligFormData = {};
let eligSignatureCanvas, eligSignatureCtx;
let eligIsDrawing = false;
let eligHasSignature = false;

// ===== INITIALIZE ELIGIBILITY FORM =====
function initEligibilityForm() {
    const eligPage = document.getElementById('eligibility-page');
    if (!eligPage) return;
    
    // Initialize signature canvas
    eligSignatureCanvas = document.getElementById('elig-signature-canvas');
    if (eligSignatureCanvas) {
        eligSignatureCtx = eligSignatureCanvas.getContext('2d');
        eligSignatureCtx.strokeStyle = '#1e40af';
        eligSignatureCtx.lineWidth = 2;
        eligSignatureCtx.lineCap = 'round';
        eligSignatureCtx.lineJoin = 'round';

        // Mouse events
        eligSignatureCanvas.addEventListener('mousedown', eligStartDrawing);
        eligSignatureCanvas.addEventListener('mousemove', eligDraw);
        eligSignatureCanvas.addEventListener('mouseup', eligStopDrawing);
        eligSignatureCanvas.addEventListener('mouseout', eligStopDrawing);

        // Touch events
        eligSignatureCanvas.addEventListener('touchstart', eligHandleTouchStart);
        eligSignatureCanvas.addEventListener('touchmove', eligHandleTouchMove);
        eligSignatureCanvas.addEventListener('touchend', eligStopDrawing);
    }
    
    setupEligValidation();
}

// ===== NAVIGATION FUNCTIONS =====
window.showEligIntroPage = function() {
    showEligStep('elig-intro');
};

window.showEligSelectionPage = function() {
    showEligStep('elig-selection');
};

window.selectEligPositionType = function(type) {
    eligPositionType = type;
    eligFormData.positionType = type;
    showEligStep('elig-step1');
    
    if (type === 'appointive') {
        document.getElementById('elig-appointive-fields').style.display = 'block';
        document.getElementById('elig-elective-fields').style.display = 'none';
    } else {
        document.getElementById('elig-appointive-fields').style.display = 'none';
        document.getElementById('elig-elective-fields').style.display = 'block';
    }
};

function showEligStep(stepId) {
    document.querySelectorAll('#eligibility-page .elig-step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });
    
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block';
    }
    
    eligCurrentStep = stepId;
    
    const breadcrumb = document.getElementById('elig-breadcrumb-nav');
    if (breadcrumb) {
        if (['elig-intro', 'elig-selection', 'elig-success', 'elig-certificate-appointive', 'elig-certificate-elective'].includes(stepId)) {
            breadcrumb.style.display = 'none';
        } else {
            breadcrumb.style.display = 'flex';
            updateEligBreadcrumb();
        }
    }
    
    // Initialize calculations when showing step2
    if (stepId === 'elig-step2') {
        setTimeout(() => {
            if (eligPositionType === 'appointive') {
                setupAppointiveCalculations();
            } else if (eligPositionType === 'elective') {
                setupElectiveCalculations();
            }
        }, 100);
    }
    
    updateEligValidation();
}

function updateEligBreadcrumb() {
    const steps = ['elig-step1', 'elig-step2', 'elig-step3', 'elig-step4', 'elig-step5'];
    steps.forEach((step) => {
        const breadcrumb = document.getElementById(`${step}-breadcrumb`);
        if (breadcrumb) {
            if (step === eligCurrentStep) {
                breadcrumb.classList.add('active');
            } else {
                breadcrumb.classList.remove('active');
            }
        }
    });
}

window.eligNextStep = function() {
    const stepMap = {
        'elig-step1': 'elig-step2',
        'elig-step2': 'elig-step3',
        'elig-step3': 'elig-step4',
        'elig-step4': 'elig-step5',
        'elig-step5': 'elig-step6'
    };
    
    if (stepMap[eligCurrentStep]) {
        // Save form data before moving to next step
        saveCurrentStepData();
        showEligStep(stepMap[eligCurrentStep]);
        
        // Populate preview if moving to step 6
        if (stepMap[eligCurrentStep] === 'elig-step6') {
            populatePreview();
        }
    }
};

window.eligPrevStep = function() {
    const stepMap = {
        'elig-step1': 'elig-selection',
        'elig-step2': 'elig-step1',
        'elig-step3': 'elig-step2',
        'elig-step4': 'elig-step3',
        'elig-step5': 'elig-step4',
        'elig-step6': 'elig-step5'
    };
    
    if (stepMap[eligCurrentStep]) {
        showEligStep(stepMap[eligCurrentStep]);
    }
};

// ===== SAVE CURRENT STEP DATA =====
function saveCurrentStepData() {
    if (eligCurrentStep === 'elig-step1') {
        eligFormData.lastName = document.getElementById('elig-last_name').value.trim();
        eligFormData.firstName = document.getElementById('elig-first_name').value.trim();
        eligFormData.middleInitial = document.getElementById('elig-middle_initial').value.trim();
        eligFormData.barangay = document.getElementById('elig-barangay').value.trim();
        eligFormData.email = document.getElementById('elig-email').value.trim();
    }
    
    if (eligCurrentStep === 'elig-step2' && eligPositionType === 'appointive') {
        eligFormData.appointingAuthority = document.getElementById('elig-appointing_authority').value.trim();
        eligFormData.appointmentFrom = document.getElementById('elig-appointment_from').value;
        eligFormData.appointmentTo = document.getElementById('elig-appointment_to').value;
        eligFormData.yearsInService = document.getElementById('elig-years_in_service').value;
        eligFormData.appointingPunongBarangay = document.getElementById('elig-appointing_punong_barangay').value.trim();
        eligFormData.pbDateElected = document.getElementById('elig-pb_date_elected').value;
        eligFormData.pbYearsService = document.getElementById('elig-pb_years_service').value;
    }
    
    if (eligCurrentStep === 'elig-step2' && eligPositionType === 'elective') {
        eligFormData.positionHeld = document.getElementById('elig-position_held').value;
        eligFormData.electionFrom = document.getElementById('elig-election_from').value;
        eligFormData.electionTo = document.getElementById('elig-election_to').value;
        eligFormData.termOffice = document.getElementById('elig-term_office').value.trim();
        const completedTerm = document.querySelector('input[name="completed_term"]:checked');
        eligFormData.completedTerm = completedTerm ? completedTerm.value : '';
        if (eligFormData.completedTerm === 'no') {
            eligFormData.incompleteReason = document.getElementById('elig-incomplete_reason_text')?.value.trim() || '';
        }
    }
    
    if (eligCurrentStep === 'elig-step3') {
        const certifier = document.querySelector('input[name="certifier"]:checked');
        eligFormData.certifier = certifier ? certifier.value : '';
    }
    
    if (eligCurrentStep === 'elig-step4') {
        eligFormData.idFront = document.getElementById('elig-idFront').files[0];
        eligFormData.idBack = document.getElementById('elig-idBack').files[0];
    }
    
    if (eligCurrentStep === 'elig-step5') {
        eligFormData.signature = eligSignatureCanvas.toDataURL();
    }
}

// ===== POPULATE PREVIEW =====
function populatePreview() {
    const fullName = `${eligFormData.firstName} ${eligFormData.middleInitial ? eligFormData.middleInitial + '.' : ''} ${eligFormData.lastName}`;
    
    document.getElementById('elig-preview-name').textContent = fullName;
    document.getElementById('elig-preview-email').textContent = eligFormData.email;
    document.getElementById('elig-preview-position-type').textContent = eligPositionType === 'appointive' ? 'Appointive Position' : 'Elective Position';
    document.getElementById('elig-preview-barangay').textContent = eligFormData.barangay;
    
    if (eligPositionType === 'appointive') {
        document.getElementById('elig-preview-appointive').style.display = 'block';
        document.getElementById('elig-preview-elective').style.display = 'none';
        document.getElementById('elig-preview-appointing-authority').textContent = eligFormData.appointingAuthority;
        document.getElementById('elig-preview-appointment-period').textContent = `${eligFormData.appointmentFrom} to ${eligFormData.appointmentTo}`;
        document.getElementById('elig-preview-years-service').textContent = eligFormData.yearsInService;
    } else {
        document.getElementById('elig-preview-appointive').style.display = 'none';
        document.getElementById('elig-preview-elective').style.display = 'block';
        document.getElementById('elig-preview-position-held').textContent = eligFormData.positionHeld;
        document.getElementById('elig-preview-election-period').textContent = `${eligFormData.electionFrom} to ${eligFormData.electionTo}`;
        document.getElementById('elig-preview-term-completed').textContent = eligFormData.completedTerm === 'yes' ? 'Yes' : `No - ${eligFormData.incompleteReason || 'Not specified'}`;
    }
    
    const certifierLabels = {
        'punong_barangay': 'Punong Barangay',
        'dilg_municipality': 'DILG - Municipality',
        'dilg_provincial': 'DILG - Provincial',
        'dilg_regional': 'DILG - Regional'
    };
    document.getElementById('elig-preview-certifier').textContent = certifierLabels[eligFormData.certifier] || eligFormData.certifier;
}

// ===== FORM VALIDATION =====
function setupEligValidation() {
    // Step 1 validation
    ['elig-last_name', 'elig-first_name', 'elig-barangay', 'elig-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => updateEligValidation());
            el.addEventListener('change', () => updateEligValidation());
        }
    });

    // Step 2 appointive validation
    ['elig-appointing_authority', 'elig-appointing_punong_barangay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => updateEligValidation());
    });
    
    // Appointment dates with auto-calculation
    const appointmentFrom = document.getElementById('elig-appointment_from');
    const appointmentTo = document.getElementById('elig-appointment_to');
    if (appointmentFrom) {
        appointmentFrom.addEventListener('change', () => {
            calculateYearsInService();
            updateEligValidation();
        });
    }
    if (appointmentTo) {
        appointmentTo.addEventListener('change', () => {
            calculateYearsInService();
            updateEligValidation();
        });
    }
    
    // PB date elected with auto-calculation
    const pbDateElected = document.getElementById('elig-pb_date_elected');
    if (pbDateElected) {
        pbDateElected.addEventListener('change', () => {
            calculatePBYearsService();
            updateEligValidation();
        });
    }

    // Step 2 elective validation
    ['elig-position_held', 'elig-election_from', 'elig-election_to'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
            updateEligValidation();
            if (id === 'elig-election_from' || id === 'elig-election_to') {
                calculateTermOffice();
            }
        });
    });

    // Radio buttons for term completion
    const termRadios = document.querySelectorAll('input[name="completed_term"]');
    termRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const incompleteReason = document.getElementById('elig-incomplete-reason');
            if (this.value === 'no') {
                incompleteReason.style.display = 'block';
            } else {
                incompleteReason.style.display = 'none';
            }
            updateEligValidation();
        });
    });

    // Step 3 certifier validation
    const certifiers = document.querySelectorAll('input[name="certifier"]');
    certifiers.forEach(radio => {
        radio.addEventListener('change', () => updateEligValidation());
    });

    // Step 4 ID uploads
    const idFront = document.getElementById('elig-idFront');
    const idBack = document.getElementById('elig-idBack');
    if (idFront) {
        idFront.addEventListener('change', function() {
            previewEligImage(this, 'elig-frontPreview');
            updateEligValidation();
        });
    }
    if (idBack) {
        idBack.addEventListener('change', function() {
            previewEligImage(this, 'elig-backPreview');
            updateEligValidation();
        });
    }
}

// ===== AUTO-CALCULATION FUNCTIONS =====
function calculateYears(fromDate, toDate) {
    if (!fromDate || !toDate) return '0.0';
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    // ✅ FIXED: Always return string with exactly 1 decimal place
    return (Math.round(diffYears * 10) / 10).toFixed(1);
}

function setupAppointiveCalculations() {
    const appointmentFrom = document.getElementById('elig-appointment_from');
    const appointmentTo = document.getElementById('elig-appointment_to');
    const yearsInService = document.getElementById('elig-years_in_service');
    const pbDateElected = document.getElementById('elig-pb_date_elected');
    const pbYearsService = document.getElementById('elig-pb_years_service');
    
    if (appointmentFrom && appointmentTo && yearsInService) {
        const calculateAppointmentYears = () => {
            if (appointmentFrom.value && appointmentTo.value) {
                const years = calculateYears(appointmentFrom.value, appointmentTo.value);
                // ✅ FIXED: Store as plain decimal number (no " yrs" suffix)
                yearsInService.value = years;
                updateEligValidation();
            }
        };
        
        appointmentFrom.addEventListener('change', calculateAppointmentYears);
        appointmentTo.addEventListener('change', calculateAppointmentYears);
    }
    
    if (pbDateElected && pbYearsService) {
        pbDateElected.addEventListener('change', () => {
            if (pbDateElected.value) {
                const today = new Date().toISOString().split('T')[0];
                const years = calculateYears(pbDateElected.value, today);
                // ✅ FIXED: Store as plain decimal number (no " yrs" suffix)
                pbYearsService.value = years;
                updateEligValidation();
            }
        });
    }
}

function calculateYearsInService() {
    const appointmentFrom = document.getElementById('elig-appointment_from')?.value;
    const appointmentTo = document.getElementById('elig-appointment_to')?.value;
    const yearsInService = document.getElementById('elig-years_in_service');
    
    if (appointmentFrom && appointmentTo && yearsInService) {
        const years = calculateYears(appointmentFrom, appointmentTo);
        // Store as plain number without suffix for backend compatibility
        yearsInService.value = years;
    }
}

function calculatePBYearsService() {
    const pbDateElected = document.getElementById('elig-pb_date_elected')?.value;
    const pbYearsService = document.getElementById('elig-pb_years_service');
    
    if (pbDateElected && pbYearsService) {
        const today = new Date().toISOString().split('T')[0];
        const years = calculateYears(pbDateElected, today);
        // Store as plain number without suffix for backend compatibility
        pbYearsService.value = years;
    }
}

function setupElectiveCalculations() {
    const electionFrom = document.getElementById('elig-election_from');
    const electionTo = document.getElementById('elig-election_to');
    const termOffice = document.getElementById('elig-term_office');
    
    if (electionFrom && electionTo && termOffice) {
        const calculateTerm = () => {
            if (electionFrom.value && electionTo.value) {
                const fromDate = new Date(electionFrom.value);
                const toDate = new Date(electionTo.value);
                const fromFormatted = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const toFormatted = toDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                termOffice.value = `${fromFormatted} - ${toFormatted}`;
                updateEligValidation();
            }
        };
        
        electionFrom.addEventListener('change', calculateTerm);
        electionTo.addEventListener('change', calculateTerm);
    }
}

function calculateTermOffice() {
    const electionFrom = document.getElementById('elig-election_from')?.value;
    const electionTo = document.getElementById('elig-election_to')?.value;
    const termOffice = document.getElementById('elig-term_office');
    
    if (electionFrom && electionTo && termOffice) {
        const fromDate = new Date(electionFrom);
        const toDate = new Date(electionTo);
        const fromFormatted = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const toFormatted = toDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        termOffice.value = `${fromFormatted} - ${toFormatted}`;
    }
}

function updateEligValidation() {
    if (eligCurrentStep === 'elig-step1') {
        const lastName = document.getElementById('elig-last_name')?.value.trim();
        const firstName = document.getElementById('elig-first_name')?.value.trim();
        const barangay = document.getElementById('elig-barangay')?.value.trim();
        const email = document.getElementById('elig-email')?.value.trim();
        const isValid = lastName && firstName && barangay && email;
        const nextBtn = document.getElementById('elig-step1-next');
        if (nextBtn) nextBtn.disabled = !isValid;
    }
    
    if (eligCurrentStep === 'elig-step2' && eligPositionType === 'appointive') {
        const appointingAuthority = document.getElementById('elig-appointing_authority')?.value.trim();
        const appointmentFrom = document.getElementById('elig-appointment_from')?.value;
        const appointmentTo = document.getElementById('elig-appointment_to')?.value;
        const yearsInService = document.getElementById('elig-years_in_service')?.value.trim();
        const appointingPB = document.getElementById('elig-appointing_punong_barangay')?.value.trim();
        const pbDateElected = document.getElementById('elig-pb_date_elected')?.value;
        const pbYearsService = document.getElementById('elig-pb_years_service')?.value.trim();
        
        const isValid = appointingAuthority && appointmentFrom && appointmentTo && yearsInService && 
                       appointingPB && pbDateElected && pbYearsService;
        const nextBtn = document.getElementById('elig-step2-appointive-next');
        if (nextBtn) nextBtn.disabled = !isValid;
    }
    
    if (eligCurrentStep === 'elig-step2' && eligPositionType === 'elective') {
        const positionHeld = document.getElementById('elig-position_held')?.value;
        const electionFrom = document.getElementById('elig-election_from')?.value;
        const electionTo = document.getElementById('elig-election_to')?.value;
        const termCompleted = document.querySelector('input[name="completed_term"]:checked');
        
        let isValid = positionHeld && electionFrom && electionTo && termCompleted;
        
        if (termCompleted?.value === 'no') {
            const reason = document.getElementById('elig-incomplete_reason_text')?.value.trim();
            isValid = isValid && reason;
        }
        
        const nextBtn = document.getElementById('elig-step2-elective-next');
        if (nextBtn) nextBtn.disabled = !isValid;
    }
    
    if (eligCurrentStep === 'elig-step3') {
        const certifier = document.querySelector('input[name="certifier"]:checked');
        const nextBtn = document.getElementById('elig-step3-next');
        if (nextBtn) nextBtn.disabled = !certifier;
    }
    
    if (eligCurrentStep === 'elig-step4') {
        const idFront = document.getElementById('elig-idFront')?.files.length > 0;
        const idBack = document.getElementById('elig-idBack')?.files.length > 0;
        const nextBtn = document.getElementById('elig-step4-next');
        if (nextBtn) nextBtn.disabled = !(idFront && idBack);
    }
    
    if (eligCurrentStep === 'elig-step5') {
        const nextBtn = document.getElementById('elig-step5-next');
        if (nextBtn) nextBtn.disabled = !eligHasSignature;
    }
}

function previewEligImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 8px; border: 2px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ===== SIGNATURE FUNCTIONS =====
function eligStartDrawing(e) {
    eligIsDrawing = true;
    const rect = eligSignatureCanvas.getBoundingClientRect();
    eligSignatureCtx.beginPath();
    eligSignatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    const placeholder = document.getElementById('elig-placeholder');
    if (placeholder) placeholder.style.display = 'none';
}

function eligDraw(e) {
    if (!eligIsDrawing) return;
    const rect = eligSignatureCanvas.getBoundingClientRect();
    eligSignatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    eligSignatureCtx.stroke();
    eligHasSignature = true;
    updateEligSignatureStatus();
    updateEligValidation();
}

function eligStopDrawing() {
    if (eligIsDrawing) {
        eligIsDrawing = false;
    }
}

function eligHandleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    eligSignatureCanvas.dispatchEvent(mouseEvent);
}

function eligHandleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    eligSignatureCanvas.dispatchEvent(mouseEvent);
}

window.eligClearSignature = function() {
    eligSignatureCtx.clearRect(0, 0, eligSignatureCanvas.width, eligSignatureCanvas.height);
    eligHasSignature = false;
    const placeholder = document.getElementById('elig-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    updateEligSignatureStatus();
    updateEligValidation();
};

function updateEligSignatureStatus() {
    const statusBox = document.getElementById('elig-signature-status-box');
    const statusText = document.getElementById('elig-statusText');
    const statusDot = document.getElementById('elig-statusDot');
    const canvasWrapper = document.getElementById('elig-canvasWrapper');
    
    if (eligHasSignature) {
        if (statusBox) statusBox.classList.add('has-signature');
        if (statusText) statusText.textContent = 'Signature captured';
        if (statusDot) statusDot.style.backgroundColor = '#10b981';
        if (canvasWrapper) canvasWrapper.classList.add('has-signature');
    } else {
        if (statusBox) statusBox.classList.remove('has-signature');
        if (statusText) statusText.textContent = 'No signature drawn';
        if (statusDot) statusDot.style.backgroundColor = '#e5e7eb';
        if (canvasWrapper) canvasWrapper.classList.remove('has-signature');
    }
}

// ===== SUBMIT FORM (TO PREVIEW) =====
window.eligSubmitForm = function() {
    saveCurrentStepData();
    showEligStep('elig-step6');
    populatePreview();
};

// ===== FINAL SUBMIT (TO BACKEND) =====
window.eligFinalSubmit = function() {
    console.log('Final submission started');
    
    const submitData = new FormData();
    submitData.append('last_name', eligFormData.lastName || '');
    submitData.append('first_name', eligFormData.firstName || '');
    submitData.append('middle_initial', eligFormData.middleInitial || '');
    submitData.append('barangay', eligFormData.barangay || '');
    submitData.append('email', eligFormData.email || '');
    submitData.append('position_type', eligPositionType || '');

    if (eligPositionType === 'appointive') {
        submitData.append('appointing_authority', eligFormData.appointingAuthority || '');
        submitData.append('appointment_from', eligFormData.appointmentFrom || '');
        submitData.append('appointment_to', eligFormData.appointmentTo || '');
        submitData.append('years_in_service', eligFormData.yearsInService || '');
        submitData.append('appointing_punong_barangay', eligFormData.appointingPunongBarangay || '');
        submitData.append('pb_date_elected', eligFormData.pbDateElected || '');
        submitData.append('pb_years_service', eligFormData.pbYearsService || '');
    }
    
    if (eligPositionType === 'elective') {
        submitData.append('position_held', eligFormData.positionHeld || '');
        submitData.append('election_from', eligFormData.electionFrom || '');
        submitData.append('election_to', eligFormData.electionTo || '');
        submitData.append('term_office', eligFormData.termOffice || '');
        submitData.append('completed_term', eligFormData.completedTerm || '');
        submitData.append('incomplete_reason', eligFormData.incompleteReason || '');
    }
    
    submitData.append('certifier', eligFormData.certifier || '');
    
    if (eligFormData.idFront) submitData.append('id_front', eligFormData.idFront);
    if (eligFormData.idBack) submitData.append('id_back', eligFormData.idBack);
    
    // Disable submit button
    const finishBtn = document.querySelector('#elig-step6 .elig-next-btn');
    if (finishBtn) {
        finishBtn.textContent = 'Submitting...';
        finishBtn.disabled = true;
    }
    
    // Convert signature canvas to blob and submit
    if (eligSignatureCanvas && eligHasSignature) {
        eligSignatureCanvas.toBlob(function(blob) {
            if (blob) {
                submitData.append('signature', blob, 'signature.png');
            }
            
            const csrfToken = getCookie('csrftoken');
            
            if (!csrfToken) {
                showAlert('error', 'Error', 'Security token not found. Please refresh the page and try again.');
                if (finishBtn) {
                    finishBtn.textContent = 'Submit Application';
                    finishBtn.disabled = false;
                }
                return;
            }
            
            // Submit to Django backend
            fetch('/submit_eligibility_request/', {
                method: 'POST',
                body: submitData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.success) {
                    showEligStep('elig-success');
                    showNotification('Application submitted successfully! Check your email for confirmation.', 'success');
                } else {
                    showAlert('error', 'Submission Failed', data.error || 'Please try again.');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                showAlert('error', 'Connection Error', 'Please check your connection and try again.');
            })
            .finally(() => {
                if (finishBtn) {
                    finishBtn.textContent = 'Submit Application';
                    finishBtn.disabled = false;
                }
            });
        }, 'image/png');
    } else {
        showAlert('error', 'Missing Signature', 'Please ensure you have drawn a signature before submitting.');
        if (finishBtn) {
            finishBtn.textContent = 'Submit Application';
            finishBtn.disabled = false;
        }
    }
};

// ===== VIEW CERTIFICATE =====
window.eligShowCertificate = function() {
    if (eligPositionType === 'appointive') {
        populateAppointiveCertificate();
        showEligStep('elig-certificate-appointive');
    } else {
        populateElectiveCertificate();
        showEligStep('elig-certificate-elective');
    }
};

// ===== POPULATE APPOINTIVE CERTIFICATE =====
function populateAppointiveCertificate() {
    const fullName = `${eligFormData.firstName} ${eligFormData.middleInitial ? eligFormData.middleInitial + '. ' : ''}${eligFormData.lastName}`;
    
    document.getElementById('cert-app-full-name').textContent = fullName.toUpperCase();
    document.getElementById('cert-app-barangay').textContent = eligFormData.barangay;
    document.getElementById('cert-app-full-name-2').textContent = fullName.toUpperCase();
    document.getElementById('cert-app-appointment-date').textContent = eligFormData.appointmentFrom || 'N/A';
    document.getElementById('cert-app-date-from').textContent = eligFormData.appointmentFrom || 'N/A';
    document.getElementById('cert-app-date-to').textContent = eligFormData.appointmentTo || 'N/A';
    document.getElementById('cert-app-years-served').textContent = eligFormData.yearsInService || 'N/A';
    document.getElementById('cert-app-pb-name').textContent = eligFormData.appointingPunongBarangay || 'N/A';
    document.getElementById('cert-app-pb-date').textContent = eligFormData.pbDateElected || 'N/A';
    document.getElementById('cert-app-pb-years').textContent = eligFormData.pbYearsService || 'N/A';
    
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('cert-app-date').textContent = today.toLocaleDateString('en-US', options);
}

// ===== POPULATE ELECTIVE CERTIFICATE =====
function populateElectiveCertificate() {
    const fullName = `${eligFormData.firstName} ${eligFormData.middleInitial ? eligFormData.middleInitial + '. ' : ''}${eligFormData.lastName}`;
    
    document.getElementById('cert-elec-name-full').textContent = fullName.toUpperCase();
    document.getElementById('cert-elec-brgy-name').textContent = eligFormData.barangay;
    document.getElementById('cert-elec-name-full-2').textContent = fullName.toUpperCase();
    
    document.getElementById('cert-elec-pos').textContent = eligFormData.positionHeld || 'N/A';
    document.getElementById('cert-elec-election-date').textContent = eligFormData.electionFrom || 'N/A';
    
    // Calculate term of office in years
    if (eligFormData.electionFrom && eligFormData.electionTo) {
        const years = calculateYears(eligFormData.electionFrom, eligFormData.electionTo);
        document.getElementById('cert-elec-term-years').textContent = years;
    } else {
        document.getElementById('cert-elec-term-years').textContent = 'N/A';
    }
    
    document.getElementById('cert-elec-from').textContent = eligFormData.electionFrom || 'N/A';
    document.getElementById('cert-elec-to').textContent = eligFormData.electionTo || 'N/A';
    
    // Handle completed term checkboxes
    const termCompleted = eligFormData.completedTerm;
    const yesCheck = document.getElementById('cert-elec-check-yes');
    const noCheck = document.getElementById('cert-elec-check-no');
    const successionCheck = document.getElementById('cert-elec-check-succession');
    const reasonBox = document.getElementById('cert-elec-reason-box');
    const reasonDetail = document.getElementById('cert-elec-reason-detail');
    
    // Clear all checks first
    yesCheck.textContent = '';
    noCheck.textContent = '';
    successionCheck.textContent = '';
    
    if (termCompleted === 'yes') {
        yesCheck.textContent = '✓';
        if (reasonBox) reasonBox.style.display = 'none';
    } else {
        noCheck.textContent = '✓';
        if (reasonBox && eligFormData.incompleteReason) {
            reasonBox.style.display = 'block';
            reasonDetail.textContent = eligFormData.incompleteReason;
        }
    }
    
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('cert-elec-current-date').textContent = today.toLocaleDateString('en-US', options);
}

// ===== BACK TO SUCCESS =====
window.eligBackToSuccess = function() {
    showEligStep('elig-success');
};

// ===== PRINT CERTIFICATE =====
window.eligPrintCertificate = function() {
    window.print();
};

// ===== RESTART PROCESS =====
window.eligRestartProcess = function() {
    eligPositionType = null;
    eligFormData = {};
    eligHasSignature = false;
    
    // Reset all forms
    document.querySelectorAll('#eligibility-page form').forEach(form => form.reset());
    
    // Clear signature
    if (eligSignatureCtx) {
        eligSignatureCtx.clearRect(0, 0, eligSignatureCanvas.width, eligSignatureCanvas.height);
    }
    
    // Clear image previews
    const frontPreview = document.getElementById('elig-frontPreview');
    const backPreview = document.getElementById('elig-backPreview');
    if (frontPreview) frontPreview.innerHTML = '';
    if (backPreview) backPreview.innerHTML = '';
    
    showEligStep('elig-intro');
};

// ===== EXPORT FUNCTIONS =====
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;

console.log('Barangay Dashboard JavaScript loaded successfully with Sidebar Profile');













// REQUIREMENTS MONITORING DASHBOARD
// ============================================
// GLOBAL STATE
// ============================================
const state = {
    currentPage: 'dashboard',
    currentPeriod: 'weekly',
    currentWeek: 1,
    currentSubmissionId: null,
    currentSubmissionData: null,
    eligibilityFormData: {},
    eligibilityPositionType: null,
    barangayId: window.barangayData?.id || null,
    barangayName: window.barangayData?.name || ''
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Barangay Dashboard Initializing...');
    console.log('Barangay:', state.barangayName, 'ID:', state.barangayId);
    
    initNavigation();
    initProfileMenu();
    initDashboardCharts();
    initRequirementsMonitoring();
});

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageName) {
    console.log('📄 Switching to page:', pageName);
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${pageName}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
        state.currentPage = pageName;
        
        // Reset requirements page to welcome screen when switching away
        if (pageName !== 'requirements') {
            hideAllRequirementsViews();
            showElement('requirements-welcome');
        }
    }
}

// ============================================
// PROFILE MENU
// ============================================
function initProfileMenu() {
    const profileBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileDropdownMenu');
    
    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target) && e.target !== profileBtn) {
                dropdown.classList.remove('active');
            }
        });
    }
}

// ============================================
// DASHBOARD CHARTS
// ============================================
function initDashboardCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping charts');
        return;
    }
    
    const chartIds = ['totalChart', 'completedChart', 'pendingChart', 'overdueChart'];
    
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const dataKey = chartId.replace('Chart', '');
        const data = window.chartData?.[dataKey] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', '', '', '', '', '', ''],
                datasets: [{
                    data: data,
                    borderColor: getChartColor(chartId),
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: getChartGradient(ctx, chartId),
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    });
}

function getChartColor(chartId) {
    const colors = {
        totalChart: '#3b82f6',
        completedChart: '#10b981',
        pendingChart: '#f59e0b',
        overdueChart: '#ef4444'
    };
    return colors[chartId] || '#3b82f6';
}

function getChartGradient(ctx, chartId) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 50);
    const color = getChartColor(chartId);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
}

// ============================================
// REQUIREMENTS MONITORING
// ============================================
function initRequirementsMonitoring() {
    console.log('📋 Initializing Requirements Monitoring...');
    
    // Get Started button
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            hideAllRequirementsViews();
            showElement('requirements-monitoring');
            loadRequirements();
        });
    }
    
    // Back buttons
    const backToWelcome = document.getElementById('backToWelcome');
    if (backToWelcome) {
        backToWelcome.addEventListener('click', function() {
            hideAllRequirementsViews();
            showElement('requirements-welcome');
        });
    }
    
    const backToList = document.getElementById('backToList');
    if (backToList) {
        backToList.addEventListener('click', function() {
            hideAllRequirementsViews();
            showElement('requirements-monitoring');
        });
    }
    
    // Filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            state.currentPeriod = this.dataset.period;
            
            // Reset week to 1 when switching periods
            state.currentWeek = 1;
            updateWeekDisplay();
            
            // ✅ OPTION 1: Show week selector ONLY for weekly period
            const weekSelector = document.getElementById('weekSelector');
            if (weekSelector) {
                if (state.currentPeriod === 'weekly') {
                    weekSelector.style.display = 'flex';
                } else {
                    // Hide for monthly/quarterly/semestral/annually
                    weekSelector.style.display = 'none';
                }
            }
            
            loadRequirements();
        });
    });
    // Week navigation
    const prevWeek = document.getElementById('prevWeek');
    const nextWeek = document.getElementById('nextWeek');
    
    if (prevWeek) {
        prevWeek.addEventListener('click', function() {
            if (state.currentWeek > 1) {
                state.currentWeek--;
                updateWeekDisplay();
                loadRequirements();
            }
        });
    }
    
    if (nextWeek) {
        nextWeek.addEventListener('click', function() {
            if (state.currentWeek < 52) {
                state.currentWeek++;
                updateWeekDisplay();
                loadRequirements();
            }
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').classList.add('fa-spin');
            loadRequirements().finally(() => {
                this.querySelector('i').classList.remove('fa-spin');
            });
        });
    }
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadRequirements(this.value);
            }, 300);
        });
    }
    
    // File upload
    initFileUpload();
    
    // Detail page actions
    const saveUpdateBtn = document.getElementById('saveUpdateBtn');
    if (saveUpdateBtn) {
        saveUpdateBtn.addEventListener('click', saveUpdate);
    }
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitToAdmin);
    }
}

// ============================================
// REQUIREMENTS LOADING
// ============================================
async function loadRequirements(searchQuery = '') {
    if (!state.barangayId) {
        console.error('❌ No barangay assigned');
        const listContainer = document.getElementById('requirementsList');
        listContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No barangay assigned to your account</p>
                <p class="text-muted">Please contact DILG Admin to assign a barangay.</p>
            </div>
        `;
        return;
    }
    
    console.log('📥 Loading requirements:', {
        barangayId: state.barangayId,
        period: state.currentPeriod,
        week: state.currentWeek,
        search: searchQuery
    });
    
    const listContainer = document.getElementById('requirementsList');
    listContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading requirements...</p></div>';
    
    try {
        // ✅ FIXED: Use barangay-specific API endpoint
        const params = new URLSearchParams({
            period: state.currentPeriod,
            week: state.currentWeek,
            search: searchQuery
        });
        
        // Note: The backend will automatically filter by logged-in user's barangay
        const response = await fetch(`/api/requirements/list/?${params}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Server returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            renderRequirements(data.submissions || []);
        } else {
            throw new Error(data.error || 'Failed to load requirements');
        }
    } catch (error) {
        console.error('❌ Load error:', error);
        listContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load requirements</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadRequirements()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderRequirements(submissions) {
    const listContainer = document.getElementById('requirementsList');
    
    if (!submissions || submissions.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Requirements Found</h3>
                <p>There are no ${state.currentPeriod} requirements for ${state.currentPeriod === 'weekly' ? 'week ' + state.currentWeek : 'this period'}</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = submissions.map(sub => `
        <div class="requirement-card" onclick="viewRequirement(${sub.id})">
            <div class="card-header">
                <h3>${escapeHtml(sub.title)}</h3>
                <span class="status-badge status-${sub.status}">${sub.status_display}</span>
            </div>
            <div class="card-body">
                <p>${escapeHtml(sub.description)}</p>
                <div class="card-meta">
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        Due: ${sub.due_date}
                    </span>
                    ${sub.is_overdue ? '<span class="meta-item overdue"><i class="fas fa-exclamation-circle"></i> Overdue</span>' : ''}
                </div>
            </div>
            <div class="card-footer">
                <span class="last-update">
                    <i class="fas fa-clock"></i>
                    Updated ${sub.last_update}
                </span>
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `).join('');
}

// ============================================
// REQUIREMENT DETAIL
// ============================================
async function viewRequirement(submissionId) {
    console.log('👁️ Viewing requirement:', submissionId);
    
    state.currentSubmissionId = submissionId;
    
    hideAllRequirementsViews();
    showElement('requirements-detail');
    
    // Show loading state
    document.getElementById('detailTitle').textContent = 'Loading...';
    
    try {
        const response = await fetch(`/api/requirements/submission/${submissionId}/`, {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderRequirementDetail(data.submission);
            state.currentSubmissionData = data.submission;
        } else {
            throw new Error(data.error || 'Failed to load details');
        }
    } catch (error) {
        console.error('❌ Load detail error:', error);
        showError('Failed to load requirement details');
    }
}

function renderRequirementDetail(submission) {
    document.getElementById('detailTitle').textContent = submission.title;
    document.getElementById('detailDescription').textContent = submission.description;
    document.getElementById('detailDueDate').textContent = submission.due_date;
    
    const statusBadge = document.getElementById('detailStatus');
    statusBadge.textContent = submission.status_display;
    statusBadge.className = `status-badge status-${submission.status}`;
    
    // Set update text
    const updateText = document.getElementById('updateText');
    if (updateText) {
        updateText.value = submission.update_text || '';
    }
    
    // Render attachments
    renderAttachments(submission.attachments || []);
    
    // Disable submit if already accomplished/approved
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = ['accomplished', 'approved'].includes(submission.status);
    }
}

function renderAttachments(attachments) {
    const fileList = document.getElementById('fileList');
    
    if (!attachments || attachments.length === 0) {
        fileList.innerHTML = '<p class="text-muted">No attachments yet</p>';
        return;
    }
    
    fileList.innerHTML = attachments.map(att => `
        <div class="file-item" data-file-id="${att.id}">
            <div class="file-icon">
                <i class="fas fa-${getFileIcon(att.file_name)}"></i>
            </div>
            <div class="file-info">
                <span class="file-name">${escapeHtml(att.file_name)}</span>
                <span class="file-size">${att.file_size} KB</span>
            </div>
            <button class="btn-remove" onclick="removeFile(${att.id}, event)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: 'file-pdf',
        doc: 'file-word',
        docx: 'file-word',
        xls: 'file-excel',
        xlsx: 'file-excel',
        jpg: 'file-image',
        jpeg: 'file-image',
        png: 'file-image',
        gif: 'file-image'
    };
    return icons[ext] || 'file';
}

// ============================================
// FILE UPLOAD
// ============================================
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    if (!fileInput || !uploadArea) return;
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // File input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
}

async function handleFiles(files) {
    if (!state.currentSubmissionId) {
        showError('No submission selected');
        return;
    }
    
    for (const file of files) {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    console.log('📤 Uploading:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`/api/requirements/submission/${state.currentSubmissionId}/upload/`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Upload successful');
            showSuccess('File uploaded successfully');
            
            // Refresh attachments
            viewRequirement(state.currentSubmissionId);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        showError(`Failed to upload ${file.name}: ${error.message}`);
    }
}

async function removeFile(attachmentId, event) {
    event.stopPropagation();
    
    if (!confirm('Remove this file?')) return;
    
    try {
        const response = await fetch(`/api/requirements/attachment/${attachmentId}/delete/`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('File removed');
            viewRequirement(state.currentSubmissionId);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Remove error:', error);
        showError('Failed to remove file');
    }
}

// ============================================
// SAVE UPDATE
// ============================================
async function saveUpdate() {
    const updateText = document.getElementById('updateText').value.trim();
    
    if (!updateText) {
        showError('Please enter an update');
        return;
    }
    
    if (!state.currentSubmissionId) {
        showError('No submission selected');
        return;
    }
    
    try {
        const response = await fetch(`/api/requirements/submission/${state.currentSubmissionId}/update/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ update_text: updateText }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Update saved');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Save error:', error);
        showError('Failed to save update');
    }
}

// ============================================
// SUBMIT TO ADMIN
// ============================================
async function submitToAdmin() {
    if (!state.currentSubmissionId) {
        showError('No submission selected');
        return;
    }
    
    if (!confirm('Submit this requirement to admin for review?')) {
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const response = await fetch(`/api/requirements/submission/${state.currentSubmissionId}/submit/`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                update_text: document.getElementById('updateText').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Requirement submitted successfully!');
            
            // Go back to list after short delay
            setTimeout(() => {
                hideAllRequirementsViews();
                showElement('requirements-monitoring');
                loadRequirements();
            }, 1500);
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (error) {
        console.error('❌ Submit error:', error);
        showError('Failed to submit: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function hideAllRequirementsViews() {
    ['requirements-welcome', 'requirements-monitoring', 'requirements-detail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

function updateWeekDisplay() {
    const weekNum = document.getElementById('currentWeekNum');
    if (weekNum) {
        weekNum.textContent = state.currentWeek;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showError(message) {
    alert('❌ Error: ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Make viewSubmission available globally for dashboard table
window.viewSubmission = function(submissionId) {
    switchPage('requirements');
    hideAllRequirementsViews();
    showElement('requirements-monitoring');
    setTimeout(() => {
        viewRequirement(submissionId);
    }, 100);
};

console.log('✅ Barangay Dashboard JavaScript Loaded');


// ===== GLOBAL CHART INSTANCES =====
let requirementsTrendChart = null;
let requirementTypeChart = null;

// ===== SINGLE INITIALIZATION POINT =====
document.addEventListener('DOMContentLoaded', function() {
    if (dashboardInitialized) {
        console.log('⚠️ Dashboard already initialized, skipping...');
        return;
    }
    dashboardInitialized = true;
    
    console.log('🚀 Barangay Dashboard Initializing...');
    
    // Your existing initializations
    initializeNavigation();
    initializeUserMenu();
    initializeStatCards();
    initEligibilityForm();
    initializeSidebarProfile();
    
    // ADD THIS: Initialize charts
    initDashboardCharts();
    
    // ADD THIS: Initialize requirements monitoring  
    initRequirementsMonitoring();
    initEligibilityRadarChart();
});

// ===== DASHBOARD CHARTS =====
function initDashboardCharts() {
    console.log('📊 Initializing dashboard charts...');
    
    // Destroy existing charts if they exist
    if (requirementsTrendChart) {
        requirementsTrendChart.destroy();
        requirementsTrendChart = null;
    }
    
    if (requirementTypeChart) {
        requirementTypeChart.destroy();
        requirementTypeChart = null;
    }
    
    // Initialize Time Scale Combo Chart
    initTimeScaleComboChart();
    
    // Initialize Pie Chart
    initRequirementTypeChart();
    initEligibilityRadarChart();
}

// ===== TIME SCALE COMBO CHART =====
async function initTimeScaleComboChart() {
    const canvas = document.getElementById('requirementsTrendChart');
    if (!canvas) {
        console.warn('⚠️ Requirements trend chart canvas not found');
        return;
    }
    
    console.log('📈 Initializing Time Scale Combo Chart...');
    const ctx = canvas.getContext('2d');
    
    try {
        // Fetch real data from backend
        const data = await fetchTrendData(30);
        
        // Convert string dates to Date objects
        const labels = data.labels.map(dateStr => new Date(dateStr));
        
        const chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Completed',
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1,
                        data: data.completed,
                        order: 2
                    },
                    {
                        type: 'bar',
                        label: 'Pending',
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: 'rgb(245, 158, 11)',
                        borderWidth: 1,
                        data: data.pending,
                        order: 3
                    },
                    {
                        type: 'line',
                        label: 'Total',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 3,
                        fill: true,
                        data: data.total,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            },
                            tooltipFormat: 'MMM d, yyyy'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            source: 'auto',
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        };
        
        requirementsTrendChart = new Chart(ctx, chartConfig);
        console.log('✅ Time Scale Chart initialized successfully');
        
    } catch (error) {
        console.error('❌ Error loading chart:', error);
        showChartError(canvas, 'Failed to load chart data');
    }
}

// ===== RADAR CHART - REQUIREMENTS BY TYPE =====
async function initRequirementTypeChart() {
    const canvas = document.getElementById('requirementTypeChart');
    if (!canvas) {
        console.warn('⚠️ [REQUIREMENTS] Canvas not found');
        return;
    }
    
    console.log('📊 [REQUIREMENTS] Initializing Radar Chart...');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing
    if (requirementTypeChart) {
        requirementTypeChart.destroy();
    }
    
    try {
        // ✅ CORRECT: Call requirements radar endpoint
        console.log('📡 [REQUIREMENTS] Fetching from /api/requirements/radar-chart/');
        
        const response = await fetch('/api/requirements/radar-chart/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch data');
        }
        
        console.log('✅ [REQUIREMENTS] Radar chart data loaded:', data);
        
        // Create RADAR chart
        requirementTypeChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.labels, // Months from backend
                datasets: [
                    {
                        label: 'Weekly',
                        data: data.weekly,
                        fill: true,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgb(255, 99, 132)',
                        pointBackgroundColor: 'rgb(255, 99, 132)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Monthly',
                        data: data.monthly,
                        fill: true,
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderColor: 'rgb(255, 159, 64)',
                        pointBackgroundColor: 'rgb(255, 159, 64)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Quarterly',
                        data: data.quarterly,
                        fill: true,
                        backgroundColor: 'rgba(255, 205, 86, 0.2)',
                        borderColor: 'rgb(255, 205, 86)',
                        pointBackgroundColor: 'rgb(255, 205, 86)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Semestral',
                        data: data.semestral,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgb(75, 192, 192)',
                        pointBackgroundColor: 'rgb(75, 192, 192)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Annual',
                        data: data.annually,
                        fill: true,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgb(54, 162, 235)',
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5,
                            font: { size: 10 }
                        },
                        pointLabels: {
                            font: { size: 11, weight: '600' }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Legend is in HTML
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.r + ' requirements';
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        radius: 3,
                        hoverRadius: 5
                    }
                }
            }
        });
        
        console.log('✅ [REQUIREMENTS] Radar Chart initialized successfully');
        
    } catch (error) {
        console.error('❌ [REQUIREMENTS] Error loading radar chart:', error);
        showChartError(canvas, 'Failed to load chart data');
    }
}

// ===== FETCH TREND DATA FROM API =====
async function fetchTrendData(days = 30) {
    try {
        console.log(`📊 Fetching trend data for ${days} days...`);
        
        const response = await fetch(`/api/requirements/trend/?days=${days}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch data');
        }
        
        console.log('✅ Data fetched successfully');
        return result;
        
    } catch (error) {
        console.error('❌ Error fetching trend data:', error);
        throw error;
    }
}

// ===== UPDATE CHART WITH NEW TIME INTERVAL =====
async function updateTimeScaleChart(days) {
    if (!requirementsTrendChart) {
        console.warn('Chart not initialized');
        return;
    }
    
    try {
        const data = await fetchTrendData(days);
        const labels = data.labels.map(dateStr => new Date(dateStr));
        
        requirementsTrendChart.data.labels = labels;
        requirementsTrendChart.data.datasets[0].data = data.completed;
        requirementsTrendChart.data.datasets[1].data = data.pending;
        requirementsTrendChart.data.datasets[2].data = data.total;
        
        requirementsTrendChart.update('active');
        
        console.log(`✅ Chart updated with ${days} days of data`);
        
    } catch (error) {
        console.error('❌ Error updating chart:', error);
    }
}

// Event listener for time interval selector
setTimeout(() => {
    const timeIntervalSelect = document.getElementById('timeIntervalSelect');
    if (timeIntervalSelect) {
        timeIntervalSelect.addEventListener('change', function() {
            const days = parseInt(this.value);
            updateTimeScaleChart(days);
        });
    }
}, 1000);

// ===== REST OF YOUR EXISTING CODE (Navigation, Eligibility, etc.) =====
// Keep all your existing functions for:
// - initializeNavigation()
// - initializeSidebarProfile()
// - initializeStatCards()
// - initEligibilityForm()
// - initRequirementsMonitoring()
// - All eligibility form functions
// - All requirements monitoring functions
// - Utility functions

// ===== NAVIGATION SYSTEM =====
function initializeNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.dataset.page;
            const pageTitle = this.querySelector('span').textContent;
            document.querySelector('.page-title').textContent = pageTitle;
            
            const pages = document.querySelectorAll('.page-content');
            pages.forEach(p => p.classList.remove('active'));
            
            const targetPage = document.getElementById(`${page}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
                
                if (page === 'eligibility') {
                    setTimeout(() => initEligibilityForm(), 100);
                }
            }
        });
    });
}


function initDashboardCharts() {
    console.log('📊 Initializing dashboard charts...');
    
    // Destroy existing charts if they exist
    if (requirementsTrendChart) {
        console.log('🔄 Destroying existing trend chart...');
        requirementsTrendChart.destroy();
        requirementsTrendChart = null;
    }
    
    if (requirementTypeChart) {
        console.log('🔄 Destroying existing type chart...');
        requirementTypeChart.destroy();
        requirementTypeChart = null;
    }
    
    // Initialize charts
    initTimeScaleComboChart();
    initRequirementTypeChart();
}

async function initTimeScaleComboChart() {
    const canvas = document.getElementById('requirementsTrendChart');
    if (!canvas) {
        console.warn('⚠️ Requirements trend chart canvas not found');
        return;
    }
    
    console.log('📈 Initializing Time Scale Combo Chart...');
    const ctx = canvas.getContext('2d');
    
    try {
        // Fetch real data from backend
        const data = await fetchTrendData(30);
        
        // Convert string dates to Date objects
        const labels = data.labels.map(dateStr => new Date(dateStr));
        
        const chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Completed',
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1,
                        data: data.completed,
                        order: 2
                    },
                    {
                        type: 'bar',
                        label: 'Pending',
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: 'rgb(245, 158, 11)',
                        borderWidth: 1,
                        data: data.pending,
                        order: 3
                    },
                    {
                        type: 'line',
                        label: 'Total',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 3,
                        fill: true,
                        data: data.total,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            },
                            tooltipFormat: 'MMM d, yyyy'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            source: 'auto',
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        max: 30,
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        };
        
        requirementsTrendChart = new Chart(ctx, chartConfig);
        console.log('✅ Time Scale Chart initialized successfully');
        
        // Setup time interval selector
        setTimeout(() => {
            const timeIntervalSelect = document.getElementById('timeIntervalSelect');
            if (timeIntervalSelect) {
                timeIntervalSelect.addEventListener('change', function() {
                    const days = parseInt(this.value);
                    updateTimeScaleChart(days);
                });
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error loading chart:', error);
        showChartError(canvas, 'Failed to load chart data');
    }
}

async function initRequirementTypeChart() {
    const canvas = document.getElementById('requirementTypeChart');
    if (!canvas) {
        console.warn('⚠️ Requirement type chart canvas not found');
        return;
    }
    
    console.log('📊 Initializing Dynamic Radar Chart...');
    const ctx = canvas.getContext('2d');
    
    if (requirementTypeChart) {
        requirementTypeChart.destroy();
    }
    
    try {
        // Fetch real data from backend
        const response = await fetch('/api/requirements/radar-chart/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch data');
        }
        
        console.log('✅ Radar chart data loaded:', data);
        
        requirementTypeChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.labels, // Dynamic months from backend
                datasets: [
                    {
                        label: 'Weekly',
                        data: data.weekly,
                        fill: true,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgb(255, 99, 132)',
                        pointBackgroundColor: 'rgb(255, 99, 132)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Monthly',
                        data: data.monthly,
                        fill: true,
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderColor: 'rgb(255, 159, 64)',
                        pointBackgroundColor: 'rgb(255, 159, 64)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Quarterly',
                        data: data.quarterly,
                        fill: true,
                        backgroundColor: 'rgba(255, 205, 86, 0.2)',
                        borderColor: 'rgb(255, 205, 86)',
                        pointBackgroundColor: 'rgb(255, 205, 86)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Semestral',
                        data: data.semestral,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgb(75, 192, 192)',
                        pointBackgroundColor: 'rgb(75, 192, 192)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    },
                    {
                        label: 'Annual',
                        data: data.annually,
                        fill: true,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgb(54, 162, 235)',
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        pointBorderColor: '#fff',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5,
                            font: { size: 10 }
                        },
                        pointLabels: {
                            font: { size: 11, weight: '600' }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.r + ' requirements';
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        radius: 3,
                        hoverRadius: 5
                    }
                }
            }
        });
        
        console.log('✅ Dynamic Radar Chart initialized successfully');
        
    } catch (error) {
        console.error('❌ Error loading radar chart:', error);
        showChartError(canvas, 'Failed to load chart data');
    }
}

// Refresh function
window.refreshRadarChart = function() {
    console.log('🔄 Refreshing radar chart...');
    initRequirementTypeChart();
};

async function fetchTrendData(days = 30) {
    try {
        console.log(`📊 Fetching trend data for ${days} days...`);
        
        const response = await fetch(`/api/requirements/trend/?days=${days}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch data');
        }
        
        console.log('✅ Data fetched successfully');
        return result;
        
    } catch (error) {
        console.error('❌ Error fetching trend data:', error);
        throw error;
    }
}

async function updateTimeScaleChart(days) {
    if (!requirementsTrendChart) {
        console.warn('Chart not initialized');
        return;
    }
    
    try {
        const data = await fetchTrendData(days);
        const labels = data.labels.map(dateStr => new Date(dateStr));
        
        requirementsTrendChart.data.labels = labels;
        requirementsTrendChart.data.datasets[0].data = data.completed;
        requirementsTrendChart.data.datasets[1].data = data.pending;
        requirementsTrendChart.data.datasets[2].data = data.total;
        
        requirementsTrendChart.update('active');
        
        console.log(`✅ Chart updated with ${days} days of data`);
        
    } catch (error) {
        console.error('❌ Error updating chart:', error);
    }
}

function showChartError(canvas, message) {
    const container = canvas.parentElement;
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <p style="color: #6b7280; margin-bottom: 8px; font-weight: 600;">Failed to Load Chart</p>
                <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">${message}</p>
                <button class="btn btn-primary btn-sm" onclick="initEligibilityRadarChart()" style="padding: 8px 16px; border-radius: 6px; background: #48484e; border: none; color: white; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}
// ===== SIDEBAR PROFILE MENU =====
function initializeSidebarProfile() {
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('sidebarProfileDropdown');
        const toggle = document.querySelector('.profile-menu-toggle');
        
        if (dropdown && toggle) {
            if (!dropdown.contains(event.target) && !toggle.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        }
    });
}

window.toggleSidebarProfileMenu = function() {
    const dropdown = document.getElementById('sidebarProfileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

// ===== STAT CARDS ANIMATION =====
function initializeStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===== HELPER FUNCTIONS =====
function showChartError(canvas, message) {
    const container = canvas.parentElement;
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
            <p style="color: #6b7280; margin-bottom: 16px;">${message}</p>
            <button class="btn btn-primary" onclick="location.reload()">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ===== GLOBAL EXPORTS =====
window.updateTimeScaleChart = updateTimeScaleChart;
window.fetchTrendData = fetchTrendData;

// ===== LOGOUT =====
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const csrfToken = getCookie('csrftoken');
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/logout/';
        
        if (csrfToken) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrfmiddlewaretoken';
            input.value = csrfToken;
            form.appendChild(input);
        }
        
        document.body.appendChild(form);
        form.submit();
    }
}

window.logout = logout;


function updateLegendTotals(appointive, completed, incomplete) {
    console.log('📝 [ELIGIBILITY] Updating legend totals...');
    
    const appointiveEl = document.getElementById('appointive-total');
    const completedEl = document.getElementById('elective-completed-total');
    const incompleteEl = document.getElementById('elective-incomplete-total');
    
    if (appointiveEl) {
        appointiveEl.textContent = appointive;
        console.log('   ✅ Appointive total updated:', appointive);
    } else {
        console.warn('   ⚠️ #appointive-total element not found');
    }
    
    if (completedEl) {
        completedEl.textContent = completed;
        console.log('   ✅ Completed total updated:', completed);
    } else {
        console.warn('   ⚠️ #elective-completed-total element not found');
    }
    
    if (incompleteEl) {
        incompleteEl.textContent = incomplete;
        console.log('   ✅ Incomplete total updated:', incomplete);
    } else {
        console.warn('   ⚠️ #elective-incomplete-total element not found');
    }
}

function showEmptyChartState(canvas) {
    const container = canvas.parentElement;
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; padding: 20px; text-align: center;">
                <i class="fas fa-chart-pie" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                <p style="color: #6b7280; margin-bottom: 8px; font-weight: 600;">No Certification Data Yet</p>
                <p style="color: #9ca3af; font-size: 14px;">
                    Eligibility certifications will appear here once submitted and approved.
                </p>
            </div>
        `;
    }
}



function updateEligibilityLegend(appointive, completed, incomplete) {
    const appointiveEl = document.getElementById('appointive-total');
    const completedEl = document.getElementById('elective-completed-total');
    const incompleteEl = document.getElementById('elective-incomplete-total');
    
    if (appointiveEl) {
        appointiveEl.textContent = appointive;
        console.log('✅ [ELIGIBILITY] Updated appointive total:', appointive);
    }
    if (completedEl) {
        completedEl.textContent = completed;
        console.log('✅ [ELIGIBILITY] Updated completed total:', completed);
    }
    if (incompleteEl) {
        incompleteEl.textContent = incomplete;
        console.log('✅ [ELIGIBILITY] Updated incomplete total:', incomplete);
    }
}

// ===== ADD THIS updateEligibilityRadarChart FUNCTION =====
function updateEligibilityRadarChart() {
    console.log('🔄 [CHART] Refreshing chart...');
    initEligibilityRadarChart();
}
// ===== AUTO-INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [CHART] DOM loaded - setting up auto-init');
    
    // Wait for dashboard to be ready
    setTimeout(() => {
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            console.log('🚀 [CHART] Dashboard active - initializing chart');
            initEligibilityRadarChart();
        }
    }, 2000);
    
    // Also initialize when clicking dashboard menu
    const dashboardMenuItem = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenuItem) {
        dashboardMenuItem.addEventListener('click', () => {
            setTimeout(() => {
                console.log('🖱️ [CHART] Dashboard clicked - initializing chart');
                initEligibilityRadarChart();
            }, 500);
        });
    }
});
// Export to window
window.fetchEligibilityData = fetchEligibilityData;
window.initEligibilityRadarChart = initEligibilityRadarChart;
window.updateEligibilityRadarChart = updateEligibilityRadarChart;

console.log('✅ Eligibility Radar Chart module loaded');
window.updateEligibilityRadarChart = updateEligibilityRadarChart;

document.addEventListener('DOMContentLoaded', function() {
    // Handle menu item clicks for page navigation
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the page to show
            const page = this.getAttribute('data-page');
            
            // Remove active class from all menu items
            menuItems.forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked menu item
            this.classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page-content').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show the selected page
            const targetPage = document.getElementById(page + '-page');
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Update page title in top bar
                updatePageTitle(page);
                
                // If officials profile page, load officials
                if (page === 'officials-profile') {
                    loadOfficials();
                }
            }
        });
    });
});

// Update page title based on current page
function updatePageTitle(page) {
    const pageTitle = document.querySelector('.page-title');
    const titles = {
        'dashboard': 'Dashboard Analytics',
        'eligibility': 'Eligibility',
        'requirements': 'Requirements',
        'officials-profile': 'Barangay Officials Profile'
    };
    
    if (pageTitle) {
        pageTitle.textContent = titles[page] || 'Dashboard';
    }
}

// ===== OFFICIALS PROFILE FUNCTIONS =====

// Sample data for testing (replace with actual API calls)
let officialsData = [
    {
        id: 1,
        firstName: 'Maria Santos',
        lastName: 'Garcia',
        middleName: '',
        suffix: '',
        position: 'Punong Barangay',
        positionType: 'elective',
        termStart: '2023-01-01',
        termEnd: '2026-12-31',
        termStatus: 'ongoing',
        email: 'maria.garcia@barangay.gov',
        phone: '0912-345-6789',
        notes: ''
    },
    {
        id: 2,
        firstName: 'Pedro Miguel',
        lastName: 'Reyes',
        middleName: '',
        suffix: 'Jr.',
        position: 'Barangay Secretary',
        positionType: 'appointive',
        termStart: '2023-06-15',
        termEnd: '2026-06-14',
        termStatus: 'ongoing',
        email: 'pedro.reyes@barangay.gov',
        phone: '0923-456-7890',
        notes: ''
    },
    {
        id: 3,
        firstName: 'Ana Luna',
        lastName: 'Martinez',
        middleName: '',
        suffix: '',
        position: 'Barangay Treasurer',
        positionType: 'appointive',
        termStart: '2023-06-15',
        termEnd: '2026-06-14',
        termStatus: 'ongoing',
        email: 'ana.martinez@barangay.gov',
        phone: '0934-567-8901',
        notes: ''
    },
    {
        id: 4,
        firstName: 'Roberto Cruz',
        lastName: 'Santos',
        middleName: '',
        suffix: '',
        position: 'SK Chairperson',
        positionType: 'elective',
        termStart: '2023-01-01',
        termEnd: '2026-12-31',
        termStatus: 'ongoing',
        email: 'roberto.santos@barangay.gov',
        phone: '0945-678-9012',
        notes: ''
    }
];

// Load and display officials
function loadOfficials() {
    const officialsGrid = document.getElementById('officialsGrid');
    const emptyState = document.getElementById('emptyStateOfficials');
    
    if (!officialsGrid) return;
    
    // Clear loading spinner
    officialsGrid.innerHTML = '';
    
    if (officialsData.length === 0) {
        officialsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    officialsGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Render official cards
    officialsData.forEach(official => {
        const card = createOfficialCard(official);
        officialsGrid.appendChild(card);
    });
}

// Create official card HTML
function createOfficialCard(official) {
    const card = document.createElement('div');
    card.className = 'official-card';
    
    const initials = (official.firstName.charAt(0) + official.lastName.charAt(0)).toUpperCase();
    const fullName = `${official.firstName} ${official.middleName ? official.middleName + ' ' : ''}${official.lastName}${official.suffix ? ' ' + official.suffix : ''}`;
    
    // Calculate years served
    const startDate = new Date(official.termStart);
    const endDate = official.termStatus === 'ongoing' ? new Date() : new Date(official.termEnd);
    const yearsServed = ((endDate - startDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
    
    card.innerHTML = `
        <div class="official-header">
            <div class="official-avatar">${initials}</div>
            <div class="official-info">
                <div class="official-name">${fullName}</div>
                <div class="official-position">${official.position}</div>
                <span class="position-badge ${official.positionType}">${official.positionType}</span>
            </div>
        </div>
        <div class="official-details">
            <div class="detail-row">
                <span class="detail-label">Term:</span>
                <span class="detail-value">${formatDate(official.termStart)} - ${formatDate(official.termEnd)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Years Served:</span>
                <span class="detail-value">${yearsServed} years</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="status-badge ${official.termStatus}">${official.termStatus}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value" style="font-size: 12px;">${official.email}</span>
            </div>
        </div>
        <div class="official-actions">
            <button class="btn-action" onclick="viewOfficial(${official.id})">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="btn-action" onclick="editOfficial(${official.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-action" onclick="deleteOfficial(${official.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
        <div class="official-actions" style="border-top: none; padding-top: 8px;">
            <button class="btn-action primary" onclick="generateCertificate(${official.id})">
                <i class="fas fa-certificate"></i> Generate Certificate
            </button>
        </div>
    `;
    
    return card;
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Modal functions
function openAddOfficialModal() {
    const modal = document.getElementById('officialModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('officialForm');
    
    if (modal && modalTitle && form) {
        modalTitle.textContent = 'Add Barangay Official';
        form.reset();
        document.getElementById('officialId').value = '';
        modal.classList.add('active');
    }
}

function closeOfficialModal() {
    const modal = document.getElementById('officialModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openBulkUploadModal() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeBulkUploadModal() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function viewOfficial(id) {
    const official = officialsData.find(o => o.id === id);
    if (!official) return;
    
    alert(`Viewing official: ${official.firstName} ${official.lastName}\nPosition: ${official.position}`);
    // Implement view modal here
}

function editOfficial(id) {
    const official = officialsData.find(o => o.id === id);
    if (!official) return;
    
    const modal = document.getElementById('officialModal');
    const modalTitle = document.getElementById('modalTitle');
    
    if (modal && modalTitle) {
        modalTitle.textContent = 'Edit Barangay Official';
        
        // Populate form fields
        document.getElementById('officialId').value = official.id;
        document.getElementById('firstName').value = official.firstName;
        document.getElementById('middleName').value = official.middleName;
        document.getElementById('lastName').value = official.lastName;
        document.getElementById('suffix').value = official.suffix;
        document.getElementById('position').value = official.position;
        document.getElementById('positionType').value = official.positionType;
        document.getElementById('termStart').value = official.termStart;
        document.getElementById('termEnd').value = official.termEnd;
        document.querySelector(`input[name="term_status"][value="${official.termStatus}"]`).checked = true;
        document.getElementById('email').value = official.email;
        document.getElementById('phone').value = official.phone;
        document.getElementById('notes').value = official.notes;
        
        modal.classList.add('active');
    }
}

function deleteOfficial(id) {
    if (confirm('Are you sure you want to delete this official?')) {
        officialsData = officialsData.filter(o => o.id !== id);
        loadOfficials();
        alert('Official deleted successfully!');
    }
}

function generateCertificate(id) {
    const official = officialsData.find(o => o.id === id);
    if (!official) return;
    
    alert(`Generating certificate for: ${official.firstName} ${official.lastName}`);
    // Implement certificate generation here
}

// Search and filter functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('officialsSearchInput');
    const positionFilter = document.getElementById('positionFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterOfficials);
    }
    
    if (positionFilter) {
        positionFilter.addEventListener('change', filterOfficials);
    }
});

function filterOfficials() {
    const searchTerm = document.getElementById('officialsSearchInput')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('positionFilter')?.value || '';
    
    const filteredData = officialsData.filter(official => {
        const matchesSearch = 
            official.firstName.toLowerCase().includes(searchTerm) ||
            official.lastName.toLowerCase().includes(searchTerm) ||
            official.position.toLowerCase().includes(searchTerm);
        
        const matchesPosition = !positionFilter || official.position === positionFilter;
        
        return matchesSearch && matchesPosition;
    });
    
    displayFilteredOfficials(filteredData);
}

function displayFilteredOfficials(filteredData) {
    const officialsGrid = document.getElementById('officialsGrid');
    const emptyState = document.getElementById('emptyStateOfficials');
    
    if (!officialsGrid) return;
    
    officialsGrid.innerHTML = '';
    
    if (filteredData.length === 0) {
        officialsGrid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.querySelector('h3').textContent = 'No Officials Found';
            emptyState.querySelector('p').textContent = 'Try adjusting your search or filter criteria.';
        }
        return;
    }
    
    officialsGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    filteredData.forEach(official => {
        const card = createOfficialCard(official);
        officialsGrid.appendChild(card);
    });
}

// Download CSV template
function downloadTemplate() {
    const csvContent = "First Name,Middle Name,Last Name,Suffix,Position,Position Type,Term Start,Term End,Term Status,Email,Phone,Notes\n" +
                      "Juan,De La,Cruz,,Punong Barangay,elective,2023-01-01,2026-12-31,ongoing,juan.cruz@example.com,0912-345-6789,Sample note";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'officials_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Handle bulk file select
function handleBulkFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const confirmBtn = document.getElementById('confirmUploadBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
    
    alert('File selected: ' + file.name + '\nClick "Upload Officials" to process the file.');
}

// Confirm bulk upload
function confirmBulkUpload() {
    alert('Bulk upload feature will be implemented with backend integration.');
    closeBulkUploadModal();
}



// Global state
let currentEditingOfficialId = null;
let officialsCache = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Officials Profile Module Loaded');
    
    // Initialize when officials page is shown
    const officialsMenuItem = document.querySelector('.menu-item[data-page="officials-profile"]');
    if (officialsMenuItem) {
        officialsMenuItem.addEventListener('click', function() {
            console.log('📋 Loading officials page...');
            setTimeout(() => {
                initializeOfficialsPage();
            }, 100);
        });
    }
});

// ===== MAIN INITIALIZATION =====
function initializeOfficialsPage() {
    console.log('📊 Initializing Officials Page...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load officials from backend
    loadOfficials();
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('officialsSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterOfficials(this.value);
        }, 300));
    }
    
    // Position filter
    const positionFilter = document.getElementById('positionFilter');
    if (positionFilter) {
        positionFilter.addEventListener('change', function() {
            filterOfficials(searchInput?.value || '', this.value);
        });
    }
    
    // Form submission
    const officialForm = document.getElementById('officialForm');
    if (officialForm) {
        officialForm.addEventListener('submit', handleFormSubmit);
    }
}

// ===== LOAD OFFICIALS FROM BACKEND =====
async function loadOfficials() {
    console.log('📥 Loading officials from backend...');
    
    const officialsGrid = document.getElementById('officialsGrid');
    const emptyState = document.getElementById('emptyStateOfficials');
    
    if (!officialsGrid) {
        console.error('❌ Officials grid not found');
        return;
    }
    
    // Show loading
    officialsGrid.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading officials...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/officials/list/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Officials loaded:', data);
        
        if (data.success) {
            officialsCache = data.officials || [];
            renderOfficials(officialsCache);
        } else {
            throw new Error(data.error || 'Failed to load officials');
        }
        
    } catch (error) {
        console.error('❌ Error loading officials:', error);
        officialsGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to Load Officials</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadOfficials()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== RENDER OFFICIALS =====
function renderOfficials(officials) {
    const officialsGrid = document.getElementById('officialsGrid');
    const emptyState = document.getElementById('emptyStateOfficials');
    
    if (!officialsGrid) return;
    
    // Clear loading spinner
    officialsGrid.innerHTML = '';
    
    if (!officials || officials.length === 0) {
        officialsGrid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    officialsGrid.style.display = 'grid';
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    officials.forEach(official => {
        const card = createOfficialCard(official);
        officialsGrid.appendChild(card);
    });
    
    console.log(`✅ Rendered ${officials.length} officials`);
}

// ===== CREATE OFFICIAL CARD =====
function createOfficialCard(official) {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.dataset.officialId = official.id;
    
    // Create initials
    const firstInitial = official.first_name.charAt(0).toUpperCase();
    const lastInitial = official.last_name.charAt(0).toUpperCase();
    const initials = firstInitial + lastInitial;
    
    // Calculate years served
    const yearsServed = official.years_served || '0.0';
    
    // Determine term status badge
    const statusBadge = official.is_term_active ? 
        '<span class="status-badge ongoing">Ongoing</span>' : 
        '<span class="status-badge completed">Completed</span>';
    
    card.innerHTML = `
        <div class="official-header">
            <div class="official-avatar">${initials}</div>
            <div class="official-info">
                <div class="official-name">${escapeHtml(official.display_name)}</div>
                <div class="official-position">${escapeHtml(official.position)}</div>
                <span class="position-badge ${official.position_type}">${official.position_type}</span>
            </div>
        </div>
        <div class="official-details">
            <div class="detail-row">
                <span class="detail-label">Term:</span>
                <span class="detail-value">${formatDate(official.term_start)} - ${formatDate(official.term_end)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Years Served:</span>
                <span class="detail-value">${yearsServed} years</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                ${statusBadge}
            </div>
            ${official.email ? `
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value" style="font-size: 12px;">${escapeHtml(official.email)}</span>
            </div>
            ` : ''}
        </div>
        <div class="official-actions">
            <button class="btn-action" onclick="viewOfficial(${official.id})">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="btn-action" onclick="editOfficial(${official.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-action" onclick="deleteOfficial(${official.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
        <div class="official-actions" style="border-top: none; padding-top: 8px;">
            <button class="btn-action primary" onclick="generateCertificate(${official.id})">
                <i class="fas fa-certificate"></i> Generate Certificate
            </button>
        </div>
    `;
    
    return card;
}

// ===== FILTER OFFICIALS =====
function filterOfficials(searchTerm = '', positionFilter = '') {
    let filtered = [...officialsCache];
    
    // Apply search filter
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(official => 
            official.first_name.toLowerCase().includes(search) ||
            official.last_name.toLowerCase().includes(search) ||
            official.position.toLowerCase().includes(search) ||
            (official.middle_name && official.middle_name.toLowerCase().includes(search))
        );
    }
    
    // Apply position filter
    if (positionFilter) {
        filtered = filtered.filter(official => 
            official.position === positionFilter
        );
    }
    
    renderOfficials(filtered);
}

// ===== OPEN ADD MODAL =====
window.openAddOfficialModal = function() {
    const modal = document.getElementById('officialModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('officialForm');
    
    if (!modal || !modalTitle || !form) return;
    
    // Reset for adding
    currentEditingOfficialId = null;
    modalTitle.textContent = 'Add Barangay Official';
    form.reset();
    
    // Clear hidden ID field
    const idField = document.getElementById('officialId');
    if (idField) idField.value = '';
    
    modal.classList.add('active');
};

// ===== CLOSE MODAL =====
window.closeOfficialModal = function() {
    const modal = document.getElementById('officialModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentEditingOfficialId = null;
};

// ===== EDIT OFFICIAL =====
window.editOfficial = async function(officialId) {
    console.log('✏️ Editing official:', officialId);
    
    try {
        const response = await fetch(`/api/officials/${officialId}/`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            populateEditForm(data.official);
        } else {
            throw new Error(data.error || 'Failed to load official');
        }
        
    } catch (error) {
        console.error('❌ Error loading official:', error);
        alert('Failed to load official details: ' + error.message);
    }
};

// ===== POPULATE EDIT FORM =====
function populateEditForm(official) {
    const modal = document.getElementById('officialModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('officialForm');
    
    if (!modal || !modalTitle || !form) return;
    
    currentEditingOfficialId = official.id;
    modalTitle.textContent = 'Edit Barangay Official';
    
    // Populate form fields
    document.getElementById('officialId').value = official.id;
    document.getElementById('firstName').value = official.first_name;
    document.getElementById('middleName').value = official.middle_name || '';
    document.getElementById('lastName').value = official.last_name;
    document.getElementById('suffix').value = official.suffix || '';
    document.getElementById('position').value = official.position;
    document.getElementById('positionType').value = official.position_type;
    document.getElementById('termStart').value = official.term_start;
    document.getElementById('termEnd').value = official.term_end;
    document.querySelector(`input[name="term_status"][value="${official.term_status}"]`).checked = true;
    document.getElementById('email').value = official.email || '';
    document.getElementById('phone').value = official.phone || '';
    document.getElementById('notes').value = official.notes || '';
    
    modal.classList.add('active');
}

// ===== HANDLE FORM SUBMIT =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        first_name: formData.get('first_name'),
        middle_name: formData.get('middle_name'),
        last_name: formData.get('last_name'),
        suffix: formData.get('suffix'),
        position: formData.get('position'),
        position_type: formData.get('position_type'),
        term_start: formData.get('term_start'),
        term_end: formData.get('term_end'),
        term_status: formData.get('term_status'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes')
    };
    
    console.log('📤 Submitting form:', data);
    
    try {
        const isEdit = currentEditingOfficialId !== null;
        const url = isEdit ? 
            `/api/officials/${currentEditingOfficialId}/update/` : 
            '/api/officials/create/';
        
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Official saved successfully');
            showNotification(result.message, 'success');
            closeOfficialModal();
            loadOfficials(); // Reload the list
        } else {
            throw new Error(result.error || 'Failed to save official');
        }
        
    } catch (error) {
        console.error('❌ Error saving official:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// ===== DELETE OFFICIAL =====
window.deleteOfficial = async function(officialId) {
    if (!confirm('Are you sure you want to delete this official? This action cannot be undone.')) {
        return;
    }
    
    console.log('🗑️ Deleting official:', officialId);
    
    try {
        const response = await fetch(`/api/officials/${officialId}/delete/`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Official deleted');
            showNotification(result.message, 'success');
            loadOfficials();
        } else {
            throw new Error(result.error || 'Failed to delete official');
        }
        
    } catch (error) {
        console.error('❌ Error deleting official:', error);
        showNotification('Error: ' + error.message, 'error');
    }
};

// ===== VIEW OFFICIAL =====
window.viewOfficial = async function(officialId) {
    console.log('👁️ Viewing official:', officialId);
    
    try {
        const response = await fetch(`/api/officials/${officialId}/`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showOfficialDetails(data.official);
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Failed to load official: ' + error.message);
    }
};

// ===== SHOW OFFICIAL DETAILS MODAL =====
function showOfficialDetails(official) {
    const modal = document.getElementById('viewOfficialModal');
    const content = document.getElementById('viewOfficialContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div style="padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div class="official-avatar" style="width: 80px; height: 80px; font-size: 36px; margin: 0 auto 16px;">
                    ${official.first_name.charAt(0)}${official.last_name.charAt(0)}
                </div>
                <h2 style="margin: 0 0 8px 0;">${escapeHtml(official.full_name)}</h2>
                <p style="color: #6b7280; margin: 0;">${escapeHtml(official.position)}</p>
                <span class="position-badge ${official.position_type}">${official.position_type}</span>
            </div>
            
            <div class="detail-info">
                <div class="info-row">
                    <span class="label">Term Start:</span>
                    <span>${formatDate(official.term_start)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Term End:</span>
                    <span>${formatDate(official.term_end)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Years Served:</span>
                    <span>${official.years_served} years</span>
                </div>
                <div class="info-row">
                    <span class="label">Term Status:</span>
                    <span class="status-badge ${official.term_status}">${official.term_status}</span>
                </div>
                ${official.email ? `
                <div class="info-row">
                    <span class="label">Email:</span>
                    <span>${escapeHtml(official.email)}</span>
                </div>
                ` : ''}
                ${official.phone ? `
                <div class="info-row">
                    <span class="label">Phone:</span>
                    <span>${escapeHtml(official.phone)}</span>
                </div>
                ` : ''}
                ${official.notes ? `
                <div class="info-row">
                    <span class="label">Notes:</span>
                    <p style="margin: 0;">${escapeHtml(official.notes)}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// ===== CLOSE VIEW MODAL =====
window.closeViewOfficialModal = function() {
    const modal = document.getElementById('viewOfficialModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// ===== GENERATE CERTIFICATE =====
window.generateCertificate = async function(officialId) {
    console.log('🎯 TESTING: Generate Certificate Started');
    console.log('   Official ID:', officialId);
    
    try {
        // Fetch official data
        const response = await fetch(`/api/officials/${officialId}/`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        console.log('📡 API Response Status:', response.status);
        
        const data = await response.json();
        console.log('📦 API Data:', data);
        
        if (data.success) {
            const official = data.official;
            console.log('✅ Official loaded:', official);
            
            // Switch to eligibility page
            const eligibilityMenuItem = document.querySelector('.menu-item[data-page="eligibility"]');
            console.log('🔍 Found eligibility menu item:', !!eligibilityMenuItem);
            
            if (eligibilityMenuItem) {
                console.log('🔄 Switching to eligibility page...');
                eligibilityMenuItem.click();
                
                // Wait for page to load, then auto-fill
                setTimeout(() => {
                    console.log('📝 Starting auto-fill...');
                    autoFillEligibilityForm(official);
                }, 500);
            }
        } else {
            console.error('❌ API returned error:', data.error);
            showNotification('Failed to load official data', 'error');
        }
    } catch (error) {
        console.error('❌ Exception:', error);
        console.error('Stack:', error.stack);
        showNotification('Error loading official data', 'error');
    }
};

// Auto-fill function
function autoFillEligibilityForm(official) {
    console.log('🎨 AUTO-FILL STARTED');
    console.log('   Official:', official);
    
    // Check if form elements exist
    const lastName = document.getElementById('elig-last_name');
    const firstName = document.getElementById('elig-first_name');
    const middleInitial = document.getElementById('elig-middle_initial');
    
    console.log('📋 Form elements check:');
    console.log('   Last Name field:', !!lastName);
    console.log('   First Name field:', !!firstName);
    console.log('   Middle Initial field:', !!middleInitial);
    
    // Navigate to intro first
    showEligStep('elig-intro');
    console.log('   ✓ Showed intro step');
    
    // Click "Get Started"
    setTimeout(() => {
        showEligSelectionPage();
        console.log('   ✓ Showed selection page');
        
        // Auto-select position type
        setTimeout(() => {
            const positionType = official.position_type;
            console.log('   Position type:', positionType);
            
            selectEligPositionType(positionType);
            console.log('   ✓ Selected position type:', positionType);
            
            // Fill Step 1
            setTimeout(() => {
                console.log('   📝 Filling Step 1 fields...');
                
                if (lastName) {
                    lastName.value = official.last_name;
                    console.log('      ✓ Last Name:', official.last_name);
                }
                
                if (firstName) {
                    firstName.value = official.first_name;
                    console.log('      ✓ First Name:', official.first_name);
                }
                
                if (middleInitial && official.middle_name) {
                    middleInitial.value = official.middle_name.charAt(0);
                    console.log('      ✓ Middle Initial:', official.middle_name.charAt(0));
                }
                
                const barangaySelect = document.getElementById('elig-barangay');
                if (barangaySelect && window.barangayData) {
                    barangaySelect.value = window.barangayData.name;
                    console.log('      ✓ Barangay:', window.barangayData.name);
                }
                
                const emailField = document.getElementById('elig-email');
                if (emailField && official.email) {
                    emailField.value = official.email;
                    console.log('      ✓ Email:', official.email);
                }
                
                // Trigger validation
                updateEligValidation();
                console.log('   ✓ Validation triggered');
                
                // ⭐ NEW: Continue to Step 2 auto-fill
                console.log('   🔄 Continuing to Step 2...');
                
                if (positionType === 'elective') {
                    autoFillElectiveFields(official);
                } else if (positionType === 'appointive') {
                    autoFillAppointiveFields(official);
                }
                
                showNotification('Form auto-filled! Please review fields.', 'success');
                
            }, 500);  // Increased delay
        }, 500);
    }, 500);
}

// Auto-fill elective fields
function autoFillElectiveFields(official) {
    console.log('   🗳️ AUTO-FILLING ELECTIVE FIELDS');
    
    setTimeout(() => {
        // Navigate to step 2
        console.log('      → Moving to Step 2');
        eligNextStep();
        
        setTimeout(() => {
            console.log('      📝 Filling elective fields...');
            
            // Fill position held
            const positionSelect = document.getElementById('elig-position_held');
            if (positionSelect) {
                // Try to match the position or set it
                const positionValue = official.position;
                console.log('         Position to set:', positionValue);
                
                // Check if position exists in dropdown
                const options = Array.from(positionSelect.options);
                const matchingOption = options.find(opt => 
                    opt.value.toLowerCase() === positionValue.toLowerCase()
                );
                
                if (matchingOption) {
                    positionSelect.value = matchingOption.value;
                    console.log('         ✓ Position Held:', matchingOption.value);
                } else {
                    console.log('         ⚠️ Position not found in dropdown:', positionValue);
                }
            }
            
            // Fill election dates
            const electionFrom = document.getElementById('elig-election_from');
            const electionTo = document.getElementById('elig-election_to');
            
            if (electionFrom && official.term_start) {
                electionFrom.value = official.term_start;
                console.log('         ✓ Election From:', official.term_start);
                
                // Trigger change event to calculate term office
                electionFrom.dispatchEvent(new Event('change'));
            }
            
            if (electionTo && official.term_end) {
                electionTo.value = official.term_end;
                console.log('         ✓ Election To:', official.term_end);
                
                // Trigger change event to calculate term office
                electionTo.dispatchEvent(new Event('change'));
            }
            
            // Wait for term office calculation
            setTimeout(() => {
                // Mark as completed term if term_status is 'completed'
                const termYes = document.getElementById('elig-term_yes');
                const termNo = document.getElementById('elig-term_no');
                
                if (official.term_status === 'completed' && termYes) {
                    termYes.checked = true;
                    console.log('         ✓ Completed Term: Yes');
                } else if (termNo) {
                    termNo.checked = true;
                    console.log('         ✓ Completed Term: No');
                }
                
                // Trigger validation
                updateEligValidation();
                
                console.log('   ✅ ELECTIVE FIELDS AUTO-FILL COMPLETE');
            }, 300);
            
        }, 500);
    }, 500);
}


// Auto-fill appointive fields
function autoFillAppointiveFields(official) {
    console.log('   📋 AUTO-FILLING APPOINTIVE FIELDS');
    
    setTimeout(() => {
        // Navigate to step 2
        console.log('      → Moving to Step 2');
        eligNextStep();
        
        setTimeout(() => {
            console.log('      📝 Filling appointive fields...');
            
            // Fill appointment dates
            const appointmentFrom = document.getElementById('elig-appointment_from');
            const appointmentTo = document.getElementById('elig-appointment_to');
            
            if (appointmentFrom && official.term_start) {
                appointmentFrom.value = official.term_start;
                console.log('         ✓ Appointment From:', official.term_start);
                
                // Trigger change event
                appointmentFrom.dispatchEvent(new Event('change'));
            }
            
            if (appointmentTo && official.term_end) {
                appointmentTo.value = official.term_end;
                console.log('         ✓ Appointment To:', official.term_end);
                
                // Trigger change event
                appointmentTo.dispatchEvent(new Event('change'));
            }
            
            // Wait for years calculation
            setTimeout(() => {
                const yearsInService = document.getElementById('elig-years_in_service');
                if (yearsInService) {
                    console.log('         ✓ Years in Service (calculated):', yearsInService.value);
                }
                
                // Trigger validation
                updateEligValidation();
                
                console.log('   ✅ APPOINTIVE FIELDS AUTO-FILL COMPLETE');
            }, 300);
            
        }, 500);
    }, 500);
}
// ===== NAVIGATE TO ELIGIBILITY WITH AUTO-FILL =====
function navigateToEligibilityWithData(official) {
    // Switch to eligibility page
    const eligibilityMenuItem = document.querySelector('.menu-item[data-page="eligibility"]');
    if (eligibilityMenuItem) {
        eligibilityMenuItem.click();
        
        // Wait for page to load, then populate form
        setTimeout(() => {
            populateEligibilityForm(official);
        }, 500);
    }
}

// ===== POPULATE ELIGIBILITY FORM =====
function populateEligibilityForm(official) {
    console.log('📝 Auto-filling eligibility form with:', official);
    
    // Fill step 1 fields
    const lastName = document.getElementById('elig-last_name');
    const firstName = document.getElementById('elig-first_name');
    const middleInitial = document.getElementById('elig-middle_initial');
    
    if (lastName) lastName.value = official.last_name;
    if (firstName) firstName.value = official.first_name;
    if (middleInitial && official.middle_name) {
        middleInitial.value = official.middle_name.charAt(0);
    }
    
    // Show notification
    showNotification('Form auto-filled with official data. Please review and complete remaining fields.', 'info');
}

// ===== BULK UPLOAD =====
window.openBulkUploadModal = function() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
        modal.classList.add('active');
    }
};

window.closeBulkUploadModal = function() {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.downloadTemplate = function() {
    const csv = `first_name,middle_name,last_name,suffix,position,position_type,term_start,term_end,term_status,email,phone,notes
Juan,De La,Cruz,,Punong Barangay,elective,2023-01-01,2026-12-31,ongoing,juan.cruz@example.com,0912-345-6789,Sample note`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barangay_officials_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
};

window.handleBulkFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📂 File selected:', file.name);
    
    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseAndPreviewCSV(text);
    };
    reader.readAsText(file);
};

function parseAndPreviewCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const officials = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const official = {};
        
        headers.forEach((header, index) => {
            official[header] = values[index] || '';
        });
        
        officials.push(official);
    }
    
    console.log('📊 Parsed officials:', officials);
    
    // Show preview
    const previewDiv = document.getElementById('uploadPreview');
    const previewContent = document.getElementById('previewContent');
    const confirmBtn = document.getElementById('confirmUploadBtn');
    
    if (previewDiv && previewContent && confirmBtn) {
        previewDiv.style.display = 'block';
        previewContent.innerHTML = `
            <p><strong>${officials.length} official(s) found</strong></p>
            <ul style="text-align: left; max-height: 200px; overflow-y: auto;">
                ${officials.map(o => `<li>${o.first_name} ${o.last_name} - ${o.position}</li>`).join('')}
            </ul>
        `;
        confirmBtn.disabled = false;
        
        // Store for upload
        window.bulkOfficials = officials;
    }
}

window.confirmBulkUpload = async function() {
    if (!window.bulkOfficials) {
        alert('No data to upload');
        return;
    }
    
    console.log('📤 Uploading bulk officials...');
    
    const confirmBtn = document.getElementById('confirmUploadBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }
    
    try {
        const response = await fetch('/api/officials/bulk-create/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                officials: window.bulkOfficials
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Successfully uploaded ${result.created_count} official(s)`, 'success');
            closeBulkUploadModal();
            loadOfficials();
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Officials';
        }
    }
};

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

console.log('✅ Officials Profile Module Ready');

// Profile Modal Functions
function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
}

function switchProfileTab(event, tabName) {
    // Remove active from all tabs and buttons
    document.querySelectorAll('.profile-tab-panel').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.profile-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active to selected tab and button
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

// Close modal when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('profileModal');
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeProfileModal();
            }
        });
    }
    
    // Password validation
    const passwordForm = document.querySelector('#securityTab form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            const newPass1 = document.getElementById('new_password1').value;
            const newPass2 = document.getElementById('new_password2').value;
            
            if (newPass1 !== newPass2) {
                e.preventDefault();
                alert('New passwords do not match!');
            }
        });
    }
});

// Escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('profileModal');
        if (modal && modal.classList.contains('active')) {
            closeProfileModal();
        }
    }
});

// Toggle accept button
function toggleAcceptButton() {
    const checkbox = document.getElementById('acceptTermsCheckbox');
    const button = document.getElementById('acceptTermsButton');
    if (checkbox.checked) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    } else {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
    }
}

// Accept terms
function acceptTermsAndConditions() {
    fetch('/api/accept-terms/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            accepted: true,
            timestamp: new Date().toISOString()
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Terms and Conditions accepted successfully!');
            // Switch back to dashboard
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('[data-page="dashboard"]').classList.add('active');
            
            document.querySelectorAll('.page-content').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById('dashboard-page').classList.add('active');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// ===== NOTIFICATION BELL SYSTEM =====
console.log('🔔 Loading Notification Bell System...');

class NotificationBell {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.pollingInterval = null;
        this.POLL_INTERVAL = 30000; // 30 seconds
        this.maxNotifications = 10;
        
        this.init();
    }

    init() {
        console.log('🔔 Initializing Notification Bell');
        this.createNotificationBell();
        this.loadNotifications();
        this.startPolling();
        this.setupEventListeners();
        console.log('✅ Notification Bell initialized');
    }

    createNotificationBell() {
        // Create bell button HTML
        const bellHTML = `
            <div class="notification-bell-container">
                <button class="notification-bell-btn" id="notificationBell" aria-label="Notifications">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                </button>
            </div>
        `;

        // Create notification modal HTML
        const modalHTML = `
            <div class="notification-modal-overlay" id="notificationModal">
                <div class="notification-modal-container">
                    <div class="notification-modal-header">
                        <h3><i class="fas fa-bell"></i> Notifications</h3>
                        <div class="notification-modal-actions">
                            <button class="notification-btn-icon" id="markAllReadBtn" title="Mark all as read">
                                <i class="fas fa-check-double"></i>
                            </button>
                            <button class="notification-btn-icon" id="refreshNotificationsBtn" title="Refresh">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="notification-modal-close" id="closeNotificationModal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="notification-tabs">
                        <button class="notification-tab active" data-filter="all">All</button>
                        <button class="notification-tab" data-filter="unread">Unread</button>
                        <button class="notification-tab" data-filter="announcements">Announcements</button>
                    </div>
                    <div class="notification-list" id="notificationList">
                        <div class="notification-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading notifications...</p>
                        </div>
                    </div>
                    <div class="notification-modal-footer">
                        <button class="notification-btn-text" id="viewAllNotificationsBtn">
                            View All Notifications
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Inject bell into top bar
        const topBar = document.querySelector('.page-title-container');
        if (topBar) {
            const bellContainer = document.createElement('div');
            bellContainer.innerHTML = bellHTML;
            topBar.appendChild(bellContainer.firstElementChild);
            console.log('✅ Bell button added to top bar');
        }

        // Inject modal into body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('✅ Modal added to page');
    }

    setupEventListeners() {
        const bellBtn = document.getElementById('notificationBell');
        if (bellBtn) {
            bellBtn.addEventListener('click', () => this.openModal());
        }

        const closeBtn = document.getElementById('closeNotificationModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }

        const refreshBtn = document.getElementById('refreshNotificationsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadNotifications();
                this.showToast('Notifications refreshed', 'success');
            });
        }

        document.querySelectorAll('.notification-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.filterNotifications(e.target.dataset.filter);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    openModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.classList.add('active');
            this.loadNotifications();
        }
    }

    closeModal() {
        const modal = document.getElementById('notificationModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications || [];
                this.unreadCount = data.unread_count || 0;
                
                this.updateBadge();
                this.renderNotifications();
                
                console.log(`✅ Loaded ${this.notifications.length} notifications`);
            }
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            this.showError('Failed to load notifications');
        }
    }

    renderNotifications(filter = 'all') {
        const listContainer = document.getElementById('notificationList');
        if (!listContainer) return;

        let filtered = this.notifications;
        
        if (filter === 'unread') {
            filtered = this.notifications.filter(n => !n.is_read);
        } else if (filter === 'announcements') {
            filtered = this.notifications.filter(n => n.type === 'announcement');
        }

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No ${filter !== 'all' ? filter : ''} notifications</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtered.map(notif => `
            <div class="notification-item ${notif.is_read ? '' : 'unread'}" 
                 onclick="notificationBell.navigateToNotification(${notif.id}, '${notif.target_url || '#'}')">
                ${notif.is_read ? '' : '<span class="unread-dot"></span>'}
                <div class="notification-icon ${this.getNotificationIconClass(notif.type)}">
                    <i class="${this.getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notif.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notif.message)}</div>
                    <div class="notification-time">
                        <i class="fas fa-clock"></i>
                        ${notif.time_ago}
                    </div>
                </div>
                ${notif.is_read ? '' : `
                    <button class="notification-mark-read" 
                            onclick="event.stopPropagation(); notificationBell.markAsRead(${notif.id}, event)">
                        Mark as read
                    </button>
                `}
            </div>
        `).join('');
    }

    navigateToNotification(notificationId, targetUrl) {
        this.markAsRead(notificationId);
        if (targetUrl && targetUrl !== '#') {
            window.location.href = targetUrl;
        }
    }

    async markAsRead(notificationId, event = null) {
        if (event) event.stopPropagation();

        try {
            const response = await fetch(`/api/notifications/${notificationId}/read/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();
            
            if (data.success) {
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) notification.is_read = true;
                
                this.unreadCount = data.unread_count;
                this.updateBadge();
                this.renderNotifications();
                
                console.log(`✅ Marked notification ${notificationId} as read`);
            }
        } catch (error) {
            console.error('❌ Error marking as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.notifications.forEach(n => n.is_read = true);
                this.unreadCount = 0;
                this.updateBadge();
                this.renderNotifications();
                this.showToast('All notifications marked as read', 'success');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.showToast('Failed to mark all as read', 'error');
        }
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    filterNotifications(filter) {
        document.querySelectorAll('.notification-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        this.renderNotifications(filter);
    }

    startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        
        this.pollingInterval = setInterval(() => {
            this.loadNotifications();
        }, this.POLL_INTERVAL);

        console.log('🔄 Notification polling started (30s)');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'overdue': 'fas fa-exclamation-triangle',
            'upcoming': 'fas fa-clock',
            'completed': 'fas fa-check-circle',
            'reminder': 'fas fa-bell',
            'info': 'fas fa-info-circle',
            'new_requirement': 'fas fa-tasks',
            'new_submission': 'fas fa-paper-plane',
            'announcement': 'fas fa-bullhorn',
        };
        return icons[type] || 'fas fa-bell';
    }

    getNotificationIconClass(type) {
        const classes = {
            'overdue': 'icon-danger',
            'upcoming': 'icon-warning',
            'completed': 'icon-success',
            'reminder': 'icon-info',
            'info': 'icon-info',
            'new_requirement': 'icon-primary',
            'new_submission': 'icon-primary',
            'announcement': 'icon-announcement',
        };
        return classes[type] || 'icon-default';
    }

    showToast(message, type = 'info') {
        let toast = document.getElementById('notificationToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'notificationToast';
            toast.className = 'notification-toast';
            document.body.appendChild(toast);
        }

        toast.className = `notification-toast ${type}`;
        toast.textContent = message;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    showError(message) {
        const listContainer = document.getElementById('notificationList');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="notification-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn-secondary btn-small" onclick="notificationBell.loadNotifications()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize notification bell
let notificationBell;
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [ELIGIBILITY] DOM loaded - setting up auto-init');
    
    // Wait for dashboard to be ready
    setTimeout(() => {
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            console.log('🚀 [ELIGIBILITY] Dashboard active on load - initializing chart');
            initEligibilityRadarChart();
        } else {
            console.log('⏳ [ELIGIBILITY] Dashboard not active yet');
        }
    }, 2000);
    
    // Initialize when dashboard menu is clicked
    const dashboardMenuItem = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenuItem) {
        dashboardMenuItem.addEventListener('click', () => {
            console.log('🖱️ [ELIGIBILITY] Dashboard menu clicked');
            setTimeout(() => {
                initEligibilityRadarChart();
            }, 500);
        });
    }
});


window.addEventListener('load', function() {
    console.log('🎯 [ELIGIBILITY] Window fully loaded - backup init');
    
    setTimeout(function() {
        const canvas = document.getElementById('eligibilityRadarChart');
        if (canvas && !eligibilityRadarChartInstance) {
            console.log('🔄 [ELIGIBILITY] Running backup initialization...');
            initEligibilityRadarChart();
        }
    }, 3000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (notificationBell) {
        notificationBell.stopPolling();
    }
});

console.log('✅ Notification Bell Script Loaded');


// Step 1: Define the fetch function FIRST
async function fetchEligibilityData() {
    console.log('📡 [FETCH] Starting eligibility data fetch...');
    
    try {
        const response = await fetch('/api/eligibility-certifications-data/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 [FETCH] Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [FETCH] Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 [FETCH] Data received:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'API returned success: false');
        }
        
        // Verify we have the data we need
        const appointive = data.appointive || 0;
        const completed = data.elective_completed || 0;
        const incomplete = data.elective_incomplete || 0;
        
        console.log('✅ [FETCH] Parsed values:', { appointive, completed, incomplete });
        
        // Return in the format the chart expects
        return {
            appointive: Array(12).fill(Math.round(appointive / 12)),
            elective_completed: Array(12).fill(Math.round(completed / 12)),
            elective_incomplete: Array(12).fill(Math.round(incomplete / 12)),
            // Also store totals for legend
            totals: {
                appointive: appointive,
                completed: completed,
                incomplete: incomplete
            }
        };
        
    } catch (error) {
        console.error('❌ [FETCH] Error:', error);
        console.error('❌ [FETCH] Stack:', error.stack);
        throw error;
    }
}let eligibilityChartInitializing = false;
let eligibilityRadarChartInstance = null;

// ===== MAIN INITIALIZATION FUNCTION =====
async function initEligibilityRadarChart() {
    // Prevent multiple simultaneous calls
    if (eligibilityChartInitializing) {
        console.log('⚠️ [ELIGIBILITY] Already initializing, skipping...');
        return;
    }
    
    eligibilityChartInitializing = true;
    console.log('📊 [ELIGIBILITY] Starting chart initialization...');
    
    try {
        const canvas = document.getElementById('eligibilityRadarChart');
        if (!canvas) {
            console.error('❌ [ELIGIBILITY] Canvas #eligibilityRadarChart not found in HTML');
            return;
        }
        
        if (typeof Chart === 'undefined') {
            console.error('❌ [ELIGIBILITY] Chart.js library not loaded');
            return;
        }
        
        console.log('✅ [ELIGIBILITY] Canvas and Chart.js found');
        const ctx = canvas.getContext('2d');
        const existingChart = Chart.getChart('eligibilityRadarChart');
        if (existingChart) {
            console.log('🔄 [ELIGIBILITY] Destroying existing chart instance...');
            existingChart.destroy();
        }
        
        if (eligibilityRadarChartInstance && typeof eligibilityRadarChartInstance.destroy === 'function') {
            eligibilityRadarChartInstance.destroy();
            eligibilityRadarChartInstance = null;
        }
        console.log('📡 [ELIGIBILITY] Calling API: /api/eligibility/analytics/');
        
        const response = await fetch('/api/eligibility/analytics/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 [ELIGIBILITY] Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [ELIGIBILITY] API Error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 [ELIGIBILITY] API Response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'API returned success: false');
        }
        
        // Extract data
        let appointive, completed, incomplete;
        if (Array.isArray(data.appointive)) {
            appointive = data.appointive.length > 0 ? data.appointive[0] : 0;
        } else {
            appointive = data.appointive || 0;
        }
        
        if (Array.isArray(data.elective_completed)) {
            completed = data.elective_completed.length > 0 ? data.elective_completed[0] : 0;
        } else {
            completed = data.elective_completed || 0;
        }
        
        if (Array.isArray(data.elective_incomplete)) {
            incomplete = data.elective_incomplete.length > 0 ? data.elective_incomplete[0] : 0;
        } else {
            incomplete = data.elective_incomplete || 0;
        }
        
        const total = appointive + completed + incomplete;
        
        console.log('📊 [ELIGIBILITY] Final Chart Data:', {
            appointive: appointive,
            completed: completed,
            incomplete: incomplete,
            total: total
        });
        
        if (total === 0) {
            console.warn('⚠️ [ELIGIBILITY] No data available - showing empty state');
            showEmptyChartState(canvas);
            updateLegendTotals(0, 0, 0);
            return;
        }
        
        // ✅ FIX: Changed to 'radar' type and proper dataset structure
        eligibilityRadarChartInstance = new Chart(ctx, {
            type: 'radar',  // ← CHANGED from 'polarArea'
            data: {
                // ✅ Categories as labels (these become the axes)
                labels: ['Appointive', 'Elective-Completed', 'Elective-Incomplete'],
                datasets: [
                    {
                        label: 'Approved',
                        data: [appointive, completed, incomplete],
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(59, 130, 246)',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false  // We have custom legend below
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.r || 0;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: Math.max(appointive, completed, incomplete) + 5, // Add some padding
                        ticks: {
                            stepSize: 5,
                            font: { 
                                size: 11,
                                weight: '500'
                            },
                            color: '#6b7280',
                            backdropColor: 'transparent',
                            callback: function(value) {
                                // Only show integer values
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        pointLabels: {
                            display: true,
                            centerPointLabels: false,
                            font: {
                                size: 13,
                                weight: '600'
                            },
                            color: '#374151',
                            padding: 10
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)',
                            circular: true
                        },
                        angleLines: {
                            color: 'rgba(156, 163, 175, 0.3)'
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2,
                        tension: 0.1
                    }
                }
            }
        });
        
        updateLegendTotals(appointive, completed, incomplete);
        
        console.log('✅ [ELIGIBILITY] Radar chart created successfully!');
        console.log('   Chart instance:', eligibilityRadarChartInstance);
        
    } catch (error) {
        console.error('❌ [ELIGIBILITY] Error creating chart:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        showChartError(canvas, error.message);
    } finally {
        eligibilityChartInitializing = false;
    }
}

function updateLegendTotals(appointive, completed, incomplete) {
    console.log('📝 [ELIGIBILITY] Updating legend totals...');
    
    const appointiveEl = document.getElementById('appointive-total');
    const completedEl = document.getElementById('elective-completed-total');
    const incompleteEl = document.getElementById('elective-incomplete-total');
    
    if (appointiveEl) {
        appointiveEl.textContent = appointive;
        console.log('   ✅ Appointive total updated:', appointive);
    }
    
    if (completedEl) {
        completedEl.textContent = completed;
        console.log('   ✅ Completed total updated:', completed);
    }
    
    if (incompleteEl) {
        incompleteEl.textContent = incomplete;
        console.log('   ✅ Incomplete total updated:', incomplete);
    }
}

// ===== HELPER: SHOW EMPTY STATE =====
function showEmptyChartState(canvas) {
    const container = canvas.parentElement;
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; padding: 20px; text-align: center;">
                <i class="fas fa-chart-pie" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                <p style="color: #6b7280; margin-bottom: 8px; font-weight: 600;">No Certification Data Yet</p>
                <p style="color: #9ca3af; font-size: 14px;">
                    Eligibility certifications will appear here once submitted and approved.
                </p>
            </div>
        `;
    }
}

// ===== HELPER: SHOW ERROR STATE =====
function showChartError(canvas, message) {
    const container = canvas ? canvas.parentElement : null;
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <p style="color: #6b7280; margin-bottom: 8px; font-weight: 600;">Failed to Load Chart</p>
                <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">${message}</p>
                <button onclick="initEligibilityRadarChart()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== MANUAL REFRESH FUNCTION =====
window.updateEligibilityRadarChart = function() {
    console.log('🔄 [ELIGIBILITY] Manual refresh triggered');
    initEligibilityRadarChart();
};

// ===== EXPORT TO WINDOW =====
window.initEligibilityRadarChart = initEligibilityRadarChart;

// ===== SINGLE INITIALIZATION POINT =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [ELIGIBILITY] DOM loaded - scheduling chart initialization');
    
    // Wait for dashboard to be ready
    setTimeout(() => {
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            console.log('🚀 [ELIGIBILITY] Dashboard active on page load - initializing chart');
            initEligibilityRadarChart();
        }
    }, 2000);
    
    // Re-initialize when dashboard menu is clicked
    const dashboardMenuItem = document.querySelector('.menu-item[data-page="dashboard"]');
    if (dashboardMenuItem) {
        dashboardMenuItem.addEventListener('click', () => {
            console.log('🖱️ [ELIGIBILITY] Dashboard menu clicked - initializing chart');
            setTimeout(() => {
                initEligibilityRadarChart();
            }, 500);
        });
    }
});

console.log('✅ [ELIGIBILITY] Radar chart module loaded and ready');



// ===== INITIALIZE NOTIFICATION BELL =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize notification bell
    setTimeout(() => {
        notificationBell = new NotificationBell();
        console.log('🔔 Notification Bell instantiated');
    }, 1000); // Wait 1 second for page to be ready
});
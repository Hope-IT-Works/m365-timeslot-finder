// Main popup script

// Constants
const MAX_DISPLAYED_SLOTS = 10;
const PARTICIPANT_SEARCH_DEBOUNCE = 300;
const TOAST_DURATION = 3000;
const COPIED_FEEDBACK_DURATION = 2000;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize services
    const authManager = new AuthManager();
    const graphAPI = new GraphAPI(authManager);

    // DOM Elements
    const authSection = document.getElementById('authSection');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userInitials = document.getElementById('userInitials');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userTenant = document.getElementById('userTenant');
    const mainForm = document.getElementById('mainForm');
    const timeslotForm = document.getElementById('timeslotForm');
    const participantSearch = document.getElementById('participantSearch');
    const participantsList = document.getElementById('participantsList');
    const selectedParticipants = document.getElementById('selectedParticipants');
    const loadingState = document.getElementById('loadingState');
    const resultsSection = document.getElementById('resultsSection');
    const slotsList = document.getElementById('slotsList');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const toast = document.getElementById('toast');
    const newSearchBtn = document.getElementById('newSearchBtn');
    const themeToggle = document.getElementById('themeToggle');
    const settingsBtn = document.getElementById('settingsBtn');
    const userSettingsBtn = document.getElementById('userSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const clientIdInput = document.getElementById('clientIdInput');
    const redirectUriDisplay = document.getElementById('redirectUriDisplay');
    const copyRedirectBtn = document.getElementById('copyRedirectBtn');
    const azureTabBtn = document.getElementById('azureTabBtn');
    const templateTabBtn = document.getElementById('templateTabBtn');
    const generalTabBtn = document.getElementById('generalTabBtn');
    const azureTabContent = document.getElementById('azureTabContent');
    const templateTabContent = document.getElementById('templateTabContent');
    const generalTabContent = document.getElementById('generalTabContent');
    const aboutTabBtn = document.getElementById('aboutTabBtn');
    const aboutTabContent = document.getElementById('aboutTabContent');
    const aboutVersionText = document.getElementById('aboutVersionText');
    const templateInput = document.getElementById('templateInput');
    const templatePreview = document.getElementById('templatePreview');
    const resetTemplateBtn = document.getElementById('resetTemplateBtn');
    const templateHighlightContent = document.getElementById('templateHighlightContent');
    const startDateTimeEl = document.getElementById('startDateTime');
    const endDateTimeEl = document.getElementById('endDateTime');
    const findSlotsBtn = document.getElementById('findSlotsBtn');
    const dateRangeError = document.getElementById('dateRangeError');
    const languageSelect = document.getElementById('languageSelect');

    // Wait for translations to be loaded before continuing
    await i18n.initPromise;
    i18n.applyToDOM();


    // State
    let selectedUsers = [];
    let searchTimeout = null;
    let currentTemplate = GraphAPI.DEFAULT_TEMPLATE;
    let activeSettingsTab = 'general';

    // Initialize theme
    initializeTheme();

    // Initialize default date/time values
    initializeDateTime();

    // Load output template from storage
    chrome.storage.local.get(['outputTemplate'], (result) => {
        if (result.outputTemplate) {
            currentTemplate = result.outputTemplate;
        }
    });

    // Check authentication status
    checkAuthStatus();

    // Event Listeners
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    timeslotForm.addEventListener('submit', handleFormSubmit);
    participantSearch.addEventListener('input', handleParticipantSearch);
    newSearchBtn.addEventListener('click', handleNewSearch);
    themeToggle.addEventListener('click', toggleTheme);
    settingsBtn.addEventListener('click', openSettings);
    userSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    cancelSettingsBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    copyRedirectBtn.addEventListener('click', copyRedirectUri);
    startDateTimeEl.addEventListener('input', validateDateRange);
    endDateTimeEl.addEventListener('input', validateDateRange);
    azureTabBtn.addEventListener('click', () => switchSettingsTab('azure'));
    templateTabBtn.addEventListener('click', () => switchSettingsTab('template'));
    generalTabBtn.addEventListener('click', () => switchSettingsTab('general'));
    aboutTabBtn.addEventListener('click', () => switchSettingsTab('about'));
    resetTemplateBtn.addEventListener('click', resetTemplate);
    templateInput.addEventListener('input', updateTemplatePreview);
    templateInput.addEventListener('scroll', () => {
        templateHighlightContent.style.transform = `translateY(-${templateInput.scrollTop}px)`;
    });
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => insertTemplateVariable(chip.dataset.var));
    });

    // Functions
    function initializeTheme() {
        // Load theme from storage
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
        });
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save theme preference
        chrome.storage.local.set({ theme: newTheme });
    }
    function initializeDateTime() {
        const now = new Date();
        
        // Find next weekday (Mo-Fr)
        const nextWeekday = getNextWeekday(now);
        nextWeekday.setHours(10, 0, 0, 0);

        const endDate = new Date(nextWeekday);
        endDate.setHours(17, 0, 0, 0);

        const startInput = document.getElementById('startDateTime');
        const endInput = document.getElementById('endDateTime');
        
        // Always set values, even if they already have values
        if (startInput) {
            startInput.value = formatDateTimeLocal(nextWeekday);
        }
        if (endInput) {
            endInput.value = formatDateTimeLocal(endDate);
        }
        validateDateRange();
    }

    function validateDateRange() {
        const start = startDateTimeEl.value ? new Date(startDateTimeEl.value) : null;
        const end = endDateTimeEl.value ? new Date(endDateTimeEl.value) : null;
        const isInvalid = start && end && start >= end;
        dateRangeError.style.display = isInvalid ? 'flex' : 'none';
        findSlotsBtn.disabled = !!isInvalid;
    }

    function getNextWeekday(date) {
        const result = new Date(date);
        result.setDate(result.getDate() + 1);
        
        // If Saturday (6) or Sunday (0), move to next Monday
        while (result.getDay() === 0 || result.getDay() === 6) {
            result.setDate(result.getDate() + 1);
        }
        
        return result;
    }

    function formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async function checkAuthStatus() {
        try {
            const profile = await authManager.getUserProfile();
            showUserInfo(profile);
            
            // Add current user as default participant if not already added
            if (selectedUsers.length === 0) {
                addCurrentUserAsParticipant(profile);
            }
        } catch (error) {
            showAuthSection();
            // Show setup hint if no client ID is configured yet
            await authManager.initPromise;
            const setupHint = document.getElementById('setupHint');
            const authMessage = document.querySelector('.auth-message');
            if (!authManager.clientId) {
                setupHint.style.display = 'flex';
                loginBtn.disabled = true;
                authMessage.style.display = 'none';
            } else {
                setupHint.style.display = 'none';
                loginBtn.disabled = false;
                authMessage.style.display = 'block';
            }
        }
    }

    function addCurrentUserAsParticipant(profile) {
        const currentUser = {
            id: profile.id,
            displayName: profile.displayName + i18n.getMessage('currentUserSuffix'),
            mail: profile.mail || profile.userPrincipalName,
            userPrincipalName: profile.userPrincipalName
        };
        
        // Check if user is not already added
        if (!selectedUsers.find(u => u.id === currentUser.id)) {
            selectedUsers.push(currentUser);
            updateSelectedParticipants();
        }
    }

    async function handleLogin() {
        try {
            loginBtn.disabled = true;
            loginBtn.textContent = i18n.getMessage('toastLoginLoading');

            await authManager.initPromise;
            if (!authManager.clientId) {
                showToast(i18n.getMessage('toastNoClientId'), 'error');
                openSettings();
                return;
            }

            await authManager.getAccessToken();
            const profile = await authManager.getUserProfile();
            showUserInfo(profile);
            
            // Add current user as default participant
            addCurrentUserAsParticipant(profile);
            
            showToast(i18n.getMessage('toastLoginSuccess'), 'success');
        } catch (error) {
            showToast(i18n.getMessage('toastLoginError') + ': ' + error.message, 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="9" height="9" fill="#F25022"/>
                    <rect x="11" width="9" height="9" fill="#7FBA00"/>
                    <rect y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                ${i18n.getMessage('loginBtn')}
            `;
        }
    }

    async function handleLogout() {
        try {
            await authManager.logout();
            // Clear user profile from memory
            authManager.userProfile = null;
            // Reset form
            selectedUsers = [];
            updateSelectedParticipants();
            // Clear form fields
            timeslotForm.reset();
            // Hide results
            resultsSection.style.display = 'none';
            showAuthSection();
            showToast(i18n.getMessage('toastLogoutSuccess'), 'success');
        } catch (error) {
            showToast(i18n.getMessage('toastLogoutError') + ': ' + error.message, 'error');
        }
    }

    function showUserInfo(profile) {
        const initials = getInitials(profile.displayName);
        userInitials.textContent = initials;
        userName.textContent = profile.displayName;
        userEmail.textContent = profile.mail || profile.userPrincipalName;
        const upn = profile.userPrincipalName || '';
        const tenantDomain = upn.includes('@') ? upn.split('@')[1] : '';
        userTenant.innerHTML = tenantDomain
            ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a3 3 0 0 1 6 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${tenantDomain}`
            : '';

        // Show authSection but hide login card, show user info
        authSection.style.display = 'block';
        authSection.querySelector('.auth-card').style.display = 'none';
        userInfo.style.display = 'flex';
        mainForm.style.display = 'block';
        
        // Ensure date/time fields are initialized when showing form
        setTimeout(() => initializeDateTime(), 100);
    }

    function showAuthSection() {
        authSection.style.display = 'block';
        authSection.querySelector('.auth-card').style.display = 'block';
        userInfo.style.display = 'none';
        mainForm.style.display = 'none';
    }

    function getInitials(name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    async function handleParticipantSearch(e) {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        if (query.length < 2) {
            participantsList.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const users = await graphAPI.searchUsers(query);
                displayParticipants(users);
            } catch (error) {
                showToast(i18n.getMessage('toastSearchError') + ': ' + error.message, 'error');
            }
        }, PARTICIPANT_SEARCH_DEBOUNCE);
    }

    function displayParticipants(users) {
        participantsList.innerHTML = '';

        users.forEach(user => {
            // Skip if already selected
            if (selectedUsers.find(u => u.id === user.id)) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'participant-item';
            item.innerHTML = `
                <input type="checkbox" class="participant-checkbox" data-user-id="${user.id}">
                <div class="participant-info">
                    <div class="participant-name">${user.displayName}</div>
                    <div class="participant-email">${user.mail || user.userPrincipalName}</div>
                </div>
            `;

            const checkbox = item.querySelector('.participant-checkbox');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    addParticipant(user);
                }
            });

            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            participantsList.appendChild(item);
        });
    }

    function addParticipant(user) {
        if (selectedUsers.find(u => u.id === user.id)) {
            return;
        }

        selectedUsers.push(user);
        updateSelectedParticipants();
        participantSearch.value = '';
        participantsList.innerHTML = '';
    }

    function removeParticipant(userId) {
        selectedUsers = selectedUsers.filter(u => u.id !== userId);
        updateSelectedParticipants();
    }

    function updateSelectedParticipants() {
        selectedParticipants.innerHTML = '';

        selectedUsers.forEach(user => {
            const tag = document.createElement('div');
            tag.className = 'selected-participant';
            tag.innerHTML = `
                <span>${user.displayName}</span>
                <button type="button" class="remove-participant" data-user-id="${user.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            `;

            tag.querySelector('.remove-participant').addEventListener('click', () => {
                removeParticipant(user.id);
            });

            selectedParticipants.appendChild(tag);
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // Get form values
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
        const duration = parseInt(document.getElementById('duration').value);

        // Validation
        if (!startDateTime || !endDateTime) {
            showToast(i18n.getMessage('validationDateRequired'), 'error');
            return;
        }

        const start = new Date(startDateTime);
        const end = new Date(endDateTime);

        if (start >= end) {
            showToast(i18n.getMessage('validationEndAfterStart'), 'error');
            return;
        }

        if (start < new Date()) {
            showToast(i18n.getMessage('validationStartFuture'), 'error');
            return;
        }

        if (selectedUsers.length === 0) {
            showToast(i18n.getMessage('validationParticipants'), 'error');
            return;
        }

        // Show loading state
        timeslotForm.style.display = 'none';
        loadingState.style.display = 'flex';
        resultsSection.style.display = 'none';
        noResults.style.display = 'none';

        try {
            // Get attendee emails (without current user - API does this automatically)
            const attendeeEmails = selectedUsers.map(u => u.mail || u.userPrincipalName);

            // Find meeting times using Microsoft Graph API
            const apiResponse = await graphAPI.findMeetingTimes(
                attendeeEmails,
                start.toISOString(),
                end.toISOString(),
                duration
            );

            // Process the suggestions with time boundaries
            const availableSlots = graphAPI.processMeetingTimeSuggestions(
                apiResponse,
                start.toISOString(),
                end.toISOString()
            );

            // Display results
            displayResults(availableSlots, duration);
        } catch (error) {
            showToast(i18n.getMessage('toastSlotSearchError') + ': ' + error.message, 'error');
            timeslotForm.style.display = 'block';
        } finally {
            loadingState.style.display = 'none';
        }
    }

    function displayResults(slots, duration) {
        timeslotForm.style.display = 'block';

        if (slots.length === 0) {
            noResults.style.display = 'flex';
            return;
        }

        // Group consecutive slots
        const groups = graphAPI.groupConsecutiveSlots(slots);

        resultsSection.style.display = 'block';
        resultsCount.textContent = groups.length === 1
            ? i18n.getMessage('resultCountSingular')
            : i18n.getMessage('resultCountPlural', [String(groups.length)]);
        slotsList.innerHTML = '';

        // Limit to maximum displayed groups
        const displayGroups = groups.slice(0, MAX_DISPLAYED_SLOTS);

        // Add "Copy All" button FIRST if there are multiple groups
        if (displayGroups.length > 1) {
            const copyAllBtn = createCopyAllButton(displayGroups, duration);
            slotsList.appendChild(copyAllBtn);
        }

        // Then add all slot cards
        displayGroups.forEach((group, index) => {
            const formatted = graphAPI.formatSlotGroup(group, duration, currentTemplate, null);
            const card = createSlotCard(formatted, index);
            slotsList.appendChild(card);
        });
    }

    function createSlotCard(formattedSlot, index) {
        const card = document.createElement('div');
        card.className = 'slot-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const clockSuffix = i18n.getMessage('timeUnitClock');
        card.innerHTML = `
            <div class="slot-content">
                <div class="slot-date">${formattedSlot.date}</div>
                <div class="slot-time">${formattedSlot.startTime} - ${formattedSlot.endTime}${clockSuffix ? ' ' + clockSuffix : ''}</div>
            </div>
            <div class="slot-actions">
                <button type="button" class="btn btn-copy" data-copy-text="${escapeHtml(formattedSlot.copyText)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    ${i18n.getMessage('copyBtn')}
                </button>
            </div>
        `;

        const copyBtn = card.querySelector('.btn-copy');
        copyBtn.addEventListener('click', () => {
            copyToClipboard(formattedSlot.copyText, copyBtn);
        });

        return card;
    }

    function createCopyAllButton(groups, duration) {
        const container = document.createElement('div');
        container.className = 'copy-all-container';
        container.style.marginBottom = 'var(--spacing-lg)';
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary';
        button.style.width = '100%';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${i18n.getMessage('copyAllBtn')} (${groups.length})
        `;
        
        button.addEventListener('click', () => {
            const allText = groups
                .map((group, idx) => {
                    const formatted = graphAPI.formatSlotGroup(group, duration, currentTemplate, idx + 1);
                    return formatted.copyText;
                })
                .join('\n\n');
            copyToClipboard(allText, button);
        });
        
        container.appendChild(button);
        return container;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            const originalHTML = button.innerHTML;
            button.classList.add('copied');
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${i18n.getMessage('copiedBtn')}
            `;

            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = originalHTML;
            }, COPIED_FEEDBACK_DURATION);

            showToast(i18n.getMessage('toastCopySuccess'), 'success');
        } catch (error) {
            showToast(i18n.getMessage('toastCopyError') + ': ' + error.message, 'error');
        }
    }

    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, TOAST_DURATION);
    }

    function handleNewSearch() {
        // Hide results
        resultsSection.style.display = 'none';
        noResults.style.display = 'none';
        
        // Show form
        timeslotForm.style.display = 'block';
        
        // Reset form values to defaults
        initializeDateTime();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openSettings() {
        // Load current settings
        chrome.storage.local.get(['azureClientId', 'outputTemplate', 'language'], (result) => {
            clientIdInput.value = result.azureClientId || authManager.clientId;
            templateInput.value = result.outputTemplate || GraphAPI.DEFAULT_TEMPLATE;
            languageSelect.value = result.language || 'auto';
            updateTemplatePreview();
        });
        
        // Show redirect URI
        redirectUriDisplay.textContent = chrome.identity.getRedirectURL();

        // Show extension version in About tab
        const manifest = chrome.runtime.getManifest();
        aboutVersionText.textContent = `v${manifest.version}`;

        // Reset to General tab
        switchSettingsTab('general');
        
        // Show modal
        settingsModal.style.display = 'flex';
    }

    function closeSettings() {
        settingsModal.style.display = 'none';
    }

    function saveSettings() {
        // Always save template
        const newTemplate = templateInput.value;
        if (newTemplate.trim()) {
            currentTemplate = newTemplate;
            chrome.storage.local.set({ outputTemplate: newTemplate });
        }

        // Save language and re-apply translations
        i18n.setLanguage(languageSelect.value).then(() => updateTemplatePreview());

        // Validate and save Client ID only when on Azure tab
        if (activeSettingsTab === 'azure') {
            const newClientId = clientIdInput.value.trim();

            if (!newClientId) {
                showToast(i18n.getMessage('validationClientIdRequired'), 'error');
                return;
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(newClientId)) {
                showToast(i18n.getMessage('validationClientIdFormat'), 'error');
                return;
            }

            chrome.storage.local.set({ azureClientId: newClientId }, () => {
                authManager.clientId = newClientId;
                // Hide setup hint and enable login button now that a client ID is set
                const setupHint = document.getElementById('setupHint');
                const authMessage = document.querySelector('.auth-message');
                setupHint.style.display = 'none';
                loginBtn.disabled = false;
                authMessage.style.display = 'block';
            });

            showToast(i18n.getMessage('toastSettingsSavedReLogin'), 'success');
            closeSettings();

            if (authManager.isAuthenticated()) {
                handleLogout();
            }
        } else {
            showToast(i18n.getMessage('toastSettingsSaved'), 'success');
            closeSettings();
        }
    }

    function switchSettingsTab(tab) {
        activeSettingsTab = tab;
        generalTabBtn.classList.toggle('active', tab === 'general');
        azureTabBtn.classList.toggle('active', tab === 'azure');
        templateTabBtn.classList.toggle('active', tab === 'template');
        aboutTabBtn.classList.toggle('active', tab === 'about');
        generalTabContent.style.display = tab === 'general' ? 'block' : 'none';
        azureTabContent.style.display = tab === 'azure' ? 'block' : 'none';
        templateTabContent.style.display = tab === 'template' ? 'block' : 'none';
        aboutTabContent.style.display = tab === 'about' ? 'block' : 'none';
    }

    function updateTemplatePreview() {
        const previewData = {
            date: i18n.getMessage('previewDate'),
            weekday: i18n.getMessage('previewWeekday'),
            weekday_short: i18n.getMessage('previewWeekdayShort'),
            date_short: i18n.getMessage('previewDateShort'),
            day: '2',
            day_long: '02',
            month: '2',
            month_long: '02',
            month_name: i18n.getMessage('previewMonthName'),
            month_name_short: i18n.getMessage('previewMonthNameShort'),
            year: '2026',
            start_time: '11:00',
            end_time: '12:00',
            duration: '30',
            number: '1',
            number_dot: '.',
            number_space: ' '
        };
        templatePreview.textContent = GraphAPI.renderTemplate(templateInput.value, previewData);
        updateTemplateHighlight();
    }

    function updateTemplateHighlight() {
        let content = templateInput.value;
        // Escape HTML entities to prevent XSS in innerHTML
        content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // Wrap {{...}} patterns with a highlight mark
        content = content.replace(/\{\{([^}\s]+)\}\}/g, '<mark class="ph">{{$1}}</mark>');
        // Preserve newlines
        content = content.replace(/\n/g, '<br>');
        // Ensure the last trailing newline is visible
        if (templateInput.value.endsWith('\n')) {
            content += ' ';
        }
        templateHighlightContent.innerHTML = content;
    }

    function resetTemplate() {
        templateInput.value = GraphAPI.DEFAULT_TEMPLATE;
        updateTemplatePreview();
    }

    function insertTemplateVariable(varName) {
        const start = templateInput.selectionStart;
        const end = templateInput.selectionEnd;
        const value = templateInput.value;
        templateInput.value = value.substring(0, start) + varName + value.substring(end);
        templateInput.selectionStart = templateInput.selectionEnd = start + varName.length;
        templateInput.focus();
        updateTemplatePreview();
    }

    function copyRedirectUri() {
        const uri = chrome.identity.getRedirectURL();
        navigator.clipboard.writeText(uri).then(() => {
            const originalText = copyRedirectBtn.textContent;
            copyRedirectBtn.textContent = i18n.getMessage('toastUriCopied');
            setTimeout(() => {
                copyRedirectBtn.textContent = originalText;
            }, COPIED_FEEDBACK_DURATION);
        });
    }
});

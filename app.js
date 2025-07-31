document.addEventListener('DOMContentLoaded', () => {

    // --- API & STATE MANAGEMENT ---
    // IMPORTANT: Replace with your actual key. If this is wrong, the API will fail.
    const API_KEY = '58e445bademshade0c4ba4a0db23p1e7881jsn6dd9790c5a52'; 
    const JOBS_PER_PAGE = 2;
    let state = {
        savedJobs: new Set(),
        appliedJobs: new Set(),
        profileStrength: 10,
        currentPage: 1,
        allJobs: [], // This acts as a cache for the last search results
    };

    // --- ELEMENT SELECTORS ---
    const elements = {
        wrapper: document.getElementById('dashboard-wrapper'),
        mainContent: document.querySelector('.main-content'),
        sidebar: document.getElementById('sidebar'),
        sidebarNavLinks: document.querySelectorAll('.sidebar-nav a'),
        sidebarCollapseBtn: document.getElementById('sidebar-collapse-btn'),
        mobileSidebarToggle: document.getElementById('mobile-sidebar-toggle'),
        contentSections: document.querySelectorAll('.content-section'),
        dashboardContent: document.getElementById('dashboard-content'),
        savedJobsContent: document.getElementById('saved-jobs-content'),
        applicationsContent: document.getElementById('applications-content'),
        settingsContent: document.getElementById('settings-content'),
        profileProgress: document.getElementById('profile-progress'),
        profileProgressText: document.getElementById('profile-progress-text'),
        modal: document.getElementById('job-modal'),
        modalOverlay: document.getElementById('job-modal-overlay'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalJobTitle: document.getElementById('modal-job-title'),
        modalEmployerLogo: document.getElementById('modal-employer-logo'),
        modalEmployerName: document.getElementById('modal-employer-name'),
        modalJobLocation: document.getElementById('modal-job-location'),
        modalQualifications: document.getElementById('modal-qualifications'),
        modalResponsibilities: document.getElementById('modal-responsibilities'),
        modalApplyBtn: document.getElementById('modal-apply-btn'),
    };

    // --- EVENT LISTENERS ---
    elements.sidebarCollapseBtn.addEventListener('click', toggleSidebarCollapse);
    elements.mobileSidebarToggle.addEventListener('click', () => elements.sidebar.classList.toggle('active'));
    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
    
    elements.sidebarNavLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.target); });
    });

    // --- NAVIGATION & PAGE RENDERING ---
    function navigateTo(targetId) {
        elements.sidebarNavLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`.sidebar-nav a[data-target="${targetId}"]`).classList.add('active');
        elements.contentSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        targetSection.classList.add('active');

        switch (targetId) {
            case 'dashboard-content':
                renderDashboard();
                break;
            case 'saved-jobs-content':
                renderSavedJobsPage();
                break;
            case 'applications-content':
                renderApplicationsPage();
                break;
            case 'settings-content':
                renderSettingsPage();
                break;
        }
    }

    function renderDashboard() {
        elements.dashboardContent.innerHTML = `
            <div class="main-header"><input type="search" id="search-input" placeholder="Search by title..." autocomplete="off"/><button id="search-btn" class="btn">Search</button></div>
            <div class="dashboard-grid">
                <div class="stat-card jobs-applied"><h4>Jobs Applied</h4><p id="jobs-applied-count">${state.appliedJobs.size}</p></div>
                <div class="stat-card saved-jobs"><h4>Saved Jobs</h4><p id="saved-jobs-count">${state.savedJobs.size}</p></div>
                <div class="stat-card recommendations"><h4>Recommendations</h4><p id="recommendations-count">${state.allJobs.length}</p></div>
                <div class="card filters-card">
                    <h3><i class="fas fa-filter"></i> Filters</h3>
                    <div class="filter-group"><label for="category-select">Category</label><select id="category-select"><option value="">All Categories</option><option value="Software Engineer">Software & IT</option><option value="Marketing Manager">Marketing & Sales</option><option value="Graphic Designer">Design & Creative</option><option value="Accountant">Finance & Accounting</option><option value="Registered Nurse">Healthcare</option><option value="Project Manager">Project Management</option></select></div>
                    <div class="filter-group"><label for="location-input">Location</label><input type="text" id="location-input" placeholder="e.g., New York, NY"></div>
                    <button id="apply-filters-btn" class="btn">Apply Filters</button>
                </div>
                <div class="card jobs-container-card"><div id="jobs-list"></div><div class="pagination-controls" id="pagination-controls" style="display: none;"><button id="prev-page-btn" class="pagination-btn" disabled>« Previous</button><span id="page-info">Page 1</span><button id="next-page-btn" class="pagination-btn">Next »</button></div></div>
            </div>`;
        reassignDashboardElements();
        // If we already have jobs, display them from cache instead of re-fetching
        if (state.allJobs.length > 0) {
            displayPage();
        } else {
            fetchJobs();
        }
    }

    function renderSavedJobsPage() { renderJobListPage(elements.savedJobsContent, 'Saved Jobs', state.savedJobs); }
    function renderApplicationsPage() { renderJobListPage(elements.applicationsContent, 'My Applications', state.appliedJobs); }

    function renderJobListPage(container, title, jobSet) {
        let content = `<h1 class="page-header">${title}</h1><div class="job-list-grid">`;
        const jobsFromCache = state.allJobs.filter(job => jobSet.has(job.job_id));
        if (jobsFromCache.length === 0) {
            content += `<p class="empty-state-text">You have no ${title.toLowerCase()} yet, or they are not in the latest search results.</p>`;
        } else {
            jobsFromCache.forEach(job => content += createJobCardHTML(job));
        }
        content += `</div>`;
        container.innerHTML = content;
    }
    
    function renderSettingsPage() {
        elements.settingsContent.innerHTML = `<h1 class="page-header">Settings</h1><div class="settings-form"><div class="card"><h3><i class="fas fa-user-circle"></i> Profile Information</h3><div class="form-row"><div class="form-group"><label>Full Name</label></div><input type="text" value="Diane Ingabire"></div><div class="form-row"><div class="form-group"><label>Email Address</label></div><input type="email" value="diane.ingabire@example.com"></div><div class="form-row"><div class="form-group"><label>Change Password</label></div><input type="password" placeholder="New Password"></div></div><div class="card"><h3><i class="fas fa-bell"></i> Notifications</h3><div class="form-row"><div class="form-group"><label>New Job Recommendations</label><p>Send an email when new jobs match your profile.</p></div><label class="toggle-switch"><input type="checkbox" checked><span class="slider"></span></label></div><div class="form-row"><div class="form-group"><label>Application Status Updates</label><p>Notify me when an employer views my application.</p></div><label class="toggle-switch"><input type="checkbox" checked><span class="slider"></span></label></div><div class="form-row"><div class="form-group"><label>Weekly Newsletter</label><p>Receive our weekly roundup of top jobs.</p></div><label class="toggle-switch"><input type="checkbox"><span class="slider"></span></label></div></div></div>`;
    }

    // --- CORE JOB & MODAL LOGIC ---
    async function fetchJobs() {
        const jobsList = document.getElementById('jobs-list');
        if (!API_KEY || API_KEY === 'YOUR_ACTUAL_RAPIDAPI_KEY_HERE') {
            jobsList.innerHTML = `<p class="loading-text" style="color: #d9534f;"><strong>Error: API Key Missing.</strong><br>Please add your RapidAPI key to app.js.</p>`;
            return;
        }
        let query = document.getElementById('search-input').value.trim() || document.getElementById('category-select').value || 'Project Manager';
        jobsList.innerHTML = `<p class="loading-text">Searching for jobs...</p>`;
        let apiUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=5`;
        try {
            const response = await fetch(apiUrl, { headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } });
            
            // **FIX for 429 Error:**
            if (response.status === 429) {
                throw new Error(`API Error 429: Too Many Requests. You have exceeded your daily/monthly limit. Please wait or upgrade your plan on RapidAPI.`);
            }
            if (!response.ok) throw new Error(`API returned status ${response.status}. See Network tab for details.`);

            const data = await response.json();
            state.allJobs = data.data || [];
            updateDashboardStats();
            state.currentPage = 1;
            displayPage();
        } catch (error) {
            console.error("Fetch Error:", error);
            jobsList.innerHTML = `<p class="loading-text" style="color: #d9534f;"><strong>Error: Could not fetch jobs.</strong><br>${error.message}</p>`;
        }
    }

    function displayPage() {
        const jobsList = document.getElementById('jobs-list');
        const startIndex = (state.currentPage - 1) * JOBS_PER_PAGE;
        const endIndex = startIndex + JOBS_PER_PAGE;
        const jobsForPage = state.allJobs.slice(startIndex, endIndex);
        jobsList.innerHTML = '';
        if (jobsForPage.length > 0) jobsForPage.forEach(job => jobsList.innerHTML += createJobCardHTML(job));
        else if (state.allJobs.length > 0) jobsList.innerHTML = `<p class="loading-text">No more jobs to show.</p>`;
        else jobsList.innerHTML = `<p class="loading-text">No jobs found.</p>`;
        updatePaginationUI();
    }
    
    function createJobCardHTML(job) {
        const isSaved = state.savedJobs.has(job.job_id);
        return `<div class="job-card" data-job-id="${job.job_id}"><div class="job-card-main"><div class="job-card-header"><img src="${job.employer_logo || 'https://i.imgur.com/DNLN3Q1.png'}" alt="${job.employer_name}" class="job-logo"><div><h4 class="job-title">${job.job_title}</h4><p class="job-company">${job.employer_name || 'N/A'}</p></div></div><div class="job-card-details"><span><i class="fas fa-map-marker-alt"></i> ${job.job_city || 'Remote'}</span><span><i class="fas fa-briefcase"></i> ${job.job_employment_type || 'N/A'}</span></div></div><div class="job-card-actions"><button class="save-btn ${isSaved ? 'saved' : ''}" data-job-id="${job.job_id}">${isSaved ? 'Saved' : 'Save'}</button></div></div>`;
    }

    function openModal(job) {
        elements.modalJobTitle.textContent = job.job_title;
        elements.modalEmployerLogo.src = job.employer_logo || 'https://i.imgur.com/DNLN3Q1.png';
        elements.modalEmployerName.textContent = job.employer_name || 'N/A';
        elements.modalJobLocation.textContent = job.job_is_remote ? 'Remote' : `${job.job_city || ''}, ${job.job_state || ''}`.replace(/, $/, '').replace(/^, /, '');
        elements.modalApplyBtn.href = job.job_apply_link || '#';
        elements.modalApplyBtn.onclick = () => { if (!state.appliedJobs.has(job.job_id)) { state.appliedJobs.add(job.job_id); updateStats(); } };
        elements.modalQualifications.innerHTML = job.job_highlights?.Qualifications?.map(q => `<li>${q}</li>`).join('') || '<li>Not specified</li>';
        elements.modalResponsibilities.innerHTML = job.job_highlights?.Responsibilities?.join('<br><br>') || job.job_description || 'Not specified';
        document.body.classList.add('modal-open');
    }

    function closeModal() { document.body.classList.remove('modal-open'); }

    // --- UI & STATE UPDATES ---
    function updateStats() {
        updateDashboardStats(); // Update dashboard stats if they exist
        // Always update profile strength in the sidebar
        let strength = 10 + (state.savedJobs.size * 5) + (state.appliedJobs.size * 10);
        state.profileStrength = Math.min(strength, 100);
        elements.profileProgress.style.width = `${state.profileStrength}%`;
        elements.profileProgressText.textContent = `${state.profileStrength}% Complete`;
    }

    // **FIX for TypeError:** This function now only updates stats on the dashboard page.
    function updateDashboardStats() {
        const jobsAppliedCount = document.getElementById('jobs-applied-count');
        const savedJobsCount = document.getElementById('saved-jobs-count');
        const recommendationsCount = document.getElementById('recommendations-count');
        // Only update if these elements are currently on the page
        if(jobsAppliedCount && savedJobsCount && recommendationsCount) {
            jobsAppliedCount.textContent = state.appliedJobs.size;
            savedJobsCount.textContent = state.savedJobs.size;
            recommendationsCount.textContent = state.allJobs.length;
        }
    }

    function updatePaginationUI() {
        const paginationControls = document.getElementById('pagination-controls');
        if(!state.allJobs.length || !paginationControls){ if(paginationControls) paginationControls.style.display = 'none'; return; }
        const totalPages = Math.ceil(state.allJobs.length / JOBS_PER_PAGE);
        paginationControls.style.display = 'flex';
        document.getElementById('page-info').textContent = `Page ${state.currentPage} of ${totalPages}`;
        document.getElementById('prev-page-btn').disabled = state.currentPage === 1;
        document.getElementById('next-page-btn').disabled = state.currentPage >= totalPages;
    }

    function toggleSidebarCollapse() {
        const icon = elements.sidebarCollapseBtn.querySelector('i');
        elements.wrapper.classList.toggle('sidebar-collapsed');
        if (elements.wrapper.classList.contains('sidebar-collapsed')) icon.className = 'fas fa-chevron-right';
        else icon.className = 'fas fa-chevron-left';
    }
    
    function reassignDashboardElements() {
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        applyFiltersBtn.addEventListener('click', () => { state.currentPage = 1; fetchJobs(); });
        searchBtn.addEventListener('click', () => { state.currentPage = 1; fetchJobs(); });
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { state.currentPage = 1; fetchJobs(); } });
        prevPageBtn.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; displayPage(); } });
        nextPageBtn.addEventListener('click', () => { state.currentPage++; displayPage(); });
    }

    elements.mainContent.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('save-btn')) {
            const jobId = target.dataset.jobId;
            const isSaved = state.savedJobs.has(jobId);
            if (isSaved) state.savedJobs.delete(jobId);
            else state.savedJobs.add(jobId);
            target.textContent = isSaved ? 'Save' : 'Saved';
            target.classList.toggle('saved', !isSaved);
            updateStats();
        } else {
            const card = target.closest('.job-card-main');
            if (card) {
                const jobId = card.closest('.job-card').dataset.jobId;
                const jobData = state.allJobs.find(job => job.job_id === jobId);
                if (jobData) openModal(jobData);
            }
        }
    });

    // --- INITIAL LOAD ---
    navigateTo('dashboard-content');
    updateStats();
});
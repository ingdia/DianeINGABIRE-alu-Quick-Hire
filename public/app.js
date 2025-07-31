// File: public/app.js (Fully Refined and Working)

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  const JOBS_PER_PAGE = 2;
  let state = {
    savedJobs: new Set(),
    appliedJobs: new Set(),
    profileStrength: 10,
    currentPage: 1,
    allJobs: [],
  };

  // --- ELEMENT SELECTORS ---
  // A central place to define all the HTML elements our script interacts with.
  const elements = {
    wrapper: document.getElementById("dashboard-wrapper"),
    mainContent: document.querySelector(".main-content"),
    sidebar: document.getElementById("sidebar"),
    sidebarNavLinks: document.querySelectorAll(".sidebar-nav a"),
    sidebarCollapseBtn: document.getElementById("sidebar-collapse-btn"),
    mobileSidebarToggle: document.getElementById("mobile-sidebar-toggle"),
    contentSections: document.querySelectorAll(".content-section"),
    dashboardContent: document.getElementById("dashboard-content"),
    savedJobsContent: document.getElementById("saved-jobs-content"),
    applicationsContent: document.getElementById("applications-content"),
    settingsContent: document.getElementById("settings-content"),
    profileProgress: document.getElementById("profile-progress"),
    profileProgressText: document.getElementById("profile-progress-text"),
    userProfileName: document.getElementById("user-profile-name"),
    userProfileEmail: document.getElementById("user-profile-email"),
    modal: document.getElementById("job-modal"),
    modalOverlay: document.getElementById("job-modal-overlay"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    modalJobTitle: document.getElementById("modal-job-title"),
    modalEmployerLogo: document.getElementById("modal-employer-logo"),
    modalEmployerName: document.getElementById("modal-employer-name"),
    modalJobLocation: document.getElementById("modal-job-location"),
    modalQualifications: document.getElementById("modal-qualifications"),
    modalResponsibilities: document.getElementById("modal-responsibilities"),
    modalApplyBtn: document.getElementById("modal-apply-btn"),
  };

  // --- EVENT LISTENERS ---
  // Attach all event listeners with safety checks.
  if (elements.sidebarCollapseBtn)
    elements.sidebarCollapseBtn.addEventListener(
      "click",
      toggleSidebarCollapse
    );
  if (elements.mobileSidebarToggle)
    elements.mobileSidebarToggle.addEventListener("click", () =>
      elements.sidebar.classList.toggle("active")
    );
  if (elements.modalCloseBtn)
    elements.modalCloseBtn.addEventListener("click", closeModal);
  if (elements.modalOverlay)
    elements.modalOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (elements.sidebarNavLinks) {
    elements.sidebarNavLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo(link.dataset.target);
      });
    });
  }

  if (elements.mainContent) {
    elements.mainContent.addEventListener("click", handleMainContentClick);
  }

  // --- NAVIGATION & PAGE RENDERING ---
  function navigateTo(targetId) {
    if (!targetId || !document.getElementById(targetId)) return;

    elements.sidebarNavLinks.forEach((link) => link.classList.remove("active"));
    document
      .querySelector(`.sidebar-nav a[data-target="${targetId}"]`)
      ?.classList.add("active");

    elements.contentSections.forEach((section) =>
      section.classList.remove("active")
    );
    document.getElementById(targetId).classList.add("active");

    switch (targetId) {
      case "dashboard-content":
        renderDashboard();
        break;
      case "saved-jobs-content":
        renderSavedJobsPage();
        break;
      case "applications-content":
        renderApplicationsPage();
        break;
      case "settings-content":
        renderSettingsPage();
        break;
    }
  }

  function renderDashboard() {
    if (!elements.dashboardContent) return;
    elements.dashboardContent.innerHTML = `
            <div class="main-header"><input type="search" id="search-input" placeholder="Search by title..." autocomplete="off"/><button id="search-btn" class="btn">Search</button></div>
            <div class="dashboard-grid">
                <div class="stat-card jobs-applied"><h4>Jobs Applied</h4><p id="jobs-applied-count">${state.appliedJobs.size}</p></div>
                <div class="stat-card saved-jobs"><h4>Saved Jobs</h4><p id="saved-jobs-count">${state.savedJobs.size}</p></div>
                <div class="stat-card recommendations"><h4>Recommendations</h4><p id="recommendations-count">${state.allJobs.length}</p></div>
                <div class="card filters-card">
                    <h3><i class="fas fa-filter"></i> Filters</h3>
                    <div class="filter-group"><label for="category-select">Category</label><select id="category-select"><option value="">All Categories</option><option value="Software Engineer">Software & IT</option><option value="Marketing Manager">Marketing & Sales</option><option value="Project Manager">Project Management</option></select></div>
                    <div class="filter-group"><label for="location-input">Location</label><input type="text" id="location-input" placeholder="e.g., New York, NY"></div>
                    <button id="apply-filters-btn" class="btn">Apply Filters</button>
                </div>
                <div class="card jobs-container-card"><div id="jobs-list"></div><div class="pagination-controls" id="pagination-controls" style="display: none;"><button id="prev-page-btn" class="pagination-btn" disabled>« Previous</button><span id="page-info">Page 1</span><button id="next-page-btn" class="pagination-btn">Next »</button></div></div>
            </div>`;
    reassignDashboardElements();
    if (state.allJobs.length > 0) {
      displayPage();
    } else {
      fetchJobs();
    }
  }

  function renderSavedJobsPage() {
    renderJobListPage(elements.savedJobsContent, "Saved Jobs", state.savedJobs);
  }
  function renderApplicationsPage() {
    renderJobListPage(
      elements.applicationsContent,
      "My Applications",
      state.appliedJobs
    );
  }

  function renderJobListPage(container, title, jobSet) {
    if (!container) return;
    let content = `<h1 class="page-header">${title}</h1><div class="job-list-grid">`;
    const jobsFromCache = state.allJobs.filter((job) => jobSet.has(job.job_id));
    if (jobsFromCache.length === 0) {
      content += `<p class="empty-state-text">You have no ${title.toLowerCase()} yet.</p>`;
    } else {
      jobsFromCache.forEach((job) => (content += createJobCardHTML(job)));
    }
    content += `</div>`;
    container.innerHTML = content;
  }

  function renderSettingsPage() {
    if (!elements.settingsContent) return;
    elements.settingsContent.innerHTML = `<h1 class="page-header">Settings</h1><p>User settings can be configured here.</p>`;
  }

  async function fetchUserProfile() {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) return;
      const data = await response.json();
      if (
        data.success &&
        elements.userProfileName &&
        elements.userProfileEmail
      ) {
        const name = data.email.split("@")[0];
        elements.userProfileName.textContent =
          name.charAt(0).toUpperCase() + name.slice(1);
        elements.userProfileEmail.textContent = data.email;
      }
    } catch (error) {
      console.error("Could not fetch user profile:", error);
      if (elements.userProfileName)
        elements.userProfileName.textContent = "Guest";
    }
  }

  // --- CORE JOB & MODAL LOGIC ---
  async function fetchJobs() {
    const jobsList = document.getElementById("jobs-list");
    if (!jobsList) return;
    const queryInput = document.getElementById("search-input");
    const categorySelect = document.getElementById("category-select");
    const query =
      queryInput?.value.trim() || categorySelect?.value || "Project Manager";

    jobsList.innerHTML = `<p class="loading-text">Searching for jobs...</p>`;
    const apiUrl = `/api/jobs?query=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }
      const data = await response.json();
      state.allJobs = data.data || [];
      updateDashboardStats(); // This was the function call that was previously failing
      state.currentPage = 1;
      displayPage();
    } catch (error) {
      console.error("Fetch Error:", error);
      jobsList.innerHTML = `<p class="loading-text" style="color: #d9534f;"><strong>Error: Could not fetch jobs.</strong><br>${error.message}</p>`;
    }
  }

  function displayPage() {
    const jobsList = document.getElementById("jobs-list");
    if (!jobsList) return;
    const startIndex = (state.currentPage - 1) * JOBS_PER_PAGE;
    const endIndex = startIndex + JOBS_PER_PAGE;
    const jobsForPage = state.allJobs.slice(startIndex, endIndex);
    jobsList.innerHTML = "";
    if (jobsForPage.length > 0) {
      jobsForPage.forEach(
        (job) => (jobsList.innerHTML += createJobCardHTML(job))
      );
    } else {
      jobsList.innerHTML = `<p class="loading-text">No jobs found for this query.</p>`;
    }
    updatePaginationUI();
  }

  function createJobCardHTML(job) {
    const isSaved = state.savedJobs.has(job.job_id);
    const isApplied = state.appliedJobs.has(job.job_id);
    let actionButtonHTML = "";
    if (isApplied) {
      actionButtonHTML = `<span class="applied-badge"><i class="fas fa-check-circle"></i> Applied</span>`;
    } else {
      actionButtonHTML = `<button class="save-btn ${
        isSaved ? "saved" : ""
      }" data-job-id="${job.job_id}">${isSaved ? "Saved" : "Save"}</button>`;
    }

    return `<div class="job-card" data-job-id="${job.job_id}">
            <div class="job-card-main">
                <div class="job-card-header"><img src="${
                  job.employer_logo || "https://i.imgur.com/DNLN3Q1.png"
                }" alt="${
      job.employer_name
    }" class="job-logo"><div><h4 class="job-title">${
      job.job_title
    }</h4><p class="job-company">${job.employer_name || "N/A"}</p></div></div>
                <div class="job-card-details"><span><i class="fas fa-map-marker-alt"></i> ${
                  job.job_city || "Remote"
                }</span><span><i class="fas fa-briefcase"></i> ${
      job.job_employment_type || "N/A"
    }</span></div>
            </div>
            <div class="job-card-actions">${actionButtonHTML}</div>
        </div>`;
  }

  function openModal(job) {
    if (!elements.modal) return;
    elements.modalJobTitle.textContent = job.job_title;
    elements.modalEmployerLogo.src =
      job.employer_logo || "https://i.imgur.com/DNLN3Q1.png";
    elements.modalEmployerName.textContent = job.employer_name || "N/A";
    elements.modalJobLocation.textContent = job.job_city || "Remote";
    elements.modalApplyBtn.href = job.job_apply_link || "#";
    elements.modalApplyBtn.onclick = () => {
      state.appliedJobs.add(job.job_id);
      state.savedJobs.delete(job.job_id);
      updateStats();
      closeModal();
      const activeNav = document.querySelector(".sidebar-nav a.active");
      if (activeNav) navigateTo(activeNav.dataset.target);
    };
    elements.modalQualifications.innerHTML =
      "<li>Details not provided by API</li>";
    elements.modalResponsibilities.innerHTML =
      job.job_description || "Details not provided by API";
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    document.body.classList.remove("modal-open");
  }

  // --- UI & STATE UPDATES ---
  function updateStats() {
    updateDashboardStats();
    let strength = 10 + state.savedJobs.size * 5 + state.appliedJobs.size * 10;
    state.profileStrength = Math.min(strength, 100);
    if (elements.profileProgress)
      elements.profileProgress.style.width = `${state.profileStrength}%`;
    if (elements.profileProgressText)
      elements.profileProgressText.textContent = `${state.profileStrength}% Complete`;
  }

  // +++ ADDED BACK THE MISSING FUNCTION +++
  function updateDashboardStats() {
    const jobsAppliedCount = document.getElementById("jobs-applied-count");
    const savedJobsCount = document.getElementById("saved-jobs-count");
    const recommendationsCount = document.getElementById(
      "recommendations-count"
    );
    if (jobsAppliedCount && savedJobsCount && recommendationsCount) {
      jobsAppliedCount.textContent = state.appliedJobs.size;
      savedJobsCount.textContent = state.savedJobs.size;
      recommendationsCount.textContent = state.allJobs.length;
    }
  }

  function updatePaginationUI() {
    const paginationControls = document.getElementById("pagination-controls");
    if (!paginationControls || state.allJobs.length <= JOBS_PER_PAGE) {
      if (paginationControls) paginationControls.style.display = "none";
      return;
    }
    paginationControls.style.display = "flex";
    const totalPages = Math.ceil(state.allJobs.length / JOBS_PER_PAGE);
    document.getElementById(
      "page-info"
    ).textContent = `Page ${state.currentPage} of ${totalPages}`;
    document.getElementById("prev-page-btn").disabled = state.currentPage === 1;
    document.getElementById("next-page-btn").disabled =
      state.currentPage >= totalPages;
  }

  function toggleSidebarCollapse() {
    if (!elements.wrapper || !elements.sidebarCollapseBtn) return;
    const icon = elements.sidebarCollapseBtn.querySelector("i");
    elements.wrapper.classList.toggle("sidebar-collapsed");
    if (icon)
      icon.className = elements.wrapper.classList.contains("sidebar-collapsed")
        ? "fas fa-chevron-right"
        : "fas fa-chevron-left";
  }

  function reassignDashboardElements() {
    const applyFiltersBtn = document.getElementById("apply-filters-btn");
    const searchBtn = document.getElementById("search-btn");
    const searchInput = document.getElementById("search-input");
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    if (applyFiltersBtn)
      applyFiltersBtn.addEventListener("click", () => {
        state.currentPage = 1;
        fetchJobs();
      });
    if (searchBtn)
      searchBtn.addEventListener("click", () => {
        state.currentPage = 1;
        fetchJobs();
      });
    if (searchInput)
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          state.currentPage = 1;
          fetchJobs();
        }
      });
    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          displayPage();
        }
      });
    if (nextPageBtn)
      nextPageBtn.addEventListener("click", () => {
        state.currentPage++;
        displayPage();
      });
  }

  function handleMainContentClick(e) {
    const target = e.target;
    if (target.classList.contains("save-btn")) {
      const jobId = target.dataset.jobId;
      if (!jobId) return;
      const isSaved = state.savedJobs.has(jobId);
      if (isSaved) {
        state.savedJobs.delete(jobId);
        target.textContent = "Save";
        target.classList.remove("saved");
      } else {
        state.savedJobs.add(jobId);
        target.textContent = "Saved";
        target.classList.add("saved");
      }
      updateStats();
    } else {
      const card = target.closest(".job-card-main");
      if (card) {
        const jobId = card.closest(".job-card").dataset.jobId;
        const jobData = state.allJobs.find((job) => job.job_id === jobId);
        if (jobData) openModal(jobData);
      }
    }
  }

  // --- INITIAL LOAD ---
  if (document.getElementById("dashboard-content")) {
    fetchUserProfile();
    navigateTo("dashboard-content");
    updateStats();
  }
});

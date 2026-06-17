// Application State
let releaseNotes = [];
let filteredNotes = []; // Stores the currently filtered list for export
let activeTypeFilter = 'all';
let searchQuery = '';

// DOM Elements
const feedGrid = document.getElementById('feedGrid');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const exportCsvBtn = document.getElementById('exportCsvBtn'); // Added
const resultsCount = document.getElementById('resultsCount');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const typeFiltersContainer = document.getElementById('typeFilters');
const retryBtn = document.getElementById('retryBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Modal Elements
const detailModal = document.getElementById('detailModal');
const modalClose = document.getElementById('modalClose');
const modalBadge = document.getElementById('modalBadge');
const modalDate = document.getElementById('modalDate');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalSourceLink = document.getElementById('modalSourceLink');
const modalTweetBtn = document.getElementById('modalTweetBtn');
let currentModalItem = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh and Export buttons
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    exportCsvBtn.addEventListener('click', exportFilteredNotesToCSV);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        toggleClearSearchButton();
        filterAndRender();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearSearchButton();
        filterAndRender();
        searchInput.focus();
    });
    
    // Category chips
    typeFiltersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        // Remove active class from all chips
        document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
        // Add active to clicked chip
        chip.classList.add('active');
        
        activeTypeFilter = chip.dataset.type;
        filterAndRender();
    });
    
    // Reset filters empty state button
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearSearchButton();
        
        document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
        activeTypeFilter = 'all';
        
        filterAndRender();
    });
    
    // Modal close listeners
    modalClose.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeModal();
    });
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailModal.style.display !== 'none') {
            closeModal();
        }
    });
    
    // Modal Tweet button
    modalTweetBtn.addEventListener('click', () => {
        if (currentModalItem) {
            shareOnTwitter(currentModalItem.tweet_text);
        }
    });
}

function toggleClearSearchButton() {
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
}

// Fetch Release Notes from Flask API
async function fetchReleaseNotes(isRefresh = false) {
    showLoading();
    
    if (isRefresh) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/release-notes');
        const result = await response.json();
        
        if (response.ok && result.status !== 'error') {
            releaseNotes = result.data;
            
            // Format category chips counts dynamically or show message
            const sourceText = result.source === 'cache' ? 'cached' : 'live';
            showToast(`Loaded ${releaseNotes.length} updates (${sourceText}).`, 'success');
            
            filterAndRender();
        } else {
            throw new Error(result.message || 'Error occurred while loading data.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message);
        showToast('Failed to fetch release notes.', 'error');
    } finally {
        hideLoading();
        if (isRefresh) {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }
}

// Show/Hide States
function showLoading() {
    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Hide existing cards
    document.querySelectorAll('.update-card').forEach(card => card.remove());
    resultsCount.textContent = 'Loading...';
}

function hideLoading() {
    loadingState.style.display = 'none';
}

function showError(message) {
    errorState.style.display = 'flex';
    errorMessage.textContent = message || 'An unexpected error occurred. Please check your connection.';
    resultsCount.textContent = 'Error';
}

// Filter and Render Cards
function filterAndRender() {
    // Filter release notes
    const filtered = releaseNotes.filter(item => {
        // Category type filter
        const typeMatch = activeTypeFilter === 'all' || 
            item.type.toLowerCase() === activeTypeFilter.toLowerCase();
            
        // Text search filter
        const bodyText = stripHtmlTags(item.body).toLowerCase();
        const typeText = item.type.toLowerCase();
        const dateText = item.date.toLowerCase();
        
        const searchMatch = !searchQuery || 
            bodyText.includes(searchQuery) || 
            typeText.includes(searchQuery) || 
            dateText.includes(searchQuery);
            
        return typeMatch && searchMatch;
    });
    
    // Save to global state for export
    filteredNotes = filtered;
    
    // Update stats label
    resultsCount.textContent = `${filtered.length} of ${releaseNotes.length} updates`;
    
    // Clean old card elements
    document.querySelectorAll('.update-card').forEach(card => card.remove());
    
    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    
    // Render new cards
    filtered.forEach((item, index) => {
        const card = createCardElement(item, index);
        feedGrid.appendChild(card);
    });
}

// Helper to strip HTML tags for search checking
function stripHtmlTags(htmlStr) {
    return htmlStr.replace(/<[^>]*>/g, '');
}

// Generate DOM card for a single release note
function createCardElement(item, index) {
    const card = document.createElement('article');
    const safeType = item.type.toLowerCase().replace(/[^a-z0-9]/g, '');
    card.className = `update-card type-${safeType}`;
    
    // Stagger animation delay
    card.style.animation = `fade-slide-in 0.4s ease-out forwards`;
    card.style.animationDelay = `${Math.min(index * 0.05, 1)}s`;
    card.style.opacity = '0';
    
    // Determine badge class
    let badgeClass = 'badge-default';
    const knownTypes = ['feature', 'issue', 'announcement', 'changed', 'deprecation'];
    if (knownTypes.includes(safeType)) {
        badgeClass = `badge-${safeType}`;
    }
    
    card.innerHTML = `
        <div>
            <div class="card-header">
                <span class="badge ${badgeClass}">${item.type}</span>
                <span class="card-date">${item.date}</span>
            </div>
            <div class="card-body">
                ${item.body}
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-outline read-more-btn">
                <i class="fa-solid fa-book-open"></i> Details
            </button>
            <button class="btn btn-outline copy-card-btn" title="Copy plain text to clipboard">
                <i class="fa-solid fa-copy"></i>
            </button>
            <button class="btn btn-tweet share-card-btn">
                <i class="fa-brands fa-x-twitter"></i> Tweet
            </button>
        </div>
    `;
    
    // Event listeners for actions
    card.querySelector('.read-more-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(item);
    });
    
    card.querySelector('.copy-card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const plainText = stripHtmlTags(item.body).trim();
        copyToClipboard(plainText, e.currentTarget);
    });
    
    card.querySelector('.share-card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        shareOnTwitter(item.tweet_text);
    });
    
    // Whole card click opens detail view
    card.addEventListener('click', () => openModal(item));
    
    return card;
}

// Tweet Sharing Logic
function shareOnTwitter(tweetText) {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,referrerpolicy=no-referrer');
    showToast('Redirected to share on X (Twitter)', 'info');
}

// Modal View management
function openModal(item) {
    currentModalItem = item;
    
    const safeType = item.type.toLowerCase().replace(/[^a-z0-9]/g, '');
    let badgeClass = 'badge-default';
    const knownTypes = ['feature', 'issue', 'announcement', 'changed', 'deprecation'];
    if (knownTypes.includes(safeType)) {
        badgeClass = `badge-${safeType}`;
    }
    
    modalBadge.className = `badge ${badgeClass}`;
    modalBadge.textContent = item.type;
    modalDate.textContent = item.date;
    modalTitle.textContent = `${item.type} Update`;
    modalBody.innerHTML = item.body;
    modalSourceLink.href = item.link;
    
    // Show Modal
    detailModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Disable page scrolling behind modal
}

function closeModal() {
    detailModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore page scrolling
    currentModalItem = null;
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove toast after 3.5 seconds
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// Add CSS keyframe animation for card entry dynamically if not already in stylesheet
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fade-slide-in {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;
document.head.appendChild(styleSheet);

// Copy plain text body to clipboard
function copyToClipboard(text, buttonElement) {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied text to clipboard!', 'success');
            triggerCopySuccessUI(buttonElement);
        } catch (err) {
            showToast('Failed to copy text.', 'error');
        }
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied text to clipboard!', 'success');
        triggerCopySuccessUI(buttonElement);
    }).catch(err => {
        showToast('Failed to copy text.', 'error');
    });
}

function triggerCopySuccessUI(button) {
    const icon = button.querySelector('i');
    icon.className = 'fa-solid fa-check';
    button.classList.add('copy-success');
    
    setTimeout(() => {
        icon.className = 'fa-solid fa-copy';
        button.classList.remove('copy-success');
    }, 1500);
}

// Export Filtered Release Notes to CSV
function exportFilteredNotesToCSV() {
    if (filteredNotes.length === 0) {
        showToast('No updates available to export.', 'error');
        return;
    }
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            str = `"${str}"`;
        }
        return str;
    };
    
    let csvContent = "Date,Type,Description,Source Link\r\n";
    
    filteredNotes.forEach(item => {
        const cleanBody = stripHtmlTags(item.body).trim();
        csvContent += `${escapeCSV(item.date)},${escapeCSV(item.type)},${escapeCSV(cleanBody)},${escapeCSV(item.link)}\r\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredNotes.length} updates to CSV.`, 'success');
}

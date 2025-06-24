// Search and Sort functionality
class SearchSort {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.sortSelect = document.getElementById('sort-select');
        this.resultsText = document.getElementById('results-text');
        this.gallery = document.getElementById('gallery');
        
        this.currentQuery = '';
        this.currentSort = 'newest';
        this.debounceTimer = null;
        
        this.init();
    }
    
    init() {
        // Search input with debounce
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.currentQuery = e.target.value.trim();
                this.updateGallery();
            }, 300);
        });
        
        // Sort change
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.updateGallery();
        });
        
        // Ctrl+K shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select();
            }
        });
    }
    
    async updateGallery() {
        // Show loading state
        this.gallery.style.opacity = '0.5';
        document.querySelector('.gallery-controls').classList.add('loading');
        
        try {
            const params = new URLSearchParams({
                q: this.currentQuery,
                sort: this.currentSort
            });
            
            const response = await fetch(`/api/artworks?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderResults(data.artworks);
                this.updateResultsText(data.count);
                
                // Save sort preference
                localStorage.setItem('gallerySort', this.currentSort);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Search error:', error);
            if (window.toast) {
                window.toast.error('Failed to update gallery');
            }
        } finally {
            this.gallery.style.opacity = '1';
            document.querySelector('.gallery-controls').classList.remove('loading');
        }
    }
    
    renderResults(artworks) {
        // Check if virtual scroll is active
        const isVirtualScroll = this.gallery.classList.contains('virtual-enabled');
        
        if (isVirtualScroll) {
            // For virtual scroll, we need to reload page
            window.location.href = `/?q=${encodeURIComponent(this.currentQuery)}&sort=${this.currentSort}`;
        } else {
            // Regular gallery update
            this.gallery.innerHTML = artworks.map(artwork => this.createArtworkHTML(artwork)).join('');
            
            // Re-initialize features
            if (window.lazyLoader) {
                const images = this.gallery.querySelectorAll('img.lazy');
                window.lazyLoader.observe(images);
            }
            
            // Animate entrance
            if (window.AnimationManager) {
                window.AnimationManager.initPageAnimations();
            }
        }
    }
    
    createArtworkHTML(artwork) {
        return `
            <div class="artwork" data-id="${artwork.id}">
                <div class="artwork-container">
                    <img data-src="${artwork.thumbnail_path}" 
                         alt="${artwork.title || ''}" 
                         class="lazy">
                    <div class="artwork-actions">
                        <button class="btn-edit" data-id="${artwork.id}" 
                                data-title="${artwork.title || ''}" 
                                data-description="${artwork.description || ''}">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-delete" data-id="${artwork.id}" 
                                data-title="${artwork.title || ''}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="artwork-info">
                    ${artwork.title ? `<h3 class="artwork-title">${artwork.title}</h3>` : ''}
                    <div class="artwork-description">
                        <p class="truncated-description">${artwork.description || ''}</p>
                        ${artwork.description?.length > 120 ? 
                            `<button class="btn-see-more" data-id="${artwork.id}">See more</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    updateResultsText(count) {
        if (this.currentQuery) {
            this.resultsText.textContent = `Found ${count} result${count !== 1 ? 's' : ''} for "${this.currentQuery}"`;
        } else {
            this.resultsText.textContent = `Showing all ${count} artwork${count !== 1 ? 's' : ''}`;
        }
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.searchSort = new SearchSort();
    
    // Load saved sort preference
    const savedSort = localStorage.getItem('gallerySort');
    if (savedSort) {
        document.getElementById('sort-select').value = savedSort;
    }
});
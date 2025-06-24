// lightbox-core.js - Core functionality
export class LightboxCore {
    constructor() {
        this.currentIndex = 0;
        this.images = [];
        this.isOpen = false;
        this.debug = false;
        this.container = null;
        this.elements = {};
        
        this.init();
    }
    
    log(message, data = null) {
        if (this.debug) {
            console.log(`🎬 LIGHTBOX: ${message}`, data || '');
        }
    }
    
    init() {
        this.log('Initializing lightbox core...');
        this.createLightboxHTML();
        this.collectImages();
        this.attachCoreEventListeners();
        this.log('Lightbox core initialization complete');
    }
    
    createLightboxHTML() {
        this.log('Creating lightbox HTML...');
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <div class="lightbox-image-container">
                    <img class="lightbox-image" alt="">
                    <button class="lightbox-nav lightbox-prev">&#10094;</button>
                    <button class="lightbox-nav lightbox-next">&#10095;</button>
                    <button class="lightbox-close">&times;</button>
                </div>
                <div class="lightbox-info">
                    <!-- Enhanced title with see more and corner controls -->
                    <div class="lightbox-title-container">
                        <h3 class="lightbox-title">
                            <span class="text-content"></span>
                        </h3>
                        <button class="show-more-btn title-show-more" style="display:none;">See more</button>
                        <button class="edit-btn title-edit-btn" title="Edit title">
                            <i class="fas fa-pen"></i>
                        </button>
                        <div class="title-edit-controls">
                            <button class="save-btn" title="Save (Enter)">✓</button>
                            <button class="cancel-btn" title="Cancel (Escape)">✗</button>
                        </div>
                    </div>
                    
                    <!-- Enhanced description with see more and corner controls -->
                    <div class="lightbox-description-container">
                        <p class="lightbox-description">
                            <span class="text-content"></span>
                        </p>
                        <button class="show-more-btn description-show-more" style="display:none;">See more</button>
                        <button class="edit-btn description-edit-btn" title="Edit description">
                            <i class="fas fa-pen"></i>
                        </button>
                        <div class="description-edit-controls">
                            <button class="save-btn" title="Save (Ctrl+Enter)">✓</button>
                            <button class="cancel-btn" title="Cancel (Escape)">✗</button>
                        </div>
                    </div>
                    
                    <div class="metadata-section">
                        <h4>AI Generation Details</h4>
                        <div class="loading-metadata" style="display:none;"></div>
                        <div class="metadata-content"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);
        this.container = lightbox;
        
        this.elements = {
            image: lightbox.querySelector('.lightbox-image'),
            title: lightbox.querySelector('.lightbox-title'),
            titleContent: lightbox.querySelector('.lightbox-title .text-content'),
            titleShowMore: lightbox.querySelector('.title-show-more'),
            description: lightbox.querySelector('.lightbox-description'),
            descriptionContent: lightbox.querySelector('.lightbox-description .text-content'),
            descriptionShowMore: lightbox.querySelector('.description-show-more'),
            metadataContent: lightbox.querySelector('.metadata-content'),
            loadingBar: lightbox.querySelector('.loading-metadata'),
            titleContainer: lightbox.querySelector('.lightbox-title-container'),
            descriptionContainer: lightbox.querySelector('.lightbox-description-container')
        };
        
        this.log('Lightbox HTML created');
    }
    
    collectImages() {
        this.log('Collecting images...');
        const possibleSelectors = ['.artwork', '.artwork-item', '.gallery-item', '.image-item'];
        let artworks = null;
        
        for (let selector of possibleSelectors) {
            const found = document.querySelectorAll(selector);
            this.log(`Checking selector "${selector}": found ${found.length} elements`);
            if (found.length > 0) {
                artworks = found;
                this.log(`Using selector: ${selector}`);
                break;
            }
        }
        
        if (!artworks || artworks.length === 0) {
            this.log('❌ No artwork elements found!');
            artworks = document.querySelectorAll('img[data-id], .gallery img, .grid img');
            this.log(`Fallback: found ${artworks.length} images`);
        }
        
        this.images = Array.from(artworks).map((artwork, index) => {
            let img = artwork.querySelector('img') || artwork;
            
            return {
                id: artwork.dataset.id || `img_${index}`,
                index: index,
                src: img ? (img.dataset.fullSrc || img.src || img.dataset.src) : '',
                title: this.findTextContent(artwork, ['.artwork-title', '.title', 'h3', 'h4']) || '',
                description: this.findTextContent(artwork, ['.truncated-description', '.description', '.caption']) || ''
            };
        }).filter(item => item.src);
        
        this.log(`Collected ${this.images.length} valid images:`, this.images);
    }
    
    findTextContent(element, selectors) {
        for (let selector of selectors) {
            const found = element.querySelector(selector);
            if (found && found.textContent.trim()) {
                return found.textContent.trim();
            }
        }
        return '';
    }
    
    attachCoreEventListeners() {
        this.log('Attaching core event listeners...');
        
        // Click on images to open lightbox
        document.addEventListener('click', (e) => {
            const possibleTargets = [
                e.target.closest('.artwork-container img'),
                e.target.closest('.artwork img'),
                e.target.closest('img[data-id]'),
                e.target.tagName === 'IMG' ? e.target : null
            ].filter(Boolean);
            
            let img = null;
            for (let target of possibleTargets) {
                if (target) {
                    img = target;
                    break;
                }
            }
            
            if (img) {
                e.preventDefault();
                const artwork = img.closest('.artwork') || img.closest('[data-id]') || img.parentElement;
                
                if (artwork && artwork.dataset.id) {
                    const index = this.images.findIndex(i => i.id === artwork.dataset.id);
                    if (index !== -1) {
                        this.open(index);
                    }
                }
            }
        });
        
        // Lightbox controls
        this.container.querySelector('.lightbox-close').addEventListener('click', () => this.close());
        this.container.querySelector('.lightbox-prev').addEventListener('click', () => this.navigate(-1));
        this.container.querySelector('.lightbox-next').addEventListener('click', () => this.navigate(1));
        
        // Basic keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            // Let editing handle keyboard if active
            if (this.editingElement) return;
            
            // Core navigation shortcuts
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.navigate(-1);
            if (e.key === 'ArrowRight') this.navigate(1);
        });
        
        // Click outside to close (but not when editing)
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container && !this.editingElement) {
                this.close();
            }
        });
        
        this.log('Core event listeners attached');
    }
    
    async open(index) {
        this.log(`Opening lightbox at index ${index}`);
        this.currentIndex = index;
        this.isOpen = true;
        this.container.style.display = 'flex';
        setTimeout(() => this.container.classList.add('active'), 10);
        
        await this.loadImage(index);
        document.body.style.overflow = 'hidden';
        this.log('Lightbox opened');
    }
    
    async loadImage(index) {
        const imageData = this.images[index];
        this.log(`Loading image at index ${index}:`, imageData);
        
        if (!imageData) {
            this.log('❌ No image data found');
            return;
        }
        
        // Update image
        this.elements.image.src = imageData.src;
        this.elements.image.onload = () => this.log('✅ Image loaded successfully');
        this.elements.image.onerror = () => this.log('❌ Image failed to load');
        
        // Update title and description - will be handled by editing module
        this.updateTextContent('title', imageData.title);
        this.updateTextContent('description', imageData.description);
        
        // Load metadata - will be handled by metadata module
        if (this.showMetadataLoading) {
            this.showMetadataLoading();
            if (this.loadMetadata) {
                await this.loadMetadata(imageData.id);
            }
        }
        
        // Update navigation
        this.updateNavigation();
    }
    
    updateTextContent(type, text) {
        const element = type === 'title' ? this.elements.title : this.elements.description;
        const contentElement = type === 'title' ? this.elements.titleContent : this.elements.descriptionContent;
        
        element.classList.remove('empty');
        
        if (text && text.trim()) {
            contentElement.textContent = text;
        } else {
            contentElement.textContent = type === 'title' ? 'Click pen icon to add title...' : 'Click pen icon to add description...';
            element.classList.add('empty');
        }
        
        // Check if we need to show "See more" button - handled by editing module
        if (this.checkTextOverflow) {
            this.checkTextOverflow(type);
        }
    }
    
    navigate(direction) {
        // Don't navigate if editing
        if (this.editingElement) return;
        
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.images.length) {
            this.currentIndex = newIndex;
            this.loadImage(newIndex);
        }
    }
    
    updateNavigation() {
        this.container.querySelector('.lightbox-prev').style.display = 
            this.currentIndex > 0 ? 'block' : 'none';
        this.container.querySelector('.lightbox-next').style.display = 
            this.currentIndex < this.images.length - 1 ? 'block' : 'none';
    }
    
    close() {
        // Cancel any active editing
        if (this.editingElement && this.cancelEdit) {
            this.cancelEdit(this.editingElement);
        }
        
        this.isOpen = false;
        this.container.classList.remove('active');
        setTimeout(() => {
            this.container.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
    
    // Utility methods for other modules
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeForJs(text) {
        return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }
}
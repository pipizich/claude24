// static/js/virtual-scroll.js - Enhanced with Intersection Observer

import { AnimationManager } from './animation.js';

export class VirtualScroll {
    constructor(options) {
        this.container = document.querySelector(options.container);
        this.itemHeight = options.itemHeight || 420;
        this.itemsPerRow = options.itemsPerRow || 5;
        this.buffer = options.buffer || 3;
        this.animationBuffer = options.animationBuffer || 2; // Extra buffer for animations
        
        this.artworks = [];
        this.renderedItems = new Map(); // Track rendered items
        this.visibleRange = { start: 0, end: 0 };
        this.intersectionObserver = null;
        this.resizeObserver = null;
        this.scrollTimeout = null;
        this.isScrolling = false;
        
        // Performance tracking
        this.lastRenderTime = 0;
        this.renderCount = 0;
        
        this.init();
    }
    
    init() {
        // Collect all artworks
        this.collectArtworks();
        
        // Setup container structure
        this.setupContainer();
        
        // Initialize Intersection Observer
        this.setupIntersectionObserver();
        
        // Initialize Resize Observer
        this.setupResizeObserver();
        
        // Initial render
        this.calculateVisibleRange();
        this.render(true); // Enable animation for initial render
        
        // Setup scroll listener
        this.setupScrollListener();
    }
    
    collectArtworks() {
        const artworkElements = this.container.querySelectorAll('.artwork');
        this.artworks = Array.from(artworkElements).map((el, index) => {
            return {
                id: el.dataset.id,
                html: el.outerHTML,
                index: index,
                element: null,
                isVisible: false,
                isRendered: false
            };
        });
        
        this.container.innerHTML = '';
    }
    
    setupContainer() {
        this.container.innerHTML = `
            <div class="virtual-scroll-spacer"></div>
            <div class="virtual-scroll-viewport">
                <div class="virtual-scroll-content"></div>
            </div>
        `;
        
        this.spacer = this.container.querySelector('.virtual-scroll-spacer');
        this.viewport = this.container.querySelector('.virtual-scroll-viewport');
        this.content = this.container.querySelector('.virtual-scroll-content');
        
        // Calculate total height
        const totalRows = Math.ceil(this.artworks.length / this.itemsPerRow);
        this.totalHeight = totalRows * this.itemHeight;
        this.spacer.style.height = `${this.totalHeight}px`;
        
        // Style container
        this.container.style.position = 'relative';
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';
        this.viewport.style.height = '100%';
        this.viewport.style.pointerEvents = 'none';
        
        this.content.style.position = 'relative';
        this.content.style.pointerEvents = 'auto';
    }
    
    setupIntersectionObserver() {
        // Observer for lazy loading and animation triggering
        const options = {
            root: null,
            rootMargin: '50px 0px', // Start loading/animating slightly before visible
            threshold: [0, 0.1, 0.5, 1.0]
        };
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const artworkId = entry.target.dataset.id;
                const artwork = this.artworks.find(a => a.id === artworkId);
                
                if (!artwork) return;
                
                if (entry.isIntersecting) {
                    // Element is visible
                    artwork.isVisible = true;
                    
                    // Trigger animation if not already animated
                    if (!entry.target.classList.contains('animation-done') && 
                        !entry.target.classList.contains('artwork-visible')) {
                        
                        // Use animation queue for smooth animation
                        AnimationManager.queue.add(entry.target, 'entrance', {
                            priority: AnimationManager.queue.priorities.LOW
                        });
                    }
                    
                    // Lazy load images
                    const img = entry.target.querySelector('img.lazy');
                    if (img && img.dataset.src && !img.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        img.classList.add('lazy-loaded');
                    }
                } else {
                    // Element is not visible
                    artwork.isVisible = false;
                }
            });
        }, options);
    }
    
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.calculateItemsPerRow();
                this.setupContainer();
                this.calculateVisibleRange();
                this.render();
            }, 250);
        });
        
        this.resizeObserver.observe(this.container);
    }
    
    calculateItemsPerRow() {
        const containerWidth = this.container.offsetWidth;
        const artworkWidth = 250; // Estimate from CSS
        const gap = 20;
        this.itemsPerRow = Math.floor((containerWidth + gap) / (artworkWidth + gap)) || 1;
    }
    
    calculateVisibleRange() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const containerTop = this.container.offsetTop;
        const viewportHeight = window.innerHeight;
        
        const relativeScrollTop = Math.max(0, scrollTop - containerTop);
        
        const startRow = Math.floor(relativeScrollTop / this.itemHeight);
        const endRow = Math.ceil((relativeScrollTop + viewportHeight) / this.itemHeight);
        
        // Add buffer for smooth scrolling
        const bufferedStartRow = Math.max(0, startRow - this.buffer);
        const bufferedEndRow = Math.min(
            Math.ceil(this.artworks.length / this.itemsPerRow), 
            endRow + this.buffer + this.animationBuffer
        );
        
        this.visibleRange = {
            start: bufferedStartRow * this.itemsPerRow,
            end: Math.min(this.artworks.length, bufferedEndRow * this.itemsPerRow)
        };
    }
    
    render(enableAnimation = false) {
        const startTime = performance.now();
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery virtual-gallery';
        
        // Calculate position offset for the wrapper
        const startRowIndex = Math.floor(this.visibleRange.start / this.itemsPerRow);
        wrapper.style.transform = `translateY(${startRowIndex * this.itemHeight}px)`;
        
        // Track which items to remove
        const currentIds = new Set();
        
        // Render visible items
        for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
            const artwork = this.artworks[i];
            if (!artwork) continue;
            
            currentIds.add(artwork.id);
            
            // Check if already rendered
            if (this.renderedItems.has(artwork.id)) {
                const existingElement = this.renderedItems.get(artwork.id);
                wrapper.appendChild(existingElement);
                continue;
            }
            
            // Create new element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = artwork.html;
            const artworkEl = tempDiv.firstChild;
            
            // Store reference
            artwork.element = artworkEl;
            artwork.isRendered = true;
            this.renderedItems.set(artwork.id, artworkEl);
            
            // Prepare for animation if enabled
            if (enableAnimation && !this.isScrolling) {
                artworkEl.classList.add('artwork-entering');
                artworkEl.style.opacity = '0';
            }
            
            // Observe with Intersection Observer
            this.intersectionObserver.observe(artworkEl);
            
            wrapper.appendChild(artworkEl);
        }
        
        // Remove items that are no longer in visible range
        this.renderedItems.forEach((element, id) => {
            if (!currentIds.has(id)) {
                this.intersectionObserver.unobserve(element);
                this.renderedItems.delete(id);
                
                // Clean up animation classes
                AnimationManager.queue.cancel(element);
            }
        });
        
        // Clear and append new content
        this.content.innerHTML = '';
        fragment.appendChild(wrapper);
        this.content.appendChild(fragment);
        
        // Re-initialize features
        this.reinitializeFeatures();
        
        // Performance tracking
        const renderTime = performance.now() - startTime;
        this.lastRenderTime = renderTime;
        this.renderCount++;
        
        if (this.renderCount % 10 === 0) {
            console.log(`⚡ Virtual Scroll: Rendered in ${renderTime.toFixed(2)}ms`);
        }
    }
    
    reinitializeFeatures() {
        // Re-attach event listeners
        this.reattachEventListeners();
        
        // Initialize lazy loading for new images (handled by Intersection Observer)
    }
    
    reattachEventListeners() {
        // Use event delegation for better performance
        if (!this.content.dataset.listenersAttached) {
            this.content.addEventListener('click', (e) => {
                const target = e.target;
                
                // Handle edit button
                if (target.closest('.btn-edit')) {
                    const btn = target.closest('.btn-edit');
                    const event = new CustomEvent('edit-artwork', {
                        detail: {
                            id: btn.dataset.id,
                            title: btn.dataset.title,
                            description: btn.dataset.description
                        }
                    });
                    document.dispatchEvent(event);
                }
                
                // Handle delete button
                else if (target.closest('.btn-delete')) {
                    const btn = target.closest('.btn-delete');
                    const event = new CustomEvent('delete-artwork', {
                        detail: {
                            id: btn.dataset.id,
                            title: btn.dataset.title
                        }
                    });
                    document.dispatchEvent(event);
                }
                
                // Handle see more button
                else if (target.closest('.btn-see-more')) {
                    const btn = target.closest('.btn-see-more');
                    const event = new CustomEvent('view-description', {
                        detail: { id: btn.dataset.id }
                    });
                    document.dispatchEvent(event);
                }
                
                // Handle title click
                else if (target.closest('.artwork-title')) {
                    const title = target.closest('.artwork-title');
                    if (title.offsetWidth < title.scrollWidth) {
                        const event = new CustomEvent('view-description', {
                            detail: { id: title.dataset.id }
                        });
                        document.dispatchEvent(event);
                    }
                }
            });
            
            this.content.dataset.listenersAttached = 'true';
        }
    }
    
    setupScrollListener() {
        let rafId = null;
        let lastScrollTop = 0;
        
        const handleScroll = () => {
            const currentScrollTop = window.pageYOffset;
            
            // Detect scroll direction and speed
            const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
            this.isScrolling = scrollDelta > 5; // Fast scrolling threshold
            
            lastScrollTop = currentScrollTop;
            
            // Cancel previous animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            rafId = requestAnimationFrame(() => {
                this.calculateVisibleRange();
                this.render(!this.isScrolling); // Disable animations during fast scroll
            });
            
            // Reset scrolling flag after scroll stops
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                
                // Re-enable animations for visible items
                this.renderedItems.forEach(element => {
                    if (!element.classList.contains('animation-done')) {
                        AnimationManager.queue.add(element, 'entrance', {
                            priority: AnimationManager.queue.priorities.LOW
                        });
                    }
                });
            }, 150);
        };
        
        // Use passive listener for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Add artwork with animation
    addArtwork(artworkData) {
        const newArtwork = {
            id: artworkData.id,
            html: this.createArtworkHTML(artworkData),
            index: 0,
            element: null,
            isVisible: false,
            isRendered: false
        };
        
        // Add to beginning
        this.artworks.unshift(newArtwork);
        
        // Update indices
        this.artworks.forEach((artwork, index) => {
            artwork.index = index;
        });
        
        // Recalculate height
        const totalRows = Math.ceil(this.artworks.length / this.itemsPerRow);
        this.totalHeight = totalRows * this.itemHeight;
        this.spacer.style.height = `${this.totalHeight}px`;
        
        // Force re-render
        this.calculateVisibleRange();
        this.render();
        
        // Scroll to top to see new artwork
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Animate new artwork after scroll
        setTimeout(() => {
            const newElement = this.renderedItems.get(artworkData.id);
            if (newElement) {
                AnimationManager.animateNewArtwork(newElement);
            }
        }, 500);
    }
    
    // Remove artwork with animation
    async removeArtwork(artworkId) {
        const artworkIndex = this.artworks.findIndex(a => a.id === artworkId);
        if (artworkIndex === -1) return;
        
        // Animate if visible
        const element = this.renderedItems.get(artworkId);
        if (element) {
            await AnimationManager.animateRemoveArtwork(element);
            this.intersectionObserver.unobserve(element);
            this.renderedItems.delete(artworkId);
        }
        
        // Remove from data
        this.artworks.splice(artworkIndex, 1);
        
        // Update indices
        this.artworks.forEach((artwork, index) => {
            artwork.index = index;
        });
        
        // Recalculate height
        const totalRows = Math.ceil(this.artworks.length / this.itemsPerRow);
        this.totalHeight = totalRows * this.itemHeight;
        this.spacer.style.height = `${this.totalHeight}px`;
        
        // Re-render
        this.calculateVisibleRange();
        this.render();
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
                    ${artwork.title ? `<h3 class="artwork-title" data-id="${artwork.id}">${artwork.title}</h3>` : ''}
                    <div class="artwork-description">
                        <p class="truncated-description">${artwork.description || ''}</p>
                        ${artwork.description && artwork.description.length > 120 ? 
                            `<button class="btn-see-more" data-id="${artwork.id}">See more</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Cleanup and disable
    disable() {
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Clear animation queue
        AnimationManager.queue.clear();
        
        // Restore normal gallery
        this.container.innerHTML = '';
        this.container.classList.remove('virtual-enabled');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery';
        
        this.artworks.forEach(artwork => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = artwork.html;
            wrapper.appendChild(tempDiv.firstChild);
        });
        
        this.container.appendChild(wrapper);
        
        // Re-initialize animations
        AnimationManager.initPageAnimations();
        
        console.log('✅ Virtual scroll disabled');
    }
    
    // Performance metrics
    getMetrics() {
        return {
            totalArtworks: this.artworks.length,
            renderedItems: this.renderedItems.size,
            visibleRange: `${this.visibleRange.start}-${this.visibleRange.end}`,
            lastRenderTime: `${this.lastRenderTime.toFixed(2)}ms`,
            totalRenders: this.renderCount,
            isScrolling: this.isScrolling,
            itemsPerRow: this.itemsPerRow
        };
    }
    
    // Debug mode
    enableDebugMode() {
        console.log('🔍 Virtual Scroll Debug Mode Enabled');
        
        // Visual indicators
        this.viewport.style.border = '2px dashed red';
        this.spacer.style.background = 'rgba(255,0,0,0.05)';
        
        // Log metrics periodically
        this.debugInterval = setInterval(() => {
            console.log('📊 Virtual Scroll Metrics:', this.getMetrics());
        }, 2000);
    }
    
    disableDebugMode() {
        this.viewport.style.border = '';
        this.spacer.style.background = '';
        
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
        }
        
        console.log('🔍 Debug mode disabled');
    }
}
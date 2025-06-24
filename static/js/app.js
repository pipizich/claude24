// static/js/app.js - Optimized with Animation Queue and Intersection Observer

import { debounce } from './utils.js';
import { ToastManager } from './toast.js';
import { LazyImageLoader } from './lazy_image.js';
import { NetworkMonitor, enhancedFetch } from './network.js';
import { AnimationManager, LoadingManager } from './animation.js';
import { VirtualScroll } from './virtual-scroll.js';
import { ModalManager, FileHandler, FormHandler } from './components.js';

class ArtGalleryApp {
  constructor() {
    this.virtualScroll = null;
    this.managers = {};
    this.config = {
      VIRTUAL_SCROLL_THRESHOLD: 500, // Increased from 200 to 500
      ANIMATION_STAGGER_DELAY: 50,   // Reduced for smoother animations
      MAX_FILE_SIZE: 15 * 1024 * 1024,
      ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      ENABLE_PERFORMANCE_MONITORING: true
    };
  }

  async init() {
    try {
      // Start performance monitoring
      const initStart = performance.now();
      
      // Initialize managers
      this.managers.toast = new ToastManager();
      window.toast = this.managers.toast;
      
      this.managers.network = new NetworkMonitor();
      window.networkMonitor = this.managers.network;
      
      // Skip traditional lazy loader if using virtual scroll
      if (document.querySelectorAll('.artwork').length < this.config.VIRTUAL_SCROLL_THRESHOLD) {
        this.managers.lazyLoader = new LazyImageLoader();
        window.lazyLoader = this.managers.lazyLoader;
      }

      // Initialize UI components
      this.managers.modal = new ModalManager();
      this.managers.fileHandler = new FileHandler(this.config);
      this.managers.formHandler = new FormHandler(this.managers.modal);

      // Initialize features in optimized order
      this.initImageCounter();
      await this.initVirtualScroll(); // Now async for better control
      this.initSortable();
      this.initEventListeners();
      this.initErrorHandling();
      this.initPerformanceMonitoring();
      this.initDebugTools();

      // Only init lazy loading for non-virtual scroll
      if (!this.virtualScroll) {
        this.initLazyLoading();
        this.initAnimations();
      }

      // Log initialization time
      const initTime = performance.now() - initStart;
      console.log(`🎨 Art Gallery initialized in ${initTime.toFixed(2)}ms`);
      
      // Show welcome after initialization
      this.showWelcome();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      if (window.toast) {
        window.toast.error('Failed to initialize application');
      }
    }
  }

  initLazyLoading() {
    if (!this.managers.lazyLoader) return;
    
    const lazyImages = document.querySelectorAll('img.lazy');
    this.managers.lazyLoader.observe(lazyImages);
  }

  initImageCounter() {
    const totalImages = document.querySelectorAll('.gallery .artwork').length;
    const counter = document.getElementById('image-total');
    
    if (counter) {
      // Smooth animated counter
      let current = 0;
      const duration = 800;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        current = Math.floor(totalImages * easeProgress);
        counter.textContent = current;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          counter.textContent = totalImages;
        }
      };
      
      setTimeout(animate, 300);
    }

    // Update counter function with animation
    this.updateImageCounter = debounce(() => {
      const currentTotal = document.querySelectorAll('.gallery .artwork:not(.artwork-skeleton)').length;
      if (counter) {
        counter.style.transform = 'scale(1.2)';
        counter.textContent = currentTotal;
        setTimeout(() => counter.style.transform = 'scale(1)', 200);
      }
    }, 300);
  }

  async initVirtualScroll() {
    const artworkCount = document.querySelectorAll('.artwork').length;
    
    console.log(`📊 Gallery has ${artworkCount} artworks (threshold: ${this.config.VIRTUAL_SCROLL_THRESHOLD})`);
    
    if (artworkCount > this.config.VIRTUAL_SCROLL_THRESHOLD) {
      console.log('🔄 Initializing Enhanced Virtual Scroll with Intersection Observer...');
      
      const gallery = document.getElementById('gallery');
      gallery.classList.add('virtual-enabled');
      
      try {
        this.virtualScroll = new VirtualScroll({
          container: '#gallery',
          itemHeight: 420,
          buffer: 5,          // Increased buffer
          animationBuffer: 3  // Extra buffer for animations
        });
        
        // Listen for virtual scroll events
        document.addEventListener('edit-artwork', (e) => {
          this.managers.modal.openEditModal(e.detail);
        });
        
        document.addEventListener('delete-artwork', (e) => {
          this.managers.modal.openDeleteModal(e.detail);
        });
        
        document.addEventListener('view-description', (e) => {
          this.handleViewDescription(e.detail.id);
        });
        
        console.log(`✅ Virtual scroll enabled with Intersection Observer for ${artworkCount} artworks`);
        
        // Add performance info to debug tools
        if (window.VirtualScrollDebug) {
          window.VirtualScrollDebug = this.virtualScroll;
        }
        
      } catch (error) {
        console.error('❌ Virtual scroll failed:', error);
        gallery.classList.remove('virtual-enabled');
        this.virtualScroll = null;
        
        // Fallback to regular gallery with animations
        this.initAnimations();
      }
    } else {
      console.log('📄 Using regular gallery with standard animations');
      
      const gallery = document.getElementById('gallery');
      if (gallery) {
        gallery.style.height = 'auto';
        gallery.style.overflow = 'visible';
        gallery.style.position = 'relative';
      }
      
      // Use animation queue for regular gallery
      this.initAnimations();
    }
  }

initAnimations() {
  // ✅ FIXED: Only use IntersectionObserver approach, remove duplicate initialization
  console.log('🎬 Initializing animations with IntersectionObserver only');
  
  // Just call the optimized initPageAnimations
  AnimationManager.initPageAnimations();
  
  // No more forEach with setTimeout - that was causing the queue overflow!
}

  initSortable() {
    const gallery = document.getElementById('gallery');
    const artworkCount = document.querySelectorAll('.artwork').length;
    
    // Only enable sortable for regular gallery
    if (gallery && !this.virtualScroll && window.Sortable) {
      const sortableInstance = window.Sortable.create(gallery, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        forceFallback: false,
        onStart: () => {
          if (window.toast) window.toast.info('Reordering artworks...');
          gallery.classList.add('is-sorting');
        },
        onEnd: () => {
          gallery.classList.remove('is-sorting');
          this.handleOrderUpdate();
        }
      });
      
      // Store sortable instance on gallery element for Edit Mode access
      gallery._sortable = sortableInstance;
      
      console.log('✅ Sortable enabled for regular gallery');
    } else if (this.virtualScroll) {
      console.log('⚠️ Sortable disabled (Virtual scroll active)');
    }
  }

  async handleOrderUpdate() {
    try {
      const gallery = document.getElementById('gallery');
      const artworks = Array.from(gallery.children);
      const totalCount = artworks.length;
      
      const order = artworks.map((el, idx) => ({
        id: el.dataset.id,
        position: totalCount - idx
      }));
      
      const result = await enhancedFetch('/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      
      if (result.success && window.toast) {
        window.toast.success('Order updated successfully!');
        
        // Pulse effect on reordered items
        artworks.forEach((artwork, idx) => {
          setTimeout(() => {
            AnimationManager.animateUpdate(artwork);
          }, idx * 50);
        });
      }
    } catch (error) {
      console.error('Update order error:', error);
      if (window.toast) window.toast.error('Failed to update order');
    }
  }

  initEventListeners() {
    // For non-virtual scroll galleries
    if (!this.virtualScroll) {
      this.attachStandardListeners();
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.managers.modal.closeAllModals();
      }
      if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.managers.modal.openAddModal();
      }
    });

    // Performance: Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.virtualScroll) {
          console.log('📐 Window resized, virtual scroll will auto-adjust');
        }
      }, 250);
    });
  }

  attachStandardListeners() {
    // Use event delegation for better performance
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.addEventListener('click', (e) => {
      const target = e.target;

      // Edit button
      if (target.closest('.btn-edit')) {
        const btn = target.closest('.btn-edit');
        this.managers.modal.openEditModal({
          id: btn.dataset.id,
          title: btn.dataset.title,
          description: btn.dataset.description
        });
      }

      // Delete button
      else if (target.closest('.btn-delete')) {
        const btn = target.closest('.btn-delete');
        this.managers.modal.openDeleteModal({
          id: btn.dataset.id,
          title: btn.dataset.title
        });
      }

      // See more button
      else if (target.closest('.btn-see-more')) {
        const btn = target.closest('.btn-see-more');
        this.handleViewDescription(btn.dataset.id);
      }

      // Clickable title
      else if (target.closest('.artwork-title')) {
        const title = target.closest('.artwork-title');
        if (title.offsetWidth < title.scrollWidth) {
          this.handleViewDescription(title.dataset.id);
        }
      }
    });
  }

  async handleViewDescription(id) {
    const loader = LoadingManager.showGlobalLoading('Loading description...');
    
    try {
      const data = await enhancedFetch(`/get_description/${id}`);
      
      if (data.success) {
        this.managers.modal.openViewModal({
          title: data.title,
          description: data.description
        });
      } else {
        throw new Error(data.message || 'Failed to load description');
      }
    } catch (error) {
      console.error('Fetch description error:', error);
      if (window.toast) {
        window.toast.error(`Failed to load description: ${error.message}`);
      }
    } finally {
      LoadingManager.hideGlobalLoading();
    }
  }

  initErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (window.toast) {
        window.toast.error('An unexpected error occurred. Please refresh the page.');
      }
    });

    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
  }
  
	initPerformanceMonitoring() {
		if (!this.config.ENABLE_PERFORMANCE_MONITORING) return;

		// FPS monitoring cải tiến
		let isMonitoring = false;
		let animationCount = 0;
		
		document.addEventListener('animationstart', () => {
			animationCount++;
			if (!isMonitoring) {
				isMonitoring = true;
				this.startFPSMonitoring();
			}
		});
		
		document.addEventListener('animationend', () => {
			animationCount--;
			if (animationCount <= 0 && isMonitoring) {
				isMonitoring = false;
				this.stopFPSMonitoring();
			}
		});
	}

	startFPSMonitoring() {
		let lastTime = performance.now();
		let frameCount = 0;
		
		this.fpsInterval = setInterval(() => {
			const currentTime = performance.now();
			const deltaTime = currentTime - lastTime;
			
			if (deltaTime >= 1000) {
				const fps = Math.round(frameCount * 1000 / deltaTime);
				if (fps < 30 && fps > 0) {
					console.warn(`⚠️ Low FPS: ${fps}`);
				}
				frameCount = 0;
				lastTime = currentTime;
			}
		}, 100);
		
		// Đếm frames
		const countFrame = () => {
			frameCount++;
			if (this.fpsInterval) {
				requestAnimationFrame(countFrame);
			}
		};
		requestAnimationFrame(countFrame);
	}

	stopFPSMonitoring() {
		if (this.fpsInterval) {
			clearInterval(this.fpsInterval);
			this.fpsInterval = null;
		}
	}

  initDebugTools() {
    if (typeof window !== 'undefined') {
      window.GalleryDebug = {
        // Animation Queue Status
        getQueueStatus: () => {
          return {
            queueLength: AnimationManager.queue.queue.length,
            isProcessing: AnimationManager.queue.isProcessing,
            currentAnimation: AnimationManager.queue.currentAnimation
          };
        },

        // Virtual Scroll Status
        getVirtualScrollStatus: () => {
          if (!this.virtualScroll) {
            return 'Virtual scroll not active';
          }
          return this.virtualScroll.getMetrics();
        },

        // Force enable/disable virtual scroll
        toggleVirtualScroll: () => {
          if (this.virtualScroll) {
            this.virtualScroll.disable();
            this.virtualScroll = null;
            this.initAnimations();
            console.log('✅ Virtual scroll disabled');
          } else {
            this.initVirtualScroll();
          }
        },

        // Animation performance test
        testAnimationPerformance: () => {
          console.log('🧪 Testing animation performance...');
          const artworks = document.querySelectorAll('.artwork');
          const startTime = performance.now();
          
          artworks.forEach((artwork, index) => {
            setTimeout(() => {
              AnimationManager.animateUpdate(artwork);
            }, index * 10);
          });
          
          setTimeout(() => {
            const endTime = performance.now();
            console.log(`✅ Animation test completed in ${(endTime - startTime).toFixed(2)}ms`);
          }, artworks.length * 10 + 2000);
        },

        // Clear animation queue
        clearQueue: () => {
          AnimationManager.queue.clear();
          console.log('✅ Animation queue cleared');
        },

        // Memory usage
        getMemoryUsage: () => {
          if ('memory' in performance) {
            const memory = performance.memory;
            return {
              used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
              total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
              limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            };
          }
          return 'Memory API not available';
        },

        // App statistics
        getStats: () => {
          return {
            totalArtworks: document.querySelectorAll('.artwork').length,
            virtualScrollEnabled: !!this.virtualScroll,
            virtualScrollThreshold: this.config.VIRTUAL_SCROLL_THRESHOLD,
            animationQueue: this.getQueueStatus(),
            managers: Object.keys(this.managers),
            config: this.config
          };
        }
      };

      // Shortcuts
      window.gDebug = window.GalleryDebug;
      
      console.log('🔧 Gallery Debug Tools Available:');
      console.log('- gDebug.getStats()');
      console.log('- gDebug.getQueueStatus()');
      console.log('- gDebug.getVirtualScrollStatus()');
      console.log('- gDebug.toggleVirtualScroll()');
      console.log('- gDebug.testAnimationPerformance()');
      console.log('- gDebug.getMemoryUsage()');
    }
  }

  showWelcome() {
    setTimeout(() => {
      const artworkCount = document.querySelectorAll('.artwork').length;
      
      if (this.virtualScroll) {
        window.toast.success(
          `Gallery loaded with ${artworkCount} artworks! Enhanced virtual scrolling enabled.`, 
          4000
        );
      } else {
        window.toast.success(`Gallery loaded with ${artworkCount} artworks!`, 3000);
      }
    }, 1000);
  }

  // Public API
  addArtworkInPlace(artworkData) {
    if (this.virtualScroll) {
      // Use virtual scroll's add method
      this.virtualScroll.addArtwork(artworkData);
    } else {
      // Regular gallery add
      const gallery = document.getElementById('gallery');
      const newElement = this.managers.formHandler.createArtworkElement(artworkData);
      
      if (gallery.firstChild) {
        gallery.insertBefore(newElement, gallery.firstChild);
      } else {
        gallery.appendChild(newElement);
      }
      
      // Use animation queue
      AnimationManager.animateNewArtwork(newElement);
      
      // Update counter
      if (this.updateImageCounter) {
        this.updateImageCounter();
      }
      
      // Re-initialize lazy loading
      const newImg = newElement.querySelector('img.lazy');
      if (newImg && this.managers.lazyLoader) {
        this.managers.lazyLoader.observe([newImg]);
      }
    }
    
    return true;
  }

  removeArtworkInPlace(artworkId) {
    if (this.virtualScroll) {
      // Use virtual scroll's remove method
      return this.virtualScroll.removeArtwork(artworkId);
    } else {
      // Regular gallery remove
      const artworkEl = document.querySelector(`[data-id="${artworkId}"]`);
      if (artworkEl) {
        return AnimationManager.animateRemoveArtwork(artworkEl).then(() => {
          artworkEl.remove();
          this.updateImageCounter();
        });
      }
    }
  }

  getStats() {
    return {
      totalArtworks: document.querySelectorAll('.artwork').length,
      virtualScrollEnabled: !!this.virtualScroll,
      virtualScrollThreshold: this.config.VIRTUAL_SCROLL_THRESHOLD,
      animationQueueLength: AnimationManager.queue.queue.length,
      managers: Object.keys(this.managers),
      performanceMonitoring: this.config.ENABLE_PERFORMANCE_MONITORING
    };
  }
 	async handleOrderUpdate() {
		try {
			const gallery = document.getElementById('gallery');
			const artworks = Array.from(gallery.children);
			const totalCount = artworks.length;
			
			const order = artworks.map((el, idx) => ({
				id: el.dataset.id,
				position: totalCount - idx
			}));
			
			const result = await enhancedFetch('/update-order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order })
			});
			
			if (result.success && window.toast) {
				window.toast.success('Order updated successfully!');
				
				// ✅ FIXED: KHÔNG animate tất cả
				// Animation đã được xử lý bởi SortableJS
			}
		} catch (error) {
			console.error('Update order error:', error);
			if (window.toast) window.toast.error('Failed to update order');
		}
	}	 
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.artGalleryApp = new ArtGalleryApp();
  window.artGalleryApp.init();
});


// static/js/animation.js - Enhanced with Animation Queue System

export class AnimationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentAnimation = null;
    this.animatingElements = new Set(); // Track elements being animated
    this.priorities = {
      HIGH: 3,
      MEDIUM: 2,  
      LOW: 1
    };
  }

  add(element, animationType, options = {}) {
    // ✅ FIXED: Check if element is already being animated
    const elementId = element.dataset.id || element.id || Math.random().toString();
    
    if (this.animatingElements.has(elementId)) {
      console.log(`⚠️ Skipping duplicate animation for element ${elementId}`);
      return;
    }

    this.animatingElements.add(elementId);

    const animation = {
      element,
      elementId,
      type: animationType,
      priority: options.priority || this.priorities.LOW,
      callback: options.callback,
      id: Date.now() + Math.random()
    };

    // Insert based on priority
    const insertIndex = this.queue.findIndex(item => item.priority < animation.priority);
    if (insertIndex === -1) {
      this.queue.push(animation);
    } else {
      this.queue.splice(insertIndex, 0, animation);
    }

    // Limit queue size to prevent memory issues
    if (this.queue.length > 200) {
      console.warn('⚠️ Animation queue too large, dropping oldest low-priority items');
      this.queue = this.queue.filter((item, index) => {
        return index < 150 || item.priority > this.priorities.LOW;
      });
    }

    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.currentAnimation = this.queue.shift();
      
      try {
        await this.executeAnimation(this.currentAnimation);
        
        // Small delay between animations for smoothness
        await this.delay(50);
      } catch (error) {
        console.error('Animation error:', error);
      }
    }

    this.isProcessing = false;
    this.currentAnimation = null;
  }

  async executeAnimation(animation) {
    const { element, elementId, type, callback } = animation;
    
    if (!element || !element.parentNode) {
      this.animatingElements.delete(elementId);
      return;
    }

    try {
      switch (type) {
        case 'new':
          await this.animateNew(element);
          break;
        case 'remove':
          await this.animateRemove(element);
          break;
        case 'update':
          await this.animateUpdate(element);
          break;
        case 'entrance':
          await this.animateEntrance(element);
          break;
      }

      if (callback) callback();
    } finally {
      // Clean up tracking
      this.animatingElements.delete(elementId);
    }
  }

  async animateNew(element) {
    return new Promise(resolve => {
      // Clear any existing animations
      this.clearAnimations(element);
      
      // Force reflow for clean animation start
      void element.offsetHeight;
      
      // Apply animation class
      element.classList.add('artwork-new');
      
      const handleEnd = () => {
        element.classList.remove('artwork-new');
        element.classList.add('artwork-pulse');
        
        setTimeout(() => {
          element.classList.remove('artwork-pulse');
          element.classList.add('animation-done');
          element.dataset.animated = 'true'; // ✅ gắn cờ đã animate
          resolve();
        }, 500);
      };

      element.addEventListener('animationend', handleEnd, { once: true });
      
      // Fallback timeout
      setTimeout(() => {
        handleEnd();
      }, 1500);
    });
  }

  async animateRemove(element) {
    return new Promise(resolve => {
      this.clearAnimations(element);
      element.classList.add('artwork-removing');
      
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  async animateUpdate(element) {
    return new Promise(resolve => {
      this.clearAnimations(element);
      element.classList.add('artwork-pulse');
      
      setTimeout(() => {
        element.classList.remove('artwork-pulse');
        resolve();
      }, 1000);
    });
  }

  async animateEntrance(element) {
    return new Promise(resolve => {
      element.classList.add('artwork-entering');
      
      // Use requestAnimationFrame for smooth start
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.classList.remove('artwork-entering');
          element.classList.add('artwork-visible');
          
          setTimeout(() => {
            element.classList.add('animation-done');
            resolve();
          }, 300);
        });
      });
    });
  }

  clearAnimations(element) {
    element.classList.remove(
      'artwork-new',
      'artwork-removing',
      'artwork-pulse',
      'artwork-entering',
      'artwork-visible'
    );
    element.style.animation = '';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cancel specific animation
  cancel(element) {
    this.queue = this.queue.filter(anim => anim.element !== element);
    
    if (this.currentAnimation && this.currentAnimation.element === element) {
      this.clearAnimations(element);
    }
  }

  // Clear all animations
  clear() {
    this.queue = [];
    this.isProcessing = false;
    this.currentAnimation = null;
    this.animatingElements.clear();
  }
}

// Global animation queue instance
const animationQueue = new AnimationQueue();

export class AnimationManager {
  static queue = animationQueue;

  static initPageAnimations(customElements = null) {
    const allArtworks = customElements || document.querySelectorAll('.artwork');
    
    // ✅ FIXED: Check if artwork already has animation or is animated
    const artworksToAnimate = Array.from(allArtworks).filter(el => {
      // Skip if already animated or has animation classes
      if (el.dataset.animated === 'true' || 
          el.classList.contains('animation-done') ||
          el.classList.contains('artwork-visible') ||
          el.classList.contains('artwork-entering')) {
        return false;
      }
      
      // Only animate artworks in initial viewport + buffer
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      return rect.top < vh * 2; // Slightly larger buffer
    });

    console.log(`📡 Setting up animations for ${artworksToAnimate.length} artworks (filtered from ${allArtworks.length} total)`);

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        const el = entry.target;

        // ✅ FIXED: Strict check to prevent duplicate animations
        if (entry.isIntersecting && 
            el.dataset.animated !== 'true' &&
            !el.classList.contains('animating')) {
          
          // Mark as animating to prevent duplicates
          el.classList.add('animating');
          
          this.queue.add(el, 'entrance', {
            priority: this.queue.priorities.LOW,
            callback: () => {
              el.dataset.animated = 'true';
              el.classList.remove('animating');
              obs.unobserve(el); // Stop observing after animation
            }
          });
        }
      });
    }, {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    });

    // Observe only the filtered artworks
    artworksToAnimate.forEach(el => {
      observer.observe(el);
    });

    // ✅ NEW: For artworks already in viewport, animate immediately
    const immediateAnimations = artworksToAnimate.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    });

    immediateAnimations.forEach((el, index) => {
      // Stagger immediate animations slightly
      setTimeout(() => {
        if (el.dataset.animated !== 'true' && !el.classList.contains('animating')) {
          el.classList.add('animating');
          this.queue.add(el, 'entrance', {
            priority: this.queue.priorities.LOW,
            callback: () => {
              el.dataset.animated = 'true';
              el.classList.remove('animating');
              observer.unobserve(el);
            }
          });
        }
      }, index * 30); // Smaller delay for visible items
    });
  }

  static animateNewArtwork(artworkElement) {
    if (!artworkElement) return;
    
    this.queue.add(artworkElement, 'new', {
      priority: this.queue.priorities.MEDIUM
    });
  }

  static animateRemoveArtwork(artworkElement) {
    return new Promise(resolve => {
      if (!artworkElement) {
        resolve();
        return;
      }
      
      this.queue.add(artworkElement, 'remove', {
        priority: this.queue.priorities.HIGH,
        callback: resolve
      });
    });
  }

  static animateUpdate(element) {
    if (!element) return;
    
    this.queue.add(element, 'update', {
      priority: this.queue.priorities.MEDIUM
    });
  }

  static animateModalOpen(modal) {
    if (!modal) return;
    
    modal.classList.add('modal-entering');
    modal.style.display = 'block';
    
    requestAnimationFrame(() => {
      modal.classList.remove('modal-entering');
      modal.classList.add('modal-visible');
    });
  }

  static animateModalClose(modal) {
    return new Promise(resolve => {
      if (!modal) {
        resolve();
        return;
      }
      
      modal.classList.remove('modal-visible');
      modal.classList.add('modal-entering');
      
      setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('modal-entering');
        resolve();
      }, 300);
    });
  }

  static createLoadingSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'artwork artwork-skeleton';
    skeleton.innerHTML = `
      <div class="artwork-container">
        <div class="skeleton-img"></div>
      </div>
      <div class="artwork-info">
        <div class="skeleton-title"></div>
        <div class="skeleton-desc"></div>
      </div>
    `;
    return skeleton;
  }

  static scrollToElement(element, offset = 100) {
    if (!element) return;
    
    const elementTop = element.offsetTop - offset;
    
    window.scrollTo({
      top: elementTop,
      behavior: 'smooth'
    });
  }

  static fadeIn(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise(resolve => {
      element.style.opacity = '0';
      element.style.transition = `opacity ${duration}ms ease`;
      element.style.display = 'block';
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        setTimeout(resolve, duration);
      });
    });
  }

  static fadeOut(element, duration = 300) {
    if (!element) return Promise.resolve();
    
    return new Promise(resolve => {
      element.style.opacity = '1';
      element.style.transition = `opacity ${duration}ms ease`;
      
      requestAnimationFrame(() => {
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.display = 'none';
          resolve();
        }, duration);
      });
    });
  }

  static shouldReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  static performanceAwareAnimate(callback) {
    if (this.shouldReduceMotion()) {
      return;
    }
    
    if (typeof callback === 'function') {
      callback();
    }
  }

  // Debug mode with queue info
  static enableDebugMode() {
    console.log('🎬 Animation Debug Mode Enabled');
    
    // Monitor queue
    setInterval(() => {
      if (this.queue.queue.length > 0) {
        console.log(`📊 Animation Queue: ${this.queue.queue.length} pending`);
      }
    }, 1000);
    
    document.addEventListener('animationstart', (e) => {
      console.log(`🎬 Animation started: ${e.animationName} on`, e.target);
    });
    
    document.addEventListener('animationend', (e) => {
      console.log(`🎬 Animation ended: ${e.animationName} on`, e.target);
    });
  }

  static measureAnimationPerformance(callback) {
    const startTime = performance.now();
    
    if (typeof callback === 'function') {
      callback();
    }
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log(`🎬 Animation completed in ${endTime - startTime}ms`);
    });
  }
}

export class MemoryManager {
  static cleanupArtwork(artworkElement) {
    // Cancel any pending animations
    AnimationManager.queue.cancel(artworkElement);
    
    const img = artworkElement.querySelector('img');
    if (img && img.src.startsWith('blob:')) {
      URL.revokeObjectURL(img.src);
    }
    
    const buttons = artworkElement.querySelectorAll('button');
    buttons.forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    });
  }

  static cleanupAnimationListeners(element) {
    if (!element) return;
    
    const clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);
    return clone;
  }

  static getMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }
}

export class LoadingManager {
  static setButtonLoading(button, loading = true) {
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      button.setAttribute('data-original-text', button.textContent);
      button.setAttribute('data-original-html', button.innerHTML);
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      const originalText = button.getAttribute('data-original-text');
      const originalHtml = button.getAttribute('data-original-html');
      if (originalHtml) {
        button.innerHTML = originalHtml;
      } else if (originalText) {
        button.textContent = originalText;
      }
    }
  }

  static showGlobalLoading(message = 'Loading...') {
    let loader = document.querySelector('.global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'global-loader';
      loader.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
      `;
      document.body.appendChild(loader);
    } else {
      const messageEl = loader.querySelector('.loading-message');
      if (messageEl) messageEl.textContent = message;
    }
    
    loader.style.display = 'block';
    AnimationManager.fadeIn(loader, 200);
    return loader;
  }

  static hideGlobalLoading() {
    const loader = document.querySelector('.global-loader');
    if (loader) {
      AnimationManager.fadeOut(loader, 200).then(() => {
        loader.style.display = 'none';
      });
    }
  }

  static showProgressBar(container, progress = 0) {
    let progressBar = container.querySelector('.progress-bar');
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = `
        <div class="progress-fill" style="width: ${progress}%"></div>
        <div class="progress-text">${progress}%</div>
      `;
      container.appendChild(progressBar);
    }
    
    return progressBar;
  }

  static updateProgress(progressBar, progress) {
    if (!progressBar) return;
    
    const fill = progressBar.querySelector('.progress-fill');
    const text = progressBar.querySelector('.progress-text');
    
    if (fill) fill.style.width = `${progress}%`;
    if (text) text.textContent = `${progress}%`;
  }
}

// Auto-enable debug mode in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  AnimationManager.enableDebugMode();
}
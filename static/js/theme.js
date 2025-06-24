// Theme management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.retroEffects = localStorage.getItem('retroEffects') !== 'false'; // Default true
        this.toggle = document.getElementById('theme-toggle');
        this.init();
    }
    
    init() {
        // Set initial theme
        this.applyTheme();
        
        // Toggle listener
        this.toggle.addEventListener('click', () => {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            this.applyTheme();
            this.saveTheme();
            
            // Smooth transition
            document.body.style.transition = 'background-color 0.3s ease';
            
            // Show toast with delay to ensure it's visible
            setTimeout(() => {
                if (window.toast) {
                    window.toast.info(`Switched to ${this.theme} mode`);
                } else {
                    console.warn('Toast not initialized yet');
                }
            }, 100);
        });
    }
    
    saveTheme() {
        localStorage.setItem('theme', this.theme);
    }
    
    // Smooth theme transition
    applyTheme() {
        // Add transition class
        document.documentElement.classList.add('theme-transitioning');
        
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Update meta theme-color with retro colors
        const metaTheme = document.querySelector('meta[name="theme-color"]') || 
                          document.createElement('meta');
        metaTheme.name = 'theme-color';
        metaTheme.content = this.theme === 'dark' ? '#0a0a0a' : '#f5eee6';
        if (!document.querySelector('meta[name="theme-color"]')) {
            document.head.appendChild(metaTheme);
        }
        
        // Add retro effect for dark mode
        if (this.theme === 'dark') {
            this.addRetroEffect();
        } else {
            this.removeRetroEffect();
        }
        
        // Remove transition class after animation
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 300);
    }
    
    // Add retro CRT effect
    addRetroEffect() {
        // Only add effects if enabled
        if (!this.retroEffects) return;
        
        // Remove flicker effect for eye comfort
        // document.body.style.animation = 'retro-flicker 0.1s infinite';
        
        // Create scanline overlay if not exists
        if (!document.getElementById('retro-scanlines')) {
            const scanlines = document.createElement('div');
            scanlines.id = 'retro-scanlines';
            scanlines.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9998;
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(255, 255, 255, 0.03) 2px,
                    rgba(255, 255, 255, 0.03) 4px
                );
                opacity: 0.2;
            `;
            document.body.appendChild(scanlines);
        }
    }
    
    removeRetroEffect() {
        document.body.style.animation = '';
        const scanlines = document.getElementById('retro-scanlines');
        if (scanlines) {
            scanlines.remove();
        }
    }
    
    // Toggle retro effects on/off
    toggleRetroEffects() {
        this.retroEffects = !this.retroEffects;
        localStorage.setItem('retroEffects', this.retroEffects);
        
        if (this.theme === 'dark') {
            if (this.retroEffects) {
                this.addRetroEffect();
            } else {
                this.removeRetroEffect();
            }
        }
        
        // Show toast
        if (window.toast) {
            window.toast.info(`Retro effects ${this.retroEffects ? 'enabled' : 'disabled'}`);
        }
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    
    // Debug: Check if toast is available
    setTimeout(() => {
        if (!window.toast) {
            console.error('Toast system not initialized. Please check toast.js is loaded.');
        }
    }, 1000);
});

// To toggle retro effects on/off, call:
// window.themeManager.toggleRetroEffects()

// Add retro flicker animation
const style = document.createElement('style');
style.textContent = `
    @keyframes retro-flicker {
        0% { opacity: 1; }
        50% { opacity: 0.98; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);
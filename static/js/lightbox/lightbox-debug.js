// lightbox-debug.js - Debug and troubleshooting helper
class LightboxDebugger {
    constructor() {
        this.enabled = false;
        this.init();
    }
    
    init() {
        // Enable debug mode with console command
        window.enableLightboxDebug = () => {
            this.enabled = true;
            console.log('🐛 Lightbox debug mode enabled');
            this.runDiagnostics();
        };
        
        window.disableLightboxDebug = () => {
            this.enabled = false;
            console.log('✅ Lightbox debug mode disabled');
        };
        
        window.lightboxDiagnostics = () => this.runDiagnostics();
    }
    
    log(message, data = null) {
        if (this.enabled) {
            console.log(`🔍 LIGHTBOX DEBUG: ${message}`, data || '');
        }
    }
    
    error(message, error = null) {
        if (this.enabled) {
            console.error(`❌ LIGHTBOX ERROR: ${message}`, error || '');
        }
    }
    
    runDiagnostics() {
        console.group('🔍 Lightbox Diagnostics');
        
        // Check if lightbox is properly initialized
        this.checkLightboxInstance();
        this.checkGlobalMethods();
        this.checkDOMElements();
        this.checkEventListeners();
        this.checkCSS();
        
        console.groupEnd();
    }
    
    checkLightboxInstance() {
        console.group('📦 Lightbox Instance Check');
        
        if (window.galleryLightboxInstance) {
            console.log('✅ Lightbox instance found:', window.galleryLightboxInstance);
            console.log('✅ Images collected:', window.galleryLightboxInstance.images?.length || 0);
            console.log('✅ Current index:', window.galleryLightboxInstance.currentIndex);
            console.log('✅ Is open:', window.galleryLightboxInstance.isOpen);
        } else {
            console.error('❌ Lightbox instance not found');
        }
        
        console.groupEnd();
    }
    
    checkGlobalMethods() {
        console.group('🌐 Global Methods Check');
        
        const expectedMethods = [
            'toggleSection',
            'togglePromptExpansion', 
            'copyToClipboard',
            'open',
            'close',
            'navigate'
        ];
        
        if (window.galleryLightbox) {
            console.log('✅ window.galleryLightbox exists:', window.galleryLightbox);
            
            expectedMethods.forEach(method => {
                if (typeof window.galleryLightbox[method] === 'function') {
                    console.log(`✅ ${method}: available`);
                } else {
                    console.error(`❌ ${method}: missing or not a function`);
                }
            });
        } else {
            console.error('❌ window.galleryLightbox not found');
        }
        
        console.groupEnd();
    }
    
    checkDOMElements() {
        console.group('🏗️ DOM Elements Check');
        
        const requiredElements = [
            '.lightbox',
            '.lightbox-content',
            '.lightbox-image',
            '.lightbox-title',
            '.lightbox-description',
            '.metadata-content'
        ];
        
        requiredElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`✅ ${selector}: found`);
            } else {
                console.error(`❌ ${selector}: not found`);
            }
        });
        
        // Check artwork elements
        const artworks = document.querySelectorAll('.artwork');
        console.log(`📊 Found ${artworks.length} artwork elements`);
        
        console.groupEnd();
    }
    
    checkEventListeners() {
        console.group('🎯 Event Listeners Check');
        
        // Check if images have click listeners
        const images = document.querySelectorAll('.artwork img');
        console.log(`📸 Found ${images.length} artwork images`);
        
        // Check for onclick handlers in metadata
        const onclickButtons = document.querySelectorAll('[onclick*="galleryLightbox"]');
        console.log(`🔘 Found ${onclickButtons.length} buttons with galleryLightbox onclick handlers`);
        
        if (onclickButtons.length > 0) {
            onclickButtons.forEach((btn, index) => {
                const onclickAttr = btn.getAttribute('onclick');
                console.log(`Button ${index + 1}: ${onclickAttr}`);
            });
        }
        
        console.groupEnd();
    }
    
    checkCSS() {
        console.group('🎨 CSS Check');
        
        const lightbox = document.querySelector('.lightbox');
        if (lightbox) {
            const styles = window.getComputedStyle(lightbox);
            console.log(`Lightbox display: ${styles.display}`);
            console.log(`Lightbox z-index: ${styles.zIndex}`);
            console.log(`Lightbox position: ${styles.position}`);
        }
        
        // Check if CSS files are loaded
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        const lightboxCSS = Array.from(stylesheets).find(sheet => 
            sheet.href.includes('lightbox') || sheet.href.includes('lightbox.css')
        );
        
        if (lightboxCSS) {
            console.log('✅ Lightbox CSS found:', lightboxCSS.href);
        } else {
            console.warn('⚠️ Lightbox CSS not found in stylesheets');
        }
        
        console.groupEnd();
    }
    
    testLightboxFunctions() {
        console.group('🧪 Function Tests');
        
        if (window.galleryLightbox) {
            // Test copyToClipboard
            if (typeof window.galleryLightbox.copyToClipboard === 'function') {
                console.log('Testing copyToClipboard...');
                try {
                    window.galleryLightbox.copyToClipboard('test');
                    console.log('✅ copyToClipboard works');
                } catch (error) {
                    console.error('❌ copyToClipboard failed:', error);
                }
            }
            
            // Test other functions...
        }
        
        console.groupEnd();
    }
    
    monitorErrors() {
        // Monitor for lightbox-related errors
        const originalError = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            if (message.includes('galleryLightbox') || 
                message.includes('lightbox') ||
                source.includes('lightbox')) {
                this.error('JavaScript Error:', {
                    message,
                    source,
                    line: lineno,
                    column: colno,
                    error
                });
            }
            
            if (originalError) {
                return originalError(message, source, lineno, colno, error);
            }
        };
        
        // Monitor unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && (
                event.reason.message?.includes('galleryLightbox') ||
                event.reason.stack?.includes('lightbox')
            )) {
                this.error('Unhandled Promise Rejection:', event.reason);
            }
        });
    }
}

// Initialize debugger
document.addEventListener('DOMContentLoaded', () => {
    window.lightboxDebugger = new LightboxDebugger();
    
    // Auto-run diagnostics if debug param is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('lightbox_debug') === 'true') {
        window.enableLightboxDebug();
    }
});

// Add CSS for debug info
const debugCSS = `
.lightbox-debug-info {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    padding: 10px;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 9999;
    display: none;
}

.lightbox-debug-info.visible {
    display: block;
}
`;

const debugStyleSheet = document.createElement('style');
debugStyleSheet.textContent = debugCSS;
document.head.appendChild(debugStyleSheet);
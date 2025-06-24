// lightbox-manager.js - Main lightbox orchestrator (FIXED)
import { LightboxCore } from './lightbox-core.js';
import { LightboxEditing } from './lightbox-editing.js';
import { LightboxMetadata } from './lightbox-metadata.js';

class Lightbox extends LightboxCore {
    constructor() {
        super();
        
        // Initialize additional modules
        this.editing = new LightboxEditing(this);
        this.metadata = new LightboxMetadata(this);
        
        // ✅ FIX: Properly expose methods to global scope AFTER initialization
        this.exposeGlobalMethods();
        
        console.log('✨ Enhanced Lightbox with See More and Inline Editing initialized');
    }
    
    // ✅ NEW: Properly expose methods for HTML onclick handlers
    exposeGlobalMethods() {
        // Create a stable reference to methods that can be called from HTML
        window.galleryLightbox = {
            // Core lightbox methods
            open: (index) => this.open(index),
            close: () => this.close(),
            navigate: (direction) => this.navigate(direction),
            
            // Metadata methods
            toggleSection: (header) => this.metadata.toggleSection(header),
            togglePromptExpansion: (button) => this.metadata.togglePromptExpansion(button),
            copyToClipboard: (text) => this.metadata.copyToClipboard(text),
            
            // Editing methods (if needed)
            startEditing: (type) => this.editing.startEditing(type),
            saveEdit: (type) => this.editing.saveEdit(type),
            cancelEdit: (type) => this.editing.cancelEdit(type),
            
            // Utility methods
            getCurrentImage: () => this.images[this.currentIndex],
            isOpen: () => this.isOpen,
            isEditing: () => this.editing.editingElement !== null
        };
        
        // Also expose the full lightbox instance for advanced usage
        window.galleryLightboxInstance = this;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create the lightbox instance
    const lightbox = new Lightbox();
    
    // ✅ FIX: Additional safety check
    if (typeof window.galleryLightbox !== 'object') {
        console.error('❌ Failed to expose lightbox methods globally');
    } else {
        console.log('✅ Lightbox methods exposed globally');
    }
});
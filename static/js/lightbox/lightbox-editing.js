// lightbox-editing.js - Inline editing functionality
export class LightboxEditing {
    constructor(lightboxCore) {
        this.core = lightboxCore;
        this.editingElement = null;
        this.originalValues = {};
        this.currentTextarea = null; // ✅ NEW: Track current textarea element
        this.expandedStates = {
            title: false,
            description: false
        };
        
        this.init();
    }
    
    init() {
        this.setupInlineEditing();
        this.setupSeeMoreFunctionality();
        
        // Expose methods to core
        this.core.editingElement = null;
        this.core.checkTextOverflow = (type) => this.checkTextOverflow(type);
        this.core.cancelEdit = (type) => this.cancelEdit(type);
    }
    
    setupInlineEditing() {
        // ✅ NEW: Click on edit button to edit (removed click-on-text functionality)
        const titleEditBtn = this.core.container.querySelector('.title-edit-btn');
        const descEditBtn = this.core.container.querySelector('.description-edit-btn');
        
        titleEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.editingElement === 'title') {
                this.cancelEdit('title');
            } else if (!this.editingElement) {
                this.startEditing('title');
            }
        });
        
        descEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.editingElement === 'description') {
                this.cancelEdit('description');
            } else if (!this.editingElement) {
                this.startEditing('description');
            }
        });
        
        // Save/Cancel buttons for title
        const titleControls = this.core.elements.titleContainer.querySelector('.title-edit-controls');
        titleControls.querySelector('.save-btn').addEventListener('click', () => this.saveEdit('title'));
        titleControls.querySelector('.cancel-btn').addEventListener('click', () => this.cancelEdit('title'));
        
        // Save/Cancel buttons for description  
        const descControls = this.core.elements.descriptionContainer.querySelector('.description-edit-controls');
        descControls.querySelector('.save-btn').addEventListener('click', () => this.saveEdit('description'));
        descControls.querySelector('.cancel-btn').addEventListener('click', () => this.cancelEdit('description'));
        
        // Enhanced keyboard handling
        document.addEventListener('keydown', (e) => {
            if (!this.core.isOpen || !this.editingElement) return;
            this.handleEditingKeyboard(e);
        });
    }
    
    setupSeeMoreFunctionality() {
        // See more buttons
        this.core.elements.titleShowMore.addEventListener('click', () => this.toggleSeeMore('title'));
        this.core.elements.descriptionShowMore.addEventListener('click', () => this.toggleSeeMore('description'));
    }
    
    checkTextOverflow(type) {
        const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
        const showMoreBtn = type === 'title' ? this.core.elements.titleShowMore : this.core.elements.descriptionShowMore;
        const lineClamp = type === 'title' ? 2 : 3;
        
        // Create a temporary clone to measure full height
        const clone = contentElement.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.width = contentElement.offsetWidth + 'px';
        clone.classList.remove('truncated');
        contentElement.parentElement.appendChild(clone);
        
        const fullHeight = clone.offsetHeight;
        const lineHeight = parseInt(window.getComputedStyle(clone).lineHeight);
        const maxHeight = lineHeight * lineClamp;
        
        clone.remove();
        
        // Show/hide "See more" button based on overflow
        if (fullHeight > maxHeight) {
            showMoreBtn.style.display = 'inline-block';
            if (!this.expandedStates[type]) {
                contentElement.classList.add('truncated');
                showMoreBtn.textContent = 'See more';
            }
        } else {
            showMoreBtn.style.display = 'none';
            contentElement.classList.remove('truncated');
            this.expandedStates[type] = false;
        }
    }
    
    toggleSeeMore(type) {
        const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
        const showMoreBtn = type === 'title' ? this.core.elements.titleShowMore : this.core.elements.descriptionShowMore;
        
        this.expandedStates[type] = !this.expandedStates[type];
        
        if (this.expandedStates[type]) {
            contentElement.classList.remove('truncated');
            showMoreBtn.textContent = 'See less';
        } else {
            contentElement.classList.add('truncated');
            showMoreBtn.textContent = 'See more';
        }
    }
    
    startEditing(type) {
        if (this.editingElement) return;
        
        this.editingElement = type;
        this.core.editingElement = type; // Sync with core
        
        const element = type === 'title' ? this.core.elements.title : this.core.elements.description;
        const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
        const editBtn = type === 'title' ? 
            this.core.container.querySelector('.title-edit-btn') :
            this.core.container.querySelector('.description-edit-btn');
        const controls = type === 'title' ? 
            this.core.elements.titleContainer.querySelector('.title-edit-controls') :
            this.core.elements.descriptionContainer.querySelector('.description-edit-controls');
        
        // ✅ NEW: Add highlight animation
        element.classList.add('editing-highlight');
        setTimeout(() => element.classList.remove('editing-highlight'), 500);
        
        // ✅ NEW: Update edit button state
        editBtn.classList.add('editing');
        editBtn.innerHTML = '<i class="fas fa-times"></i>'; // Change to cancel icon
        editBtn.title = 'Cancel editing (Escape)';
        
        // Hide see more button during editing
        const showMoreBtn = type === 'title' ? this.core.elements.titleShowMore : this.core.elements.descriptionShowMore;
        showMoreBtn.style.display = 'none';
        
        // Store original value
        this.originalValues[type] = contentElement.textContent.trim();
        
        // Handle empty placeholder text
        let textValue = this.originalValues[type];
        if (textValue === 'Click pen icon to add title...' || textValue === 'Click pen icon to add description...') {
            textValue = '';
        }
        
        // ✅ NEW: Create textarea for better plain text editing
        const textarea = document.createElement('textarea');
        textarea.value = textValue;
        textarea.className = 'editing-textarea';
        textarea.style.minHeight = type === 'title' ? '60px' : '120px';
        textarea.style.maxHeight = type === 'title' ? '200px' : '400px';
        
        // Replace content with textarea
        contentElement.style.display = 'none';
        contentElement.parentNode.insertBefore(textarea, contentElement);
        
        // Focus and select all
        textarea.focus();
        setTimeout(() => textarea.select(), 10); // Small delay for better cross-browser support
        
        // ✅ NEW: Enhanced keyboard handling for textarea
        textarea.addEventListener('keydown', (e) => {
            // Ctrl+A support
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                textarea.select();
                return;
            }
            
            // Save shortcuts
            if (e.key === 'Enter') {
                if (type === 'title' || e.ctrlKey) {
                    e.preventDefault();
                    this.saveEdit(type);
                }
            }
            
            // Cancel shortcut
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEdit(type);
            }
            
            // Prevent other lightbox shortcuts while editing
            e.stopPropagation();
        });
        
        // Show controls
        controls.classList.add('visible');
        
        // Store textarea reference for cleanup
        this.currentTextarea = textarea;
        
        // Prevent lightbox navigation while editing
        this.core.container.classList.add('editing-mode');
        
        this.core.log(`Started editing ${type} with pen icon`);
        
        if (window.toast) {
            const shortcut = type === 'title' ? 'Enter' : 'Ctrl+Enter';
            window.toast.info(`Editing ${type}. Press ${shortcut} to save, Escape to cancel.`);
        }
    }
    
    async saveEdit(type) {
        if (this.editingElement !== type || !this.currentTextarea) return;
        
        const newValue = this.currentTextarea.value.trim();
        const currentImage = this.core.images[this.core.currentIndex];
        
        if (!currentImage) {
            this.cancelEdit(type);
            return;
        }
        
        // Show loading state
        const controls = type === 'title' ? 
            this.core.elements.titleContainer.querySelector('.title-edit-controls') :
            this.core.elements.descriptionContainer.querySelector('.description-edit-controls');
        
        const saveBtn = controls.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '⏳';
        saveBtn.disabled = true;
        
        try {
            // Prepare update data
            const updateData = {
                [type]: newValue
            };
            
            // Send update to server
            const response = await fetch(`/api/artwork/${currentImage.id}/update-text`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update local data
                currentImage[type] = newValue;
                
                // Update content element with new value
                const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
                contentElement.textContent = newValue || (type === 'title' ? 'Click pen icon to add title...' : 'Click pen icon to add description...');
                
                // Update DOM in gallery
                this.updateGalleryElement(currentImage.id, type, newValue);
                
                this.finishEditing(type);
                
                // Apply success animation
                const container = type === 'title' ? this.core.elements.titleContainer : this.core.elements.descriptionContainer;
                container.classList.add('update-success');
                setTimeout(() => container.classList.remove('update-success'), 1000);
                
                if (window.toast) {
                    window.toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
                }
                
                this.core.log(`Successfully updated ${type}: "${newValue}"`);
                
            } else {
                throw new Error(result.message || 'Update failed');
            }
            
        } catch (error) {
            console.error(`Failed to update ${type}:`, error);
            
            // Rollback on error - restore textarea value
            this.currentTextarea.value = this.originalValues[type];
            
            if (window.toast) {
                window.toast.error(`Failed to update ${type}: ${error.message}`);
            }
            
            this.cancelEdit(type);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
    
    cancelEdit(type) {
        if (this.editingElement !== type) return;
        
        // Restore original value to content element
        const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
        const originalValue = this.originalValues[type];
        
        contentElement.textContent = originalValue || (type === 'title' ? 'Click pen icon to add title...' : 'Click pen icon to add description...');
        
        this.finishEditing(type);
        
        this.core.log(`Cancelled editing ${type}`);
    }
    
    finishEditing(type) {
        const element = type === 'title' ? this.core.elements.title : this.core.elements.description;
        const contentElement = type === 'title' ? this.core.elements.titleContent : this.core.elements.descriptionContent;
        const editBtn = type === 'title' ? 
            this.core.container.querySelector('.title-edit-btn') :
            this.core.container.querySelector('.description-edit-btn');
        const controls = type === 'title' ? 
            this.core.elements.titleContainer.querySelector('.title-edit-controls') :
            this.core.elements.descriptionContainer.querySelector('.description-edit-controls');
        
        // ✅ NEW: Restore edit button
        editBtn.classList.remove('editing');
        editBtn.innerHTML = '<i class="fas fa-pen"></i>';
        editBtn.title = `Edit ${type}`;
        
        // ✅ NEW: Remove textarea and restore content
        if (this.currentTextarea) {
            this.currentTextarea.remove();
            this.currentTextarea = null;
        }
        
        contentElement.style.display = '';
        
        // Update empty state
        const text = contentElement.textContent.trim();
        element.classList.remove('empty');
        if (!text || text === 'Click pen icon to add title...' || text === 'Click pen icon to add description...') {
            element.classList.add('empty');
        }
        
        // Remove editing classes
        element.classList.remove('editable-' + type);
        element.classList.remove('editing');
        contentElement.removeAttribute('data-placeholder');
        
        // Hide controls
        controls.classList.remove('visible');
        
        // Re-enable lightbox navigation
        this.core.container.classList.remove('editing-mode');
        
        // Clear editing state
        this.editingElement = null;
        this.core.editingElement = null; // Sync with core
        delete this.originalValues[type];
        
        // Check if we need to show "See more" button again
        this.checkTextOverflow(type);
    }
    
    updateGalleryElement(artworkId, type, newValue) {
        // Update the corresponding element in the main gallery
        const galleryArtwork = document.querySelector(`[data-id="${artworkId}"]`);
        if (!galleryArtwork) return;
        
        if (type === 'title') {
            const titleElement = galleryArtwork.querySelector('.artwork-title');
            if (titleElement) {
                titleElement.textContent = newValue;
                
                // Update data attributes for edit modal
                const editBtn = galleryArtwork.querySelector('.btn-edit');
                if (editBtn) {
                    editBtn.dataset.title = newValue;
                }
            } else if (newValue) {
                // Create title element if it doesn't exist
                const infoContainer = galleryArtwork.querySelector('.artwork-info');
                if (infoContainer) {
                    const titleEl = document.createElement('h3');
                    titleEl.className = 'artwork-title';
                    titleEl.dataset.id = artworkId;
                    titleEl.textContent = newValue;
                    infoContainer.insertBefore(titleEl, infoContainer.firstChild);
                    
                    // Update edit button
                    const editBtn = galleryArtwork.querySelector('.btn-edit');
                    if (editBtn) {
                        editBtn.dataset.title = newValue;
                    }
                }
            }
        } else if (type === 'description') {
            const descElement = galleryArtwork.querySelector('.truncated-description');
            if (descElement) {
                descElement.textContent = newValue;
                
                // Update data attributes for edit modal
                const editBtn = galleryArtwork.querySelector('.btn-edit');
                if (editBtn) {
                    editBtn.dataset.description = newValue;
                }
                
                // Handle "See more" button
                const seeMoreBtn = galleryArtwork.querySelector('.btn-see-more');
                if (newValue.length > 120) {
                    if (!seeMoreBtn) {
                        const btn = document.createElement('button');
                        btn.className = 'btn-see-more';
                        btn.dataset.id = artworkId;
                        btn.textContent = 'See more';
                        descElement.parentElement.appendChild(btn);
                    }
                } else {
                    if (seeMoreBtn) {
                        seeMoreBtn.remove();
                    }
                }
            }
        }
        
        // Add update animation
        if (galleryArtwork && window.AnimationManager) {
            window.AnimationManager.animateUpdate(galleryArtwork);
        }
    }
    
    handleEditingKeyboard(e) {
        // ✅ NEW: Let textarea handle its own keyboard events
        // The textarea already has keyboard handling in startEditing method
        // This method now only handles global editing shortcuts
        
        const isTitle = this.editingElement === 'title';
        
        // Only handle shortcuts not already handled by textarea
        if (e.target.classList && e.target.classList.contains('editing-textarea')) {
            // Textarea is handling keyboard - don't interfere
            return;
        }
        
        // Global editing shortcuts (when not focused on textarea)
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelEdit(this.editingElement);
        }
        
        // Prevent other shortcuts while editing
        e.stopPropagation();
    }
}
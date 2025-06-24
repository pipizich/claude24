// Edit Mode Manager
class EditModeManager {
    constructor() {
        this.isEditMode = false;
        this.selectedItems = new Set();
        this.toggleButton = null;
        this.actionBar = null;
        this.selectionCounter = null;
        this.originalVirtualScrollState = null;
        
        this.init();
    }
    
    init() {
        // Create UI elements
        this.createEditModeToggle();
        this.createEditControls();
        this.createActionBar();
        this.createBatchUploadModal();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check if we need to restore edit mode after reload
        if (sessionStorage.getItem('restoreEditMode') === 'true') {
            sessionStorage.removeItem('restoreEditMode');
            setTimeout(() => this.enterEditMode(), 100);
        }
        
        console.log('✅ Edit Mode Manager initialized');
    }
    
    createEditModeToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'edit-mode-toggle';
        toggle.innerHTML = '<i class="fas fa-cog"></i>';
        toggle.title = 'Toggle Edit Mode';
        toggle.setAttribute('aria-label', 'Toggle Edit Mode');
        
        document.body.appendChild(toggle);
        this.toggleButton = toggle;
    }
    
    createEditControls() {
        const controls = document.createElement('div');
        controls.className = 'edit-mode-controls';
        controls.innerHTML = `
            <div class="edit-controls-center">
                <button class="btn-select-all">
                    <i class="fas fa-check-square"></i> Select All
                </button>
                <button class="btn-batch-upload">
                    <i class="fas fa-plus"></i> Batch Upload
                </button>
            </div>
            <div class="edit-controls-right">
                <span class="selection-counter">
                    <i class="fas fa-chart-bar"></i> Selected: <span id="selected-count">0</span>/<span id="total-count">0</span>
                </span>
            </div>
        `;
        
        document.body.appendChild(controls);
        this.controlsBar = controls;
        this.selectionCounter = controls.querySelector('#selected-count');
        this.totalCounter = controls.querySelector('#total-count');
    }
    
    createActionBar() {
        const actionBar = document.createElement('div');
        actionBar.className = 'edit-action-bar';
        actionBar.innerHTML = `
            <button class="action-btn btn-move-top">
                <i class="fas fa-arrow-up"></i> Move to Top
            </button>
            <button class="action-btn btn-move-bottom">
                <i class="fas fa-arrow-down"></i> Move to Bottom
            </button>
            <button class="action-btn btn-delete-selected">
                <i class="fas fa-trash"></i> Delete Selected
            </button>
        `;
        
        document.body.appendChild(actionBar);
        this.actionBar = actionBar;
    }
    
    createBatchUploadModal() {
        const modal = document.createElement('div');
        modal.className = 'batch-upload-modal';
        modal.innerHTML = `
            <div class="batch-upload-content">
                <span class="close">&times;</span>
                <h2>Batch Upload Images</h2>
                <div class="batch-drop-zone">
                    <p><i class="fas fa-cloud-upload-alt fa-3x"></i></p>
                    <p>Drag & drop multiple images here</p>
                    <p>or click to select files</p>
                    <input type="file" id="batch-file-input" multiple accept="image/*" hidden>
                </div>
                <div class="batch-preview-grid" id="batch-preview-grid"></div>
                <div class="batch-upload-progress" id="batch-upload-progress" style="display: none;"></div>
                <div class="button-group" style="margin-top: 20px;">
                    <button class="btn-submit" id="start-batch-upload" style="display: none;">
                        Upload All Images
                    </button>
                    <button class="btn-cancel" id="cancel-batch-upload">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.batchUploadModal = modal;
        this.batchFiles = [];
    }
    
    setupEventListeners() {
        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggleEditMode());
        
        // Control buttons
        this.controlsBar.querySelector('.btn-select-all').addEventListener('click', () => this.toggleSelectAll());
        this.controlsBar.querySelector('.btn-batch-upload').addEventListener('click', () => this.openBatchUpload());
        
        // Action buttons
        this.actionBar.querySelector('.btn-move-top').addEventListener('click', () => this.moveSelectedToTop());
        this.actionBar.querySelector('.btn-move-bottom').addEventListener('click', () => this.moveSelectedToBottom());
        this.actionBar.querySelector('.btn-delete-selected').addEventListener('click', () => this.deleteSelected());
        
        // Batch upload
        this.setupBatchUpload();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isEditMode) {
                if (e.ctrlKey && e.key === 'a') {
                    e.preventDefault();
                    this.toggleSelectAll();
                }
                if (e.key === 'Delete' && this.selectedItems.size > 0) {
                    e.preventDefault();
                    this.deleteSelected();
                }
            }
        });
    }
    
    toggleEditMode() {
        if (this.isEditMode) {
            this.exitEditMode();
        } else {
            this.enterEditMode();
        }
    }
    
    enterEditMode() {
        console.log('🔧 Entering Edit Mode...');
        
        // Add edit mode class
        document.body.classList.add('edit-mode');
        this.toggleButton.classList.add('active');
        this.isEditMode = true;
        
        // Disable virtual scroll if active
        this.disableVirtualScroll();
        
        // Add checkboxes to all artworks
        this.addCheckboxes();
        
        // Update counters
        this.updateCounters();
        
        // Disable animations
        this.disableAnimations();
        
        // Show toast
        if (window.toast) {
            window.toast.info('Edit Mode enabled - Select items for batch operations');
        }
        
        // Add padding to body for fixed header
        document.body.style.paddingTop = '80px';
    }
    
    exitEditMode() {
        console.log('🔧 Exiting Edit Mode...');
        
        // Remove edit mode class
        document.body.classList.remove('edit-mode');
        this.toggleButton.classList.remove('active');
        this.isEditMode = false;
        
        // Clear selections
        this.clearAllSelections();
        
        // Remove checkboxes
        this.removeCheckboxes();
        
        // Re-enable virtual scroll if it was active
        this.enableVirtualScroll();
        
        // Re-enable animations
        this.enableAnimations();
        
        // Hide action bar
        this.actionBar.classList.remove('visible');
        
        // Show toast
        if (window.toast) {
            window.toast.info('Edit Mode disabled');
        }
        
        // Remove body padding
        document.body.style.paddingTop = '';
    }
    
    addCheckboxes() {
        const artworks = document.querySelectorAll('.artwork');
        artworks.forEach(artwork => {
            if (!artwork.querySelector('.artwork-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'artwork-checkbox';
                checkbox.dataset.id = artwork.dataset.id;
                
                // Add to container
                const container = artwork.querySelector('.artwork-container');
                container.appendChild(checkbox);
                
                // Checkbox change event
                checkbox.addEventListener('change', (e) => {
                    this.handleSelectionChange(artwork, e.target.checked);
                });
                
                // Click on artwork in edit mode
                artwork.addEventListener('click', (e) => {
                    if (this.isEditMode && !e.target.matches('.artwork-checkbox')) {
                        checkbox.checked = !checkbox.checked;
                        this.handleSelectionChange(artwork, checkbox.checked);
                    }
                });
            }
        });
        
        this.totalCounter.textContent = artworks.length;
    }
    
    removeCheckboxes() {
        document.querySelectorAll('.artwork-checkbox').forEach(checkbox => {
            checkbox.remove();
        });
    }
    
    handleSelectionChange(artwork, isSelected) {
        const id = artwork.dataset.id;
        
        if (isSelected) {
            this.selectedItems.add(id);
            artwork.classList.add('selected');
        } else {
            this.selectedItems.delete(id);
            artwork.classList.remove('selected');
        }
        
        this.updateCounters();
        this.updateActionBar();
    }
    
    updateCounters() {
        this.selectionCounter.textContent = this.selectedItems.size;
    }
    
    updateActionBar() {
        if (this.selectedItems.size > 0) {
            this.actionBar.classList.add('visible');
        } else {
            this.actionBar.classList.remove('visible');
        }
    }
    
    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.artwork-checkbox');
        const allSelected = checkboxes.length === this.selectedItems.size;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
            const artwork = checkbox.closest('.artwork');
            this.handleSelectionChange(artwork, !allSelected);
        });
        
        // Update button text
        const btn = this.controlsBar.querySelector('.btn-select-all');
        btn.innerHTML = allSelected ? 
            '<i class="fas fa-check-square"></i> Select All' : 
            '<i class="fas fa-square"></i> Deselect All';
    }
    
    clearAllSelections() {
        this.selectedItems.clear();
        document.querySelectorAll('.artwork.selected').forEach(artwork => {
            artwork.classList.remove('selected');
            const checkbox = artwork.querySelector('.artwork-checkbox');
            if (checkbox) checkbox.checked = false;
        });
        this.updateCounters();
        this.updateActionBar();
    }
    
    async moveSelectedToTop() {
        if (this.selectedItems.size === 0) return;
        
        if (window.toast) {
            window.toast.info(`Moving ${this.selectedItems.size} items to top...`);
        }
        
        const gallery = document.getElementById('gallery');
        const selectedElements = [];
        const otherElements = [];
        
        // Separate selected and non-selected
        Array.from(gallery.children).forEach(artwork => {
            if (this.selectedItems.has(artwork.dataset.id)) {
                selectedElements.push(artwork);
            } else {
                otherElements.push(artwork);
            }
        });
        
        // Reorder DOM
        gallery.innerHTML = '';
        selectedElements.forEach(el => gallery.appendChild(el));
        otherElements.forEach(el => gallery.appendChild(el));
        
        // Update server
        await this.updateServerOrder();
        
        this.clearAllSelections();
        
        if (window.toast) {
            window.toast.success('Items moved to top!');
        }
    }
    
    async moveSelectedToBottom() {
        if (this.selectedItems.size === 0) return;
        
        if (window.toast) {
            window.toast.info(`Moving ${this.selectedItems.size} items to bottom...`);
        }
        
        const gallery = document.getElementById('gallery');
        const selectedElements = [];
        const otherElements = [];
        
        // Separate selected and non-selected
        Array.from(gallery.children).forEach(artwork => {
            if (this.selectedItems.has(artwork.dataset.id)) {
                selectedElements.push(artwork);
            } else {
                otherElements.push(artwork);
            }
        });
        
        // Reorder DOM
        gallery.innerHTML = '';
        otherElements.forEach(el => gallery.appendChild(el));
        selectedElements.forEach(el => gallery.appendChild(el));
        
        // Update server
        await this.updateServerOrder();
        
        this.clearAllSelections();
        
        if (window.toast) {
            window.toast.success('Items moved to bottom!');
        }
    }
    
    async deleteSelected() {
        if (this.selectedItems.size === 0) return;
        
        const count = this.selectedItems.size;
        const confirmed = confirm(`Are you sure you want to delete ${count} selected items?`);
        
        if (!confirmed) return;
        
        if (window.toast) {
            window.toast.info(`Deleting ${count} items...`);
        }
        
        try {
            // Delete each selected item
            const deletePromises = Array.from(this.selectedItems).map(async (id) => {
                const response = await fetch(`/delete/${id}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    // Remove from DOM
                    const artwork = document.querySelector(`[data-id="${id}"]`);
                    if (artwork) {
                        artwork.style.animation = 'artworkRemove 0.3s ease forwards';
                        setTimeout(() => artwork.remove(), 300);
                    }
                }
                
                return response;
            });
            
            await Promise.all(deletePromises);
            
            this.clearAllSelections();
            this.updateCounters();
            
            if (window.toast) {
                window.toast.success(`Successfully deleted ${count} items!`);
            }
            
            // Update image counter
            if (window.artGalleryApp?.updateImageCounter) {
                window.artGalleryApp.updateImageCounter();
            }
            
        } catch (error) {
            console.error('Delete error:', error);
            if (window.toast) {
                window.toast.error('Failed to delete some items');
            }
        }
    }
    
    async updateServerOrder() {
        const gallery = document.getElementById('gallery');
        const artworks = Array.from(gallery.children);
        const totalCount = artworks.length;
        
        const order = artworks.map((el, idx) => ({
            id: el.dataset.id,
            position: totalCount - idx
        }));
        
        try {
            const response = await fetch('/update-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Update order error:', error);
            return false;
        }
    }
    
    setupBatchUpload() {
        const modal = this.batchUploadModal;
        const dropZone = modal.querySelector('.batch-drop-zone');
        const fileInput = modal.querySelector('#batch-file-input');
        const previewGrid = modal.querySelector('#batch-preview-grid');
        const uploadBtn = modal.querySelector('#start-batch-upload');
        
        // Open file dialog
        dropZone.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleBatchFiles(e.target.files);
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleBatchFiles(e.dataTransfer.files);
        });
        
        // Upload button
        uploadBtn.addEventListener('click', () => this.startBatchUpload());
        
        // Close modal
        modal.querySelector('.close').addEventListener('click', () => this.closeBatchUpload());
        modal.querySelector('#cancel-batch-upload').addEventListener('click', () => this.closeBatchUpload());
    }
    
    openBatchUpload() {
        this.batchUploadModal.style.display = 'block';
        this.batchFiles = [];
        this.batchUploadModal.querySelector('#batch-preview-grid').innerHTML = '';
        this.batchUploadModal.querySelector('#start-batch-upload').style.display = 'none';
    }
    
    closeBatchUpload() {
        this.batchUploadModal.style.display = 'none';
        this.batchFiles = [];
    }
    
    handleBatchFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                if (window.toast) {
                    window.toast.warning(`${file.name} is not an image`);
                }
                return false;
            }
            if (file.size > 15 * 1024 * 1024) {
                if (window.toast) {
                    window.toast.warning(`${file.name} is too large (max 15MB)`);
                }
                return false;
            }
            return true;
        });
        
        this.batchFiles = [...this.batchFiles, ...validFiles];
        this.updateBatchPreview();
        
        if (this.batchFiles.length > 0) {
            this.batchUploadModal.querySelector('#start-batch-upload').style.display = 'block';
        }
    }
    
    updateBatchPreview() {
        const previewGrid = this.batchUploadModal.querySelector('#batch-preview-grid');
        previewGrid.innerHTML = '';
        
        this.batchFiles.forEach((file, index) => {
            const preview = document.createElement('div');
            preview.className = 'batch-preview-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                this.batchFiles.splice(index, 1);
                this.updateBatchPreview();
                if (this.batchFiles.length === 0) {
                    this.batchUploadModal.querySelector('#start-batch-upload').style.display = 'none';
                }
            };
            
            preview.appendChild(img);
            preview.appendChild(removeBtn);
            previewGrid.appendChild(preview);
        });
    }
    
    async startBatchUpload() {
        if (this.batchFiles.length === 0) return;
        
        const progressContainer = this.batchUploadModal.querySelector('#batch-upload-progress');
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = '';
        
        this.batchUploadModal.querySelector('#start-batch-upload').disabled = true;
        
        let successCount = 0;
        
        for (let i = 0; i < this.batchFiles.length; i++) {
            const file = this.batchFiles[i];
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <p>${file.name}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            `;
            progressContainer.appendChild(progressItem);
            
            const progressFill = progressItem.querySelector('.progress-fill');
            
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('title', '');
                formData.append('description', '');
                
                const response = await fetch('/add', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    successCount++;
                    progressFill.style.width = '100%';
                    progressFill.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                progressFill.style.width = '100%';
                progressFill.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            }
        }
        
        if (window.toast) {
            window.toast.success(`Uploaded ${successCount} of ${this.batchFiles.length} images!`);
        }
        
        // Close modal and refresh gallery without exiting edit mode
        this.closeBatchUpload();
        
        // Refresh gallery content while staying in edit mode
        if (window.artGalleryApp?.loadArtworks) {
            await window.artGalleryApp.loadArtworks();
            // Re-add checkboxes to new artworks
            this.addCheckboxes();
            this.updateCounters();
        } else {
            // Fallback: reload page but restore edit mode
            sessionStorage.setItem('restoreEditMode', 'true');
            window.location.reload();
        }
    }
    
    disableVirtualScroll() {
        const gallery = document.getElementById('gallery');
        if (window.artGalleryApp?.virtualScroll) {
            this.originalVirtualScrollState = true;
            window.artGalleryApp.virtualScroll.disable();
            
            // Restore normal gallery
            gallery.style.height = 'auto';
            gallery.style.overflow = 'visible';
        }
    }
    
    enableVirtualScroll() {
        if (this.originalVirtualScrollState && window.artGalleryApp) {
            // Re-initialize virtual scroll
            window.artGalleryApp.initVirtualScroll();
        }
    }
    
    disableAnimations() {
        // Clear animation queue
        if (window.AnimationManager?.queue) {
            window.AnimationManager.queue.clear();
        }
        
        // Disable Sortable
        const gallery = document.getElementById('gallery');
        if (gallery._sortable) {
            gallery._sortable.option('disabled', true);
        }
    }
    
    enableAnimations() {
        // Re-enable Sortable
        const gallery = document.getElementById('gallery');
        if (gallery._sortable) {
            gallery._sortable.option('disabled', false);
        }
        
        // Re-initialize animations
        if (window.AnimationManager) {
            window.AnimationManager.initPageAnimations();
        }
    }
}

// Initialize Edit Mode when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.editModeManager = new EditModeManager();
    console.log('✨ Edit Mode Manager initialized');
});
import { AnimationManager, LoadingManager } from './animation.js';
import { enhancedFetch } from './network.js';

// Modal Manager
export class ModalManager {
  constructor() {
    this.modals = {
      add: document.getElementById('add-artwork-modal'),
      edit: document.getElementById('edit-artwork-modal'),
      view: document.getElementById('view-description-modal'),
      delete: document.getElementById('delete-confirm-modal')
    };
    
    this.currentEditId = null;
    this.artworkToDelete = null;
    
    this.init();
  }

  init() {
    // Add button
    const addBtn = document.getElementById('add-artwork-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddModal());
    }

    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        this.closeModal(modal);
      });
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });

    // Delete confirmation
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');
    
    if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleDelete());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal(this.modals.delete));
  }

  openAddModal() {
    AnimationManager.animateModalOpen(this.modals.add);
    if (window.toast) window.toast.info('Ready to add new artwork');
  }

  openEditModal(data) {
    this.currentEditId = data.id;
    
    // Fill form data
    const titleInput = document.getElementById('edit-title');
    const descInput = document.getElementById('edit-description');
    
    if (titleInput) titleInput.value = data.title || '';
    if (descInput) descInput.value = data.description || '';
    
    AnimationManager.animateModalOpen(this.modals.edit);
    if (window.toast) window.toast.info(`Editing: "${data.title || 'Untitled'}"`);
  }

  openDeleteModal(data) {
    this.artworkToDelete = data.id;
    AnimationManager.animateModalOpen(this.modals.delete);
    if (window.toast) window.toast.warning(`Confirm deletion of "${data.title || 'this artwork'}"`);
  }

  openViewModal(data) {
    const titleEl = document.getElementById('view-title');
    const descEl = document.getElementById('view-description-text');
    
    if (titleEl) titleEl.textContent = data.title || 'Untitled';
    if (descEl) descEl.textContent = data.description || 'No description available.';
    
    AnimationManager.animateModalOpen(this.modals.view);
    if (window.toast) window.toast.info('Description loaded');
  }

  async closeModal(modal) {
    if (!modal) return;
    
    // Clear forms
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
      const previewContainer = form.querySelector('[id*="preview-container"]');
      if (previewContainer) previewContainer.innerHTML = '';
    }

    // Reset state
    if (modal === this.modals.edit) this.currentEditId = null;
    if (modal === this.modals.delete) this.artworkToDelete = null;

    await AnimationManager.animateModalClose(modal);
    if (window.toast) window.toast.info('Modal closed');
  }

  closeAllModals() {
    Object.values(this.modals).forEach(modal => {
      if (modal && modal.style.display === 'block') {
        this.closeModal(modal);
      }
    });
  }

  async handleDelete() {
    if (!this.artworkToDelete) return;

    const deleteBtn = document.getElementById('confirm-delete');
    LoadingManager.setButtonLoading(deleteBtn, true);
    
    try {
      const result = await enhancedFetch(`/delete/${this.artworkToDelete}`, { 
        method: 'POST'
      });
      
      if (result.success) {
        const artworkEl = document.querySelector(`[data-id="${this.artworkToDelete}"]`);
        if (artworkEl) {
          await AnimationManager.animateRemoveArtwork(artworkEl);
          artworkEl.remove();
          
          // Update counter
          if (window.artGalleryApp && window.artGalleryApp.updateImageCounter) {
            window.artGalleryApp.updateImageCounter();
          }
        }
        
        if (window.toast) window.toast.success(result.message);
        await this.closeModal(this.modals.delete);
        
        // ✅ FIXED: Only refresh if virtual scroll, otherwise keep in-place updates
        const gallery = document.getElementById('gallery');
        if (gallery && gallery.classList.contains('virtual-enabled')) {
          setTimeout(() => window.location.reload(), 500);
        }
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      if (window.toast) window.toast.error(`Failed to delete: ${error.message}`);
    } finally {
      LoadingManager.setButtonLoading(deleteBtn, false);
    }
  }
}

// File Handler
export class FileHandler {
  constructor(config) {
    this.config = config;
    this.init();
  }

  init() {
    this.initDragDrop();
    this.initPasteSupport();
  }

  validateFile(file) {
    if (!this.config.ALLOWED_TYPES.includes(file.type)) {
      if (window.toast) window.toast.error('Invalid file type. Please select: JPG, PNG, GIF, WebP, or SVG');
      return false;
    }
    
    if (file.size > this.config.MAX_FILE_SIZE) {
      if (window.toast) window.toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size: 15MB`);
      return false;
    }
    
    return true;
  }

  createPreview(file, container) {
    if (!this.validateFile(file)) return;
    
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-wrapper';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (window.toast) {
        window.toast.success(`Image loaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      }
    };

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove image';
    removeBtn.addEventListener('click', () => {
      wrapper.remove();
      if (window.toast) window.toast.info('Image preview removed');
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
  }

  initDragDrop() {
    // Add modal drag & drop
    this.setupDropZone(
      document.getElementById('drop-zone'),
      document.getElementById('file-input'),
      document.getElementById('preview-container')
    );

    // Edit modal drag & drop
    this.setupDropZone(
      document.getElementById('edit-drop-zone'),
      document.getElementById('edit-file-input'),
      document.getElementById('edit-preview-container')
    );
  }

  setupDropZone(dropZone, fileInput, previewContainer) {
    if (!dropZone || !fileInput || !previewContainer) return;

    // Click to select
    dropZone.addEventListener('click', () => {
      fileInput.click();
      if (window.toast) window.toast.info('Select an image file');
    });

    // File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        this.createPreview(fileInput.files[0], previewContainer);
      }
    });

    // Drag events
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
      
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => this.config.ALLOWED_TYPES.includes(file.type));

      if (imageFile) {
        const dt = new DataTransfer();
        dt.items.add(imageFile);
        fileInput.files = dt.files;
        this.createPreview(imageFile, previewContainer);
      } else {
        if (window.toast) window.toast.error('Please drop a valid image file');
      }
    });

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  initPasteSupport() {
    document.addEventListener('paste', (e) => {
      const items = Array.from(e.clipboardData.files);
      const imageFile = items.find(file => this.config.ALLOWED_TYPES.includes(file.type));
      
      if (!imageFile) return;

      // Check which modal is open
      const addModal = document.getElementById('add-artwork-modal');
      const editModal = document.getElementById('edit-artwork-modal');

      if (addModal && addModal.style.display === 'block') {
        const fileInput = document.getElementById('file-input');
        const previewContainer = document.getElementById('preview-container');
        
        if (fileInput && previewContainer) {
          const dt = new DataTransfer();
          dt.items.add(imageFile);
          fileInput.files = dt.files;
          this.createPreview(imageFile, previewContainer);
          if (window.toast) window.toast.success('Image pasted from clipboard');
        }
      } else if (editModal && editModal.style.display === 'block') {
        const fileInput = document.getElementById('edit-file-input');
        const previewContainer = document.getElementById('edit-preview-container');
        
        if (fileInput && previewContainer) {
          const dt = new DataTransfer();
          dt.items.add(imageFile);
          fileInput.files = dt.files;
          this.createPreview(imageFile, previewContainer);
          if (window.toast) window.toast.success('Image pasted from clipboard');
        }
      }
    });
  }
}

// Form Handler
export class FormHandler {
  constructor(modalManager) {
    this.modalManager = modalManager;
    this.init();
  }

  init() {
    // Add form
    const addForm = document.getElementById('add-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => this.handleAdd(e));
    }

    // Edit form
    const editForm = document.getElementById('edit-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEdit(e));
    }
  }

  // ✅ FIXED: No reload, in-place artwork creation with animation
  async handleAdd(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    LoadingManager.setButtonLoading(submitBtn, true);
    if (window.toast) window.toast.info('Uploading artwork...');
    
    try {
      const formData = new FormData(form);
      const imageFile = formData.get('image');
      
      if (!imageFile || imageFile.size === 0) {
        throw new Error('Please select an image file');
      }

      const response = await fetch('/add', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (window.toast) window.toast.success(result.message);
        
        // ✅ FIXED: Create new artwork element in-place instead of reload
        if (result.artwork) {
          const newElement = this.createArtworkElement(result.artwork);
          const gallery = document.getElementById('gallery');
          
          // Check if virtual scroll is enabled
          const isVirtualEnabled = gallery && gallery.classList.contains('virtual-enabled');
          
          if (isVirtualEnabled) {
            // For virtual scroll, still need to reload to update the virtual list
            setTimeout(() => window.location.reload(), 500);
          } else {
            // For regular gallery, add in-place with animation
            if (gallery.firstChild) {
              gallery.insertBefore(newElement, gallery.firstChild);
            } else {
              gallery.appendChild(newElement);
            }
            
            // ✅ TRIGGER NEW ARTWORK ANIMATION
            AnimationManager.animateNewArtwork(newElement);
            
            // Update counter
            if (window.artGalleryApp?.updateImageCounter) {
              window.artGalleryApp.updateImageCounter();
            }
            
            // Re-initialize lazy loading for new image
            const newImg = newElement.querySelector('img.lazy');
            if (newImg && window.lazyLoader) {
              window.lazyLoader.observe([newImg]);
            }
          }
        }
        
        // Clean up form and close modal
        form.reset();
        document.getElementById('preview-container').innerHTML = '';
        await this.modalManager.closeModal(document.getElementById('add-artwork-modal'));
        
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Add artwork error:', error);
      if (window.toast) window.toast.error(error.message || 'Failed to add artwork');
    } finally {
      LoadingManager.setButtonLoading(submitBtn, false);
    }
  }

  // ✅ FIXED: Handle edit with better UX
  async handleEdit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const editId = this.modalManager.currentEditId;
    
    if (!editId) {
      if (window.toast) window.toast.error('No artwork selected for editing');
      return;
    }
    
    LoadingManager.setButtonLoading(submitBtn, true);
    if (window.toast) window.toast.info('Updating artwork...');
    
    try {
      const formData = new FormData(form);
      
      const response = await fetch(`/edit/${editId}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
	// handleEdit function
	if (result.success) {
		if (window.toast) window.toast.success(result.message);
		
		await this.modalManager.closeModal(document.getElementById('edit-artwork-modal'));
		document.getElementById('edit-preview-container').innerHTML = '';
		
		const gallery = document.getElementById('gallery');
		const hasNewImage = formData.get('image') && formData.get('image').size > 0;
		const isVirtualEnabled = gallery && gallery.classList.contains('virtual-enabled');
		
		if (hasNewImage || isVirtualEnabled) {
			setTimeout(() => window.location.reload(), 500);
		} else {
			// ✅ FIXED: Chỉ update và pulse 1 artwork
			const artworkEl = document.querySelector(`[data-id="${editId}"]`);
			if (artworkEl && result.artwork) {
				this.updateArtworkText(artworkEl, result.artwork);
				
				// Single pulse effect
				AnimationManager.animateUpdate(artworkEl);
			}
		}
	}
      
    } catch (error) {
      console.error('Edit artwork error:', error);
      if (window.toast) window.toast.error(error.message || 'Failed to update artwork');
    } finally {
      LoadingManager.setButtonLoading(submitBtn, false);
    }
  }

  // ✅ NEW: Create artwork element from data
  createArtworkElement(artwork) {
    const div = document.createElement('div');
    div.className = 'artwork';
    div.dataset.id = artwork.id;
    
    div.innerHTML = `
      <div class="artwork-container">
        <img src="${artwork.thumbnail_path}" 
             alt="${artwork.title || ''}" 
             class="lazy-loaded">
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
    `;
    
    // Re-attach event listeners
    this.attachElementListeners(div);
    
    return div;
  }

  // ✅ NEW: Update artwork text content
  updateArtworkText(artworkEl, artwork) {
    const titleEl = artworkEl.querySelector('.artwork-title');
    const descEl = artworkEl.querySelector('.truncated-description');
    const seeMoreBtn = artworkEl.querySelector('.btn-see-more');
    
    // Update title
    if (titleEl) {
      titleEl.textContent = artwork.title || '';
    } else if (artwork.title) {
      // Create title if it didn't exist
      const infoEl = artworkEl.querySelector('.artwork-info');
      const titleEl = document.createElement('h3');
      titleEl.className = 'artwork-title';
      titleEl.dataset.id = artwork.id;
      titleEl.textContent = artwork.title;
      infoEl.insertBefore(titleEl, infoEl.firstChild);
    }
    
    // Update description
    if (descEl) {
      descEl.textContent = artwork.description || '';
    }
    
    // Update see more button
    if (artwork.description && artwork.description.length > 120) {
      if (!seeMoreBtn) {
        const btn = document.createElement('button');
        btn.className = 'btn-see-more';
        btn.dataset.id = artwork.id;
        btn.textContent = 'See more';
        artworkEl.querySelector('.artwork-description').appendChild(btn);
        this.attachSeeMoreListener(btn);
      }
    } else if (seeMoreBtn) {
      seeMoreBtn.remove();
    }
    
    // Update button data attributes
    const editBtn = artworkEl.querySelector('.btn-edit');
    const deleteBtn = artworkEl.querySelector('.btn-delete');
    
    if (editBtn) {
      editBtn.dataset.title = artwork.title || '';
      editBtn.dataset.description = artwork.description || '';
    }
    
    if (deleteBtn) {
      deleteBtn.dataset.title = artwork.title || '';
    }
  }

  // ✅ NEW: Attach event listeners to new elements
  attachElementListeners(element) {
    // Edit button
    const editBtn = element.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const data = {
          id: editBtn.dataset.id,
          title: editBtn.dataset.title,
          description: editBtn.dataset.description
        };
        this.modalManager.openEditModal(data);
      });
    }

    // Delete button
    const deleteBtn = element.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const data = {
          id: deleteBtn.dataset.id,
          title: deleteBtn.dataset.title
        };
        this.modalManager.openDeleteModal(data);
      });
    }

    // See more button
    const seeMoreBtn = element.querySelector('.btn-see-more');
    if (seeMoreBtn) {
      this.attachSeeMoreListener(seeMoreBtn);
    }

    // Clickable title
    const title = element.querySelector('.artwork-title');
    if (title && title.offsetWidth < title.scrollWidth) {
      title.style.cursor = 'pointer';
      title.title = 'Click to view full description';
      title.addEventListener('click', () => {
        if (window.artGalleryApp) {
          window.artGalleryApp.handleViewDescription(title.dataset.id);
        }
      });
    }
  }

  // ✅ NEW: Helper for see more button
  attachSeeMoreListener(btn) {
    btn.addEventListener('click', () => {
      if (window.artGalleryApp) {
        window.artGalleryApp.handleViewDescription(btn.dataset.id);
      }
    });
  }
}
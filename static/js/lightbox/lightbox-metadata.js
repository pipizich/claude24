// lightbox-metadata.js - Metadata handling functionality (FIXED)
export class LightboxMetadata {
    constructor(lightboxCore) {
        this.core = lightboxCore;
        
        this.init();
    }
    
    init() {
        // Expose methods to core
        this.core.showMetadataLoading = () => this.showMetadataLoading();
        this.core.loadMetadata = (artworkId) => this.loadMetadata(artworkId);
        
        // ✅ REMOVED: No longer setting up global methods here
        // This will be handled by lightbox-manager.js after full initialization
    }
    
    showMetadataLoading() {
        this.core.elements.loadingBar.style.display = 'block';
        this.core.elements.metadataContent.innerHTML = '<p style="color: #8be9fd;">Loading metadata...</p>';
    }
    
    hideMetadataLoading() {
        this.core.elements.loadingBar.style.display = 'none';
    }
    
    async loadMetadata(artworkId) {
        try {
            const response = await fetch(`/api/metadata/${artworkId}`);
            const data = await response.json();
            
            this.hideMetadataLoading();
            
            if (data.success && data.metadata) {
                this.displayEnhancedMetadata(data.metadata);
            } else {
                this.displayEnhancedMetadata(null);
            }
        } catch (error) {
            this.hideMetadataLoading();
            this.displayEnhancedMetadata(null);
        }
    }
    
    displayEnhancedMetadata(metadata) {
        const container = this.core.elements.metadataContent;
        
        if (!metadata || Object.keys(metadata).length === 0) {
            container.innerHTML = '<p style="color: #ff6b6b;">No AI metadata found</p>';
            return;
        }
        
        let html = '';
        
        if (metadata.prompt || metadata.negative_prompt) {
            html += this.createPromptSections(metadata.prompt, metadata.negative_prompt);
        }
        
        const sections = this.groupMetadata(metadata);
        sections.forEach((section, index) => {
            const isExpanded = index === 0 ? 'expanded' : '';
            html += `
                <div class="collapsible-section ${isExpanded}">
                    <div class="section-header" onclick="window.galleryLightbox?.toggleSection?.(this)">
                        <h5>${section.icon} ${section.title}</h5>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="metadata-grid">
                            ${section.items.map(item => this.createMetadataItem(item)).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    createPromptSections(prompt, negativePrompt) {
        let html = '';
        
        if (prompt) {
            const isLongPrompt = prompt.length > 200;
            html += `
                <div class="prompt-section">
                    <div class="prompt-header">
                        <h6>Prompt</h6>
                        <button class="prompt-copy-btn" onclick="window.galleryLightbox?.copyToClipboard?.('${this.core.escapeForJs(prompt)}')">📋 Copy</button>
                    </div>
                    <div class="prompt-content ${isLongPrompt ? 'collapsed' : 'expanded'}">
                        <div class="prompt-text">${this.core.escapeHtml(prompt)}</div>
                        ${isLongPrompt ? '<button class="prompt-show-more" onclick="window.galleryLightbox?.togglePromptExpansion?.(this)">Show more...</button>' : ''}
                    </div>
                </div>
            `;
        }
        
        if (negativePrompt) {
            const isLongNegative = negativePrompt.length > 200;
            html += `
                <div class="prompt-section negative-prompt-section">
                    <div class="prompt-header">
                        <h6>Negative Prompt</h6>
                        <button class="prompt-copy-btn" onclick="window.galleryLightbox?.copyToClipboard?.('${this.core.escapeForJs(negativePrompt)}')">📋 Copy</button>
                    </div>
                    <div class="prompt-content ${isLongNegative ? 'collapsed' : 'expanded'}">
                        <div class="prompt-text">${this.core.escapeHtml(negativePrompt)}</div>
                        ${isLongNegative ? '<button class="prompt-show-more" onclick="window.galleryLightbox?.togglePromptExpansion?.(this)">Show more...</button>' : ''}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    groupMetadata(metadata) {
        const sections = [];
        
        const basicFields = ['model', 'format', 'size', 'generation_size'];
        const basicItems = basicFields.map(key => ({
            label: this.getFieldLabel(key),
            key: key,
            value: metadata[key],
            type: 'simple'
        })).filter(item => item.value);
        
        if (basicItems.length > 0) {
            sections.push({
                title: 'Basic Information',
                icon: '📋',
                items: basicItems
            });
        }
        
        const paramFields = ['steps', 'cfg_scale', 'sampler', 'seed'];
        const paramItems = paramFields.map(key => ({
            label: this.getFieldLabel(key),
            key: key,
            value: metadata[key],
            type: key === 'seed' ? 'copyable' : 'simple'
        })).filter(item => item.value);
        
        if (paramItems.length > 0) {
            sections.push({
                title: 'Generation Parameters',
                icon: '⚙️',
                items: paramItems
            });
        }
        
        return sections;
    }
    
    createMetadataItem(item) {
        if (!item.value) return '';
        
        let valueHtml = '';
        
        switch (item.type) {
            case 'copyable':
                valueHtml = `
                    <div class="metadata-value copyable-text">
                        ${this.core.escapeHtml(item.value)}
                        <button class="copy-btn" onclick="window.galleryLightbox?.copyToClipboard?.('${this.core.escapeForJs(item.value)}')">📋</button>
                    </div>
                `;
                break;
                
            default:
                valueHtml = `<div class="metadata-value">${this.core.escapeHtml(item.value)}</div>`;
        }
        
        return `
            <div class="metadata-item">
                <span class="metadata-label">${item.label}</span>
                ${valueHtml}
            </div>
        `;
    }
    
    getFieldLabel(key) {
        const labels = {
            'model': 'Model',
            'format': 'Format',
            'size': 'Size',
            'generation_size': 'Generation Size',
            'steps': 'Steps',
            'cfg_scale': 'CFG Scale',
            'sampler': 'Sampler',
            'seed': 'Seed'
        };
        return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // ✅ ENHANCED: Added safety checks for all interactive methods
    toggleSection(header) {
        try {
            const section = header.parentElement;
            section.classList.toggle('expanded');
        } catch (error) {
            console.error('Error toggling section:', error);
        }
    }
    
    togglePromptExpansion(button) {
        try {
            const promptContent = button.parentElement;
            const isCollapsed = promptContent.classList.contains('collapsed');
            
            if (isCollapsed) {
                promptContent.classList.remove('collapsed');
                promptContent.classList.add('expanded');
                button.textContent = 'Show less';
            } else {
                promptContent.classList.remove('expanded');
                promptContent.classList.add('collapsed');
                button.textContent = 'Show more...';
            }
        } catch (error) {
            console.error('Error toggling prompt expansion:', error);
        }
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Find the button that was clicked (use event if available)
            const button = window.event?.target || document.activeElement;
            
            if (button && button.tagName === 'BUTTON') {
                const originalText = button.textContent;
                button.textContent = '✅';
                button.style.background = '#50fa7b';
                button.style.color = 'black';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                }, 1000);
            }
            
            // Show toast if available
            if (window.toast) {
                window.toast.success('Copied to clipboard!');
            }
            
        } catch (err) {
            console.error('Failed to copy:', err);
            
            // Fallback: try to select text
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (window.toast) {
                    window.toast.success('Copied to clipboard!');
                }
            } catch (fallbackError) {
                console.error('Fallback copy also failed:', fallbackError);
                if (window.toast) {
                    window.toast.error('Failed to copy to clipboard');
                }
            }
        }
    }
}
export class ToastManager {
  constructor() {
    this.container = this.createContainer();
    this.toastCounter = 0;
    this.maxToasts = 3; // Giới hạn tối đa 3 toast
  }

  createContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 5000) {
    // Kiểm tra số lượng toast hiện tại
    const currentToasts = this.container.querySelectorAll('.toast');
    
    // Nếu đã có 3 toast, xóa ngay lập tức toast đầu tiên (cũ nhất)
    if (currentToasts.length >= this.maxToasts) {
      const oldestToast = currentToasts[0];
      this.removeToastImmediately(oldestToast);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('data-toast-id', ++this.toastCounter);
    
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ⓘ'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    const autoRemove = setTimeout(() => {
      this.removeToast(toast);
    }, duration);
    
    toast.addEventListener('click', () => {
      clearTimeout(autoRemove);
      this.removeToast(toast);
    });
    
    return toast;
  }

  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }

  removeToastImmediately(toast) {
    if (!toast || !toast.parentNode) return;
    
    // Xóa ngay lập tức không có animation
    toast.parentNode.removeChild(toast);
  }

  success(message, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 7000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  clear() {
    const toasts = this.container.querySelectorAll('.toast');
    toasts.forEach(toast => this.removeToastImmediately(toast));
  }
}
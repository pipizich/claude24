import { ToastManager } from './toast.js';

export class NetworkMonitor {
  constructor() {
    this.online = navigator.onLine;
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  handleOnline() {
    this.online = true;
    if (window.toast) {
      window.toast.success('Connection restored');
    }
  }
  
  handleOffline() {
    this.online = false;
    if (window.toast) {
      window.toast.warning('No internet connection');
    }
  }
  
  isOnline() {
    return this.online;
  }
}

export async function enhancedFetch(url, options = {}) {
  if (!window.networkMonitor.isOnline()) {
    throw new Error('No internet connection');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return data;
    } else {
      throw new Error('Server returned non-JSON response');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw error;
  }
}
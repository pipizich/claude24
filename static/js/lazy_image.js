export class LazyImageLoader {
  constructor() {
    this.imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          img.classList.add('lazy-loaded');
          observer.unobserve(img);
        }
      });
    });
  }

  observe(images) {
    images.forEach(img => {
      if (img.dataset.src) {
        this.imageObserver.observe(img);
      } else {
        img.classList.add('lazy-loaded');
      }
    });
  }
}
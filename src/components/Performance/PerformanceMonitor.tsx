import { useEffect } from 'react';

const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // Only monitor in development
    if (process.env.NODE_ENV === 'development') {
      // Monitor component render times
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 16) { // 16ms is target for 60fps
            console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });

      // Monitor memory usage
      const checkMemory = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
            console.warn(`High memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
          }
        }
      };

      const memoryInterval = setInterval(checkMemory, 30000); // Check every 30 seconds

      return () => {
        observer.disconnect();
        clearInterval(memoryInterval);
      };
    }
  }, []);

  return null;
};

export default PerformanceMonitor;
const BatchImageStudio = {
  // Client-side batch processor export for omnikit-tools
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchImageStudio;
}
if (typeof window !== 'undefined') {
  window.BatchImageStudio = BatchImageStudio;
}

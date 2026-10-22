/**
 * OmniKit In-Browser Background Remover
 * 100% Client-Side In-Browser Segmentation Engine
 * Runs completely via Canvas 2D & Web APIs on local device. Zero server uploads. Zero external CDNs.
 */

const BgRemover = {
  isProcessing: false,
  currentFile: null,
  originalImage: null,
  cutoutImage: null,
  activeBgMode: 'transparent', // 'transparent' | 'white' | 'black' | 'custom'
  customBgColor: '#ffffff',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropzone = document.getElementById('bg-dropzone');
    const fileInput = document.getElementById('bg-file-input');
    const resetBtn = document.getElementById('bg-reset-btn');
    const downloadBtn = document.getElementById('bg-download-btn');
    const colorPicker = document.getElementById('bg-custom-color-picker');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.handleFile(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-500', 'bg-indigo-50/20');
    });

    ['dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, () => {
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    resetBtn?.addEventListener('click', () => this.reset());
    downloadBtn?.addEventListener('click', () => this.downloadResult());

    // Background color toggles
    document.querySelectorAll('.bg-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bg-color-btn').forEach(b => {
          b.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500');
        });
        btn.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');

        const mode = btn.getAttribute('data-bg-mode');
        this.activeBgMode = mode;
        if (mode === 'custom' && colorPicker) {
          colorPicker.click();
        } else {
          this.renderCanvas();
        }
      });
    });

    colorPicker?.addEventListener('input', (e) => {
      this.customBgColor = e.target.value;
      this.activeBgMode = 'custom';
      this.renderCanvas();
    });
  },

  reset() {
    this.currentFile = null;
    this.originalImage = null;
    this.cutoutImage = null;
    this.isProcessing = false;
    this.activeBgMode = 'transparent';

    const dropzone = document.getElementById('bg-dropzone');
    const loadingState = document.getElementById('bg-loading-state');
    const resultState = document.getElementById('bg-result-state');
    const fileInput = document.getElementById('bg-file-input');

    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    loadingState?.classList.add('hidden');
    resultState?.classList.add('hidden');
  },

  async canvasRemove(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || 800;
        const h = img.naturalHeight || 600;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample border perimeter pixels for accurate background color detection
        let bgR = 0, bgG = 0, bgB = 0;
        const samples = [
          0,
          (w - 1) * 4,
          ((h - 1) * w) * 4,
          ((h - 1) * w + (w - 1)) * 4,
          (Math.floor(w / 2)) * 4,
          ((h - 1) * w + Math.floor(w / 2)) * 4,
          (Math.floor(h / 2) * w) * 4,
          (Math.floor(h / 2) * w + (w - 1)) * 4
        ];
        samples.forEach(idx => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR /= samples.length;
        bgG /= samples.length;
        bgB /= samples.length;

        // Color distance segmentation threshold with soft feathering
        const threshold = 40;
        const feather = 20;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Weighted Euclidean color distance
          const diff = Math.sqrt(
            0.299 * (r - bgR) ** 2 +
            0.587 * (g - bgG) ** 2 +
            0.114 * (b - bgB) ** 2
          );

          if (diff < threshold) {
            data[i + 3] = 0; // 100% transparent
          } else if (diff < threshold + feather) {
            // Soft anti-aliased edge transition
            const alphaFactor = (diff - threshold) / feather;
            data[i + 3] = Math.round(data[i + 3] * alphaFactor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/png');
      };
      img.onerror = () => resolve(file);
      img.src = objUrl;
    });
  },

  async handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert(window.I18N?.currentLang === 'ru' ? 'Пожалуйста, выберите изображение (JPG, PNG, WebP)' : 'Please select an image file (JPG, PNG, WebP)');
      return;
    }

    this.currentFile = file;
    this.isProcessing = true;

    const dropzone = document.getElementById('bg-dropzone');
    const loadingState = document.getElementById('bg-loading-state');
    const resultState = document.getElementById('bg-result-state');
    const progressFill = document.getElementById('bg-progress-fill');
    const progressLabel = document.getElementById('bg-progress-label');
    const progressPercent = document.getElementById('bg-progress-percent');

    dropzone?.classList.add('hidden');
    resultState?.classList.add('hidden');
    loadingState?.classList.remove('hidden');

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (progressFill) progressFill.style.width = '20%';
    if (progressPercent) progressPercent.textContent = '20%';
    if (progressLabel) {
      progressLabel.textContent = isRu ? 'Анализ цветовых контуров...' : 'Analyzing color contours...';
    }

    try {
      // 1. Load original image for preview
      const originalDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      const origImg = new Image();
      await new Promise((resolve) => {
        origImg.onload = resolve;
        origImg.src = originalDataUrl;
      });
      this.originalImage = origImg;

      // Small delay for UI smoothness
      await new Promise(r => setTimeout(r, 60));

      if (progressFill) progressFill.style.width = '60%';
      if (progressPercent) progressPercent.textContent = '60%';
      if (progressLabel) {
        progressLabel.textContent = isRu ? 'Сегментация и удаление фона...' : 'Segmenting background contours...';
      }

      // 2. Perform in-browser client-side segmentation
      const resultBlob = await this.canvasRemove(file);

      if (progressFill) progressFill.style.width = '90%';
      if (progressPercent) progressPercent.textContent = '90%';
      if (progressLabel) {
        progressLabel.textContent = isRu ? 'Финальная отрисовка...' : 'Final rendering...';
      }

      await new Promise(r => setTimeout(r, 60));

      if (progressFill) progressFill.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';

      // 3. Load cutout image
      const resultDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(resultBlob);
      });

      const cutImg = new Image();
      await new Promise((resolve) => {
        cutImg.onload = resolve;
        cutImg.src = resultDataUrl;
      });
      this.cutoutImage = cutImg;

      // 4. Show result state
      loadingState?.classList.add('hidden');
      resultState?.classList.remove('hidden');

      const origPreview = document.getElementById('bg-orig-preview');
      if (origPreview) origPreview.src = originalDataUrl;

      // Render canvas
      this.renderCanvas();

    } catch (err) {
      console.error('Background removal error:', err);
      this.reset();
    } finally {
      this.isProcessing = false;
    }
  },

  renderCanvas() {
    const canvas = document.getElementById('bg-result-canvas');
    if (!canvas || !this.cutoutImage) return;

    const ctx = canvas.getContext('2d');
    const img = this.cutoutImage;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.activeBgMode === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (this.activeBgMode === 'black') {
      ctx.fillStyle = '#0b0c0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (this.activeBgMode === 'custom') {
      ctx.fillStyle = this.customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const container = document.getElementById('bg-result-canvas-container');
    if (container) {
      if (this.activeBgMode === 'transparent') {
        container.classList.add('bg-checkerboard');
        container.style.backgroundColor = '';
      } else {
        container.classList.remove('bg-checkerboard');
        container.style.backgroundColor = this.activeBgMode === 'white' 
          ? '#ffffff' 
          : this.activeBgMode === 'black' 
            ? '#0b0c0e' 
            : this.customBgColor;
      }
    }
  },

  downloadResult() {
    const canvas = document.getElementById('bg-result-canvas');
    if (!canvas) return;

    const format = (this.activeBgMode === 'white' || this.activeBgMode === 'black' || this.activeBgMode === 'custom') 
      ? 'image/jpeg' 
      : 'image/png';
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';

    const baseName = (this.currentFile?.name || 'image').replace(/\.[^.]+$/, '');
    const outFilename = `${baseName}_no_bg.${ext}`;

    const link = document.createElement('a');
    link.download = outFilename;
    link.href = canvas.toDataURL(format, 0.95);
    link.click();
  }
};

if (typeof window !== "undefined") {
  window.BgRemover = BgRemover;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BgRemover;
}

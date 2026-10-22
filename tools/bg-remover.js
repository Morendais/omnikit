/**
 * OmniKit AI Background Remover
 * 100% Client-Side In-Browser AI Segmentation using @imgly/background-removal
 * Runs via WebAssembly / WebGPU on local device. Zero server uploads.
 */

const BgRemover = {
  imglyModule: null,
  isModelLoaded: false,
  isProcessing: false,
  currentFile: null,
  originalImage: null,
  cutoutImage: null,
  activeBgMode: 'transparent', // 'transparent' | 'white' | 'black' | 'custom'
  customBgColor: '#ffffff',

  init() {
    this.bindEvents();
  },

  async getImgly() {
    if (this.imglyModule) return this.imglyModule;
    try {
      const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
      this.imglyModule = module;
      return module;
    } catch (e) {
      console.error('Failed to load @imgly/background-removal ESM bundle:', e);
      throw e;
    }
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

    if (progressFill) progressFill.style.width = '5%';
    if (progressPercent) progressPercent.textContent = '5%';
    if (progressLabel) {
      progressLabel.textContent = window.I18N?.currentLang === 'ru' 
        ? 'Инициализация AI модели...' 
        : 'Initializing AI model...';
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

      // 2. Load @imgly/background-removal
      if (progressLabel) {
        progressLabel.textContent = window.I18N?.currentLang === 'ru'
          ? 'Загрузка весов нейросети в браузер...'
          : 'Loading neural weights into browser...';
      }

      const imgly = await this.getImgly();
      const removeBackground = imgly.removeBackground;

      // 3. Run background removal with progress tracking
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      const config = {
        publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
        debug: false,
        progress: (key, current, total) => {
          let pct = 0;
          if (total > 0) {
            pct = Math.min(100, Math.round((current / total) * 100));
          }

          if (key.includes('fetch')) {
            if (progressLabel) progressLabel.textContent = isRu ? `Загрузка AI модели: ${pct}%...` : `Fetching model weights: ${pct}%...`;
            if (progressFill) progressFill.style.width = `${Math.max(10, Math.round(pct * 0.7))}%`;
            if (progressPercent) progressPercent.textContent = `${Math.max(10, Math.round(pct * 0.7))}%`;
          } else if (key.includes('compute')) {
            const computePhase = key.replace('compute:', '');
            if (progressLabel) progressLabel.textContent = isRu ? `Нейросеть вырезает фон (${computePhase})...` : `AI segmenting background (${computePhase})...`;
            const compPct = 70 + Math.round((pct || 50) * 0.3);
            if (progressFill) progressFill.style.width = `${compPct}%`;
            if (progressPercent) progressPercent.textContent = `${compPct}%`;
          }
        }
      };

      const resultBlob = await removeBackground(file, config);

      if (progressFill) progressFill.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';

      // 4. Load cutout image
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

      // 5. Show result state
      loadingState?.classList.add('hidden');
      resultState?.classList.remove('hidden');

      // Populate original preview
      const origPreview = document.getElementById('bg-orig-preview');
      if (origPreview) origPreview.src = originalDataUrl;

      // Render canvas
      this.renderCanvas();

    } catch (err) {
      console.error('Background removal error:', err);
      alert((window.I18N?.currentLang === 'ru' ? 'Ошибка при обработке фото: ' : 'Error processing image: ') + (err.message || err));
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
      ctx.fillStyle = this.customBgColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // If 'transparent', canvas stays clear

    ctx.drawImage(img, 0, 0);

    // Update visual preview container background
    const container = document.getElementById('bg-canvas-container');
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

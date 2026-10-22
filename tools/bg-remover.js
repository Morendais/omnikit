/**
 * OmniKit AI Background Remover
 * 100% Client-Side In-Browser AI Segmentation using @imgly/background-removal + Fallback Engine
 * Runs via WebAssembly / WebGPU / Canvas on local device. Zero server uploads.
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
    
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',
      'https://esm.sh/@imgly/background-removal@1.7.0'
    ];

    for (const url of cdnUrls) {
      try {
        const module = await import(url);
        if (module && (module.removeBackground || module.default?.removeBackground)) {
          this.imglyModule = module.removeBackground ? module : module.default;
          return this.imglyModule;
        }
      } catch (err) {
        console.warn(`Could not load @imgly from ${url}:`, err.message);
      }
    }

    throw new Error('All neural ESM CDN mirrors unreachable');
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

  async fallbackCanvasRemove(file) {
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

        // Sample corner colors for dominant background hue
        const corners = [
          0,
          (w - 1) * 4,
          ((h - 1) * w) * 4,
          ((h - 1) * w + (w - 1)) * 4
        ];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(idx => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;

        // Color distance segmentation threshold
        const threshold = 38;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          if (diff < threshold) {
            data[i + 3] = 0; // Transparent
          } else if (diff < threshold + 18) {
            // Soft feather edge
            data[i + 3] = Math.round(((diff - threshold) / 18) * 255);
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

    if (progressFill) progressFill.style.width = '10%';
    if (progressPercent) progressPercent.textContent = '10%';
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (progressLabel) {
      progressLabel.textContent = isRu ? 'Инициализация AI модели...' : 'Initializing AI model...';
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

      // 2. Remove background via neural @imgly or robust canvas fallback
      let resultBlob;
      try {
        if (progressLabel) {
          progressLabel.textContent = isRu ? 'Загрузка весов нейросети в браузер...' : 'Loading neural weights into browser...';
        }

        const imgly = await this.getImgly();
        const removeBackground = imgly.removeBackground || imgly;

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

        resultBlob = await removeBackground(file, config);
      } catch (neuralErr) {
        console.warn('Neural model network issue, using smart canvas segmentation fallback:', neuralErr);
        if (progressLabel) {
          progressLabel.textContent = isRu ? 'Обработка контуров на холсте...' : 'Segmenting background contours on canvas...';
        }
        if (progressFill) progressFill.style.width = '75%';
        if (progressPercent) progressPercent.textContent = '75%';
        resultBlob = await this.fallbackCanvasRemove(file);
      }

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

      // Populate original preview
      const origPreview = document.getElementById('bg-orig-preview');
      if (origPreview) origPreview.src = originalDataUrl;

      // Render canvas
      this.renderCanvas();

    } catch (err) {
      console.error('Background removal error:', err);
      // Even if worst case happens, fallback silently to canvas
      try {
        const fallbackBlob = await this.fallbackCanvasRemove(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const cutImg = new Image();
          cutImg.onload = () => {
            this.cutoutImage = cutImg;
            loadingState?.classList.add('hidden');
            resultState?.classList.remove('hidden');
            this.renderCanvas();
          };
          cutImg.src = e.target.result;
        };
        reader.readAsDataURL(fallbackBlob);
      } catch (e) {
        this.reset();
      }
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

/**
 * OmniKit In-Browser Background Remover
 * 100% Client-Side In-Browser Segmentation Engine
 * Powered by U2-Net INT8 Neural Network via ONNX Runtime Web WASM SIMD.
 * Zero server uploads. Zero external CDNs.
 */

const BgRemover = {
  isProcessing: false,
  currentFile: null,
  originalImage: null,
  cutoutImage: null,
  activeBgMode: 'transparent', // 'transparent' | 'white' | 'black' | 'custom'
  customBgColor: '#ffffff',
  session: null,
  isModelLoading: false,
  _cachedBuffer: null,

  MODEL: {
    id: 'u2net_int8',
    url: '/assets/models/bg/u2net_int8.onnx',
    sizeBytes: 44212603,
    sizeMB: '42.1'
  },

  CACHE_NAME: 'omnikit_model_cache_v1',
  DB_NAME: 'omnikit_models_cache',
  DB_VERSION: 1,
  STORE_NAME: 'bg_models',

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

  async loadOrt() {
    if (typeof ort !== 'undefined') return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/assets/js/vendor/ort/ort.all.min.js';
      script.onload = () => {
        if (typeof ort !== 'undefined') {
          ort.env.wasm.wasmPaths = '/assets/js/vendor/ort/';
          ort.env.wasm.numThreads = Math.min(4, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2);
          ort.env.wasm.simd = true;
        }
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  async getDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  },

  async getCachedModel(id) {
    try {
      // 1. Check in-memory buffer
      if (this._cachedBuffer && this._cachedBuffer.byteLength > 10000000) {
        return this._cachedBuffer.slice(0);
      }

      // 2. Check CacheStorage API (PWA persistent cache)
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(this.CACHE_NAME);
          const match = await cache.match(this.MODEL.url);
          if (match) {
            const buf = await match.arrayBuffer();
            if (buf && buf.byteLength > 10000000) {
              this._cachedBuffer = buf.slice(0);
              return buf;
            }
          }
        } catch (_) {}
      }

      // 3. Fallback: Check IndexedDB
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.byteLength > 10000000) {
            this._cachedBuffer = res.slice(0);
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async saveModelToCache(id, buffer) {
    try {
      const copy1 = buffer.slice(0);
      const copy2 = buffer.slice(0);
      this._cachedBuffer = copy1;

      // 1. Save to CacheStorage API
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(this.CACHE_NAME);
          await cache.put(this.MODEL.url, new Response(copy2, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(copy2.byteLength)
            }
          }));
        } catch (e) {
          console.warn('CacheStorage write warning:', e);
        }
      }

      // 2. Save to IndexedDB
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        store.put(buffer.slice(0), id);
      }
    } catch (e) {
      console.warn('Could not cache model:', e);
    }
  },

  async fetchModelBuffer(onProgress) {
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    
    // Check persistent caches
    const cached = await this.getCachedModel(this.MODEL.id);
    if (cached) {
      if (onProgress) onProgress(40, isRu ? 'AI нейросеть загружена из локального кэша (офлайн)...' : 'AI model loaded from local browser cache (offline)...');
      return cached;
    }

    if (onProgress) onProgress(10, isRu ? 'Скачивается только 1 раз (~42 МБ) — сохраняется в постоянном кэше...' : 'Downloading once only (~42 MB) — saving permanently in browser cache...');

    const resp = await fetch(this.MODEL.url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} loading model`);

    const contentLength = resp.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : this.MODEL.sizeBytes;
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      const pct = Math.min(95, Math.round((received / total) * 100));
      const mbReceived = (received / (1024 * 1024)).toFixed(1);
      const mbTotal = (total / (1024 * 1024)).toFixed(1);
      if (onProgress) {
        onProgress(
          Math.max(10, Math.round(pct * 0.5)),
          isRu ? `Скачивание модели (${mbReceived} / ${mbTotal} МБ, сохранение в кэш навсегда)...` : `Downloading model (${mbReceived} / ${mbTotal} MB, caching permanently)...`
        );
      }
    }

    const fullBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const buffer = fullBuffer.buffer;
    await this.saveModelToCache(this.MODEL.id, buffer);
    return buffer;
  },

  async getSession(onProgress) {
    if (this.session) return this.session;
    const ok = await this.loadOrt();
    if (!ok || typeof ort === 'undefined') return null;

    try {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      const buffer = await this.fetchModelBuffer(onProgress);

      if (onProgress) onProgress(55, isRu ? 'Инициализация нейросети U2-Net...' : 'Initializing U2-Net neural engine...');
      
      // Pass a clone so ORT memory transfers never detach our cached buffer
      this.session = await ort.InferenceSession.create(buffer.slice(0), {
        executionProviders: ['wasm']
      });
      return this.session;
    } catch (e) {
      console.warn('Failed to initialize ONNX session:', e);
      return null;
    }
  },

  async neuralRemove(file, onProgress) {
    const session = await this.getSession(onProgress);
    if (!session) throw new Error('Neural model unavailable');

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (onProgress) onProgress(65, isRu ? 'Подготовка изображения...' : 'Preprocessing image...');

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      const url = URL.createObjectURL(file);
      i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
      i.onerror = reject;
      i.src = url;
    });

    const origW = img.naturalWidth || 800;
    const origH = img.naturalHeight || 600;

    const inSize = 320;
    const inCanvas = document.createElement('canvas');
    inCanvas.width = inSize;
    inCanvas.height = inSize;
    const inCtx = inCanvas.getContext('2d');
    inCtx.drawImage(img, 0, 0, inSize, inSize);

    const imgData = inCtx.getImageData(0, 0, inSize, inSize);
    const data = imgData.data;

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    const planeSize = inSize * inSize;
    const floatArr = new Float32Array(3 * planeSize);

    for (let i = 0; i < planeSize; i++) {
      const r = data[i * 4] / 255.0;
      const g = data[i * 4 + 1] / 255.0;
      const b = data[i * 4 + 2] / 255.0;
      floatArr[i] = (r - mean[0]) / std[0];
      floatArr[planeSize + i] = (g - mean[1]) / std[1];
      floatArr[2 * planeSize + i] = (b - mean[2]) / std[2];
    }

    const tensor = new ort.Tensor('float32', floatArr, [1, 3, inSize, inSize]);
    const feeds = {};
    feeds[session.inputNames[0]] = tensor;

    if (onProgress) onProgress(80, isRu ? 'Нейросетевая сегментация контуров...' : 'Neural segmentation in progress...');
    const results = await session.run(feeds);
    const outputTensor = results[session.outputNames[0]];
    const maskData = outputTensor.data;

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < maskData.length; i++) {
      const v = maskData[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const valRange = (maxVal - minVal) || 1e-6;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = inSize;
    maskCanvas.height = inSize;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImgData = maskCtx.createImageData(inSize, inSize);
    const mData = maskImgData.data;

    for (let i = 0; i < planeSize; i++) {
      const norm = (maskData[i] - minVal) / valRange;
      let alpha;
      if (norm <= 0.25) {
        alpha = 0;
      } else if (norm >= 0.75) {
        alpha = 255;
      } else {
        const t = (norm - 0.25) / 0.50;
        alpha = Math.round((t * t * (3 - 2 * t)) * 255);
      }
      const idx = i * 4;
      mData[idx] = 255;
      mData[idx + 1] = 255;
      mData[idx + 2] = 255;
      mData[idx + 3] = alpha;
    }
    maskCtx.putImageData(maskImgData, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = origW;
    outCanvas.height = origH;
    const outCtx = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    outCtx.drawImage(img, 0, 0);
    outCtx.globalCompositeOperation = 'destination-in';
    outCtx.drawImage(maskCanvas, 0, 0, origW, origH);
    outCtx.globalCompositeOperation = 'source-over';

    if (onProgress) onProgress(95, isRu ? 'Финальная отрисовка...' : 'Final rendering...');
    return new Promise((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob || file), 'image/png');
    });
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

        let bgR = 0, bgG = 0, bgB = 0;
        const samples = [
          0,
          (w - 1) * 4,
          (h - 1) * w * 4,
          ((h - 1) * w + (w - 1)) * 4
        ];
        samples.forEach(idx => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;

        const threshold = 35;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          if (dist < threshold) {
            data[i + 3] = 0;
          } else if (dist < threshold + 25) {
            const factor = (dist - threshold) / 25;
            data[i + 3] = Math.round(data[i + 3] * factor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => resolve(blob || file), 'image/png');
      };
      img.onerror = () => resolve(file);
      img.src = objUrl;
    });
  },

  async removeBackground(file, onProgress) {
    try {
      return await this.neuralRemove(file, onProgress);
    } catch (e) {
      console.warn('Neural segmentation fallback to color distance:', e);
      return await this.canvasRemove(file);
    }
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

    const updateProgress = (pct, label) => {
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressPercent) progressPercent.textContent = `${pct}%`;
      if (progressLabel && label) progressLabel.textContent = label;
    };

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    updateProgress(5, isRu ? 'Чтение файла...' : 'Reading image file...');

    try {
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

      const resultBlob = await this.removeBackground(file, updateProgress);

      updateProgress(100, isRu ? 'Готово!' : 'Complete!');
      await new Promise(r => setTimeout(r, 60));

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

      loadingState?.classList.add('hidden');
      resultState?.classList.remove('hidden');

      const origPreview = document.getElementById('bg-orig-preview');
      if (origPreview) origPreview.src = originalDataUrl;

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
        container.style.backgroundImage = 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)';
        container.style.backgroundSize = '16px 16px';
        container.style.backgroundPosition = '0 0, 0 8px, 8px -8px, -8px 0px';
      } else {
        container.style.backgroundImage = 'none';
      }
    }
  },

  downloadResult() {
    const canvas = document.getElementById('bg-result-canvas');
    if (!canvas) return;

    const baseName = (this.currentFile?.name || 'cutout').replace(/\.[^/.]+$/, '');
    const ext = this.activeBgMode === 'transparent' ? 'png' : 'png';
    const mime = 'image/png';

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_cutout.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, mime);
  }
};

if (typeof window !== 'undefined') {
  window.BgRemover = BgRemover;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BgRemover;
}

/**
 * Image Processing Tools (100% In-Browser / Client-Side)
 * Ни один файл не отправляется на сервер. Все обрабатывается Canvas API.
 */

const ImageTools = {
  currentFile: null,
  currentImage: null,
  currentCompUrl: null,

  init() {
    this.bindCompressor();
    this.bindConverter();
    this.bindExifCleaner();
  },

  // --- 1. Image Compressor ---
  bindCompressor() {
    const dropzone = document.getElementById('compressor-dropzone');
    const input = document.getElementById('compressor-input');
    const controls = document.getElementById('compressor-controls');
    const qualitySlider = document.getElementById('compress-quality');
    const qualityVal = document.getElementById('quality-val');
    const downloadBtn = document.getElementById('compress-download');
    const previewOrig = document.getElementById('compress-preview-orig');
    const previewComp = document.getElementById('compress-preview-comp');
    const origSizeEl = document.getElementById('compress-orig-size');
    const compSizeEl = document.getElementById('compress-comp-size');
    const savingsEl = document.getElementById('compress-savings');

    if (!dropzone || !input) return;

    const handleFile = (file) => {
      const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
      if (!file || !file.type.startsWith('image/')) {
        alert(isRu ? 'Пожалуйста, выберите файл изображения (JPG, PNG, WebP).' : 'Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      this.currentFile = file;
      origSizeEl.textContent = this.formatBytes(file.size);

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          previewOrig.src = e.target.result;
          controls.classList.remove('hidden');
          dropzone.classList.add('hidden');
          this.processCompression();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-neutral-500'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-neutral-500'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-neutral-500');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    qualitySlider.addEventListener('input', (e) => {
      qualityVal.textContent = e.target.value + '%';
      this.processCompression();
    });

    const resetBtn = document.getElementById('compress-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.currentCompUrl) {
          URL.revokeObjectURL(this.currentCompUrl);
          this.currentCompUrl = null;
        }
        controls.classList.add('hidden');
        dropzone.classList.remove('hidden');
        input.value = '';
        this.currentFile = null;
        this.currentImage = null;
      });
    }
  },

  processCompression() {
    if (!this.currentImage || !this.currentFile) return;

    const quality = document.getElementById('compress-quality').value / 100;
    const canvas = document.createElement('canvas');
    canvas.width = this.currentImage.naturalWidth;
    canvas.height = this.currentImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.currentImage, 0, 0);

    // Prefer WebP or JPEG for compression
    let mimeType = this.currentFile.type;
    if (mimeType === 'image/png') {
      mimeType = 'image/webp'; // PNG compression is best as WebP
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const compSizeEl = document.getElementById('compress-comp-size');
      const savingsEl = document.getElementById('compress-savings');
      const previewComp = document.getElementById('compress-preview-comp');
      const downloadBtn = document.getElementById('compress-download');

      compSizeEl.textContent = this.formatBytes(blob.size);
      
      const diff = this.currentFile.size - blob.size;
      const percent = Math.round((diff / this.currentFile.size) * 100);
      if (percent > 0) {
        savingsEl.textContent = `-${percent}%`;
        savingsEl.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700';
      } else {
        savingsEl.textContent = `0%`;
        savingsEl.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 border border-neutral-300 dark:border-neutral-700';
      }

      if (this.currentCompUrl) {
        URL.revokeObjectURL(this.currentCompUrl);
      }
      this.currentCompUrl = URL.createObjectURL(blob);
      const url = this.currentCompUrl;
      previewComp.src = url;

      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
        const baseName = this.currentFile.name.substring(0, this.currentFile.name.lastIndexOf('.')) || 'image';
        a.download = `compressed_${baseName}.${ext}`;
        a.href = url;
        a.click();
      };

      const shareBtn = document.getElementById('compress-share');
      if (shareBtn) {
        shareBtn.onclick = async () => {
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = this.currentFile.name.substring(0, this.currentFile.name.lastIndexOf('.')) || 'image';
          const file = new File([blob], `compressed_${baseName}.${ext}`, { type: mimeType });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: file.name });
            } catch (err) {
              if (err.name !== 'AbortError') downloadBtn.click();
            }
          } else {
            downloadBtn.click();
          }
        };
      }
    }, mimeType, quality);
  },

  // --- 2. Format Converter ---
  bindConverter() {
    const dropzone = document.getElementById('converter-dropzone');
    const input = document.getElementById('converter-input');
    const controls = document.getElementById('converter-controls');
    const formatSelect = document.getElementById('convert-format');
    const convertBtn = document.getElementById('convert-execute');
    let sourceImage = null;
    let fileName = 'image';

    if (!dropzone || !input) return;

    const handleFile = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      fileName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          sourceImage = img;
          controls.classList.remove('hidden');
          dropzone.classList.add('hidden');
          document.getElementById('converter-preview').src = e.target.result;
          document.getElementById('converter-info').textContent = `${file.name} (${this.formatBytes(file.size)})`;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    convertBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      const targetFormat = formatSelect.value; // 'image/png', 'image/jpeg', 'image/webp'
      const canvas = document.createElement('canvas');
      canvas.width = sourceImage.naturalWidth;
      canvas.height = sourceImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      // If converting to JPEG, add white background instead of transparent
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(sourceImage, 0, 0);

      canvas.toBlob((blob) => {
        const ext = targetFormat.split('/')[1];
        const fileNameWithExt = `${fileName}_converted.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = fileNameWithExt;
        a.href = url;
        a.click();
      }, targetFormat, 0.92);
    });

    document.getElementById('convert-reset')?.addEventListener('click', () => {
      controls.classList.add('hidden');
      dropzone.classList.remove('hidden');
      input.value = '';
      sourceImage = null;
    });
  },

  // --- 3. EXIF & Metadata Privacy Stripper ---
  bindExifCleaner() {
    const dropzone = document.getElementById('exif-dropzone');
    const input = document.getElementById('exif-input');
    const statusBox = document.getElementById('exif-status');

    if (!dropzone || !input) return;

    const cleanExif = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Drawing into a freshly created canvas automatically strips all EXIF/GPS/Device metadata
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const outExt = outMime === 'image/png' ? 'png' : 'jpg';
          const rawBase = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';

          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const safeBase = rawBase.replace(/[^\wа-яА-ЯёЁ.-]/g, '_');
            const safeDownloadName = `clean_${safeBase}.${outExt}`;
            const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
            statusBox.innerHTML = `
              <div class="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-center">
                <div class="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mx-auto mb-3">
                  <i data-lucide="shield-check" class="w-5 h-5 text-emerald-500"></i>
                </div>
                <h4 class="font-semibold text-sm text-neutral-900 dark:text-neutral-100">${isRu ? 'Метаданные удалены' : 'Metadata Removed'}</h4>
                <p class="text-xs text-neutral-500 mt-1">${isRu ? 'GPS-координаты, модель устройства и временные метки очищены.' : 'GPS coordinates, device model, and capture timestamps stripped.'}</p>
                <div class="mt-4 flex gap-2 justify-center">
                  <a href="${url}" download="${safeDownloadName}" class="btn-primary inline-flex items-center gap-1.5 text-xs">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i> ${isRu ? 'Скачать файл' : 'Download File'}
                  </a>
                  <button id="exif-again" class="btn-secondary text-xs">
                    ${isRu ? 'Очистить еще' : 'Clean Another'}
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) lucide.createIcons();
            document.getElementById('exif-again').onclick = () => {
              statusBox.innerHTML = '';
              input.value = '';
            };
          }, outMime, 0.95);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) cleanExif(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) cleanExif(e.target.files[0]);
    });
  },

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
};

if (typeof window !== 'undefined') window.ImageTools = ImageTools;
if (typeof module !== 'undefined' && module.exports) module.exports = ImageTools;


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageTools;
}

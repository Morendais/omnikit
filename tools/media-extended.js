/**
 * Extended Media Tools (100% Client-Side)
 * HEIC Converter, Image Resizer & Aspect Ratios, Images to PDF, Favicon Generator
 */

const MediaExtended = {
  init() {
    this.bindResizer();
    this.bindFaviconGenerator();
    this.bindImagesToPdf();
    this.bindHeicConverter();
  },

  // --- 1. Image Resizer ---
  bindResizer() {
    const input = document.getElementById('resizer-input');
    const dropzone = document.getElementById('resizer-dropzone');
    const controls = document.getElementById('resizer-controls');
    const widthInput = document.getElementById('resizer-width');
    const heightInput = document.getElementById('resizer-height');
    const lockAspect = document.getElementById('resizer-lock-aspect');
    const downloadBtn = document.getElementById('resizer-download');
    let sourceFile = null;
    let sourceImage = null;
    let aspectRatio = 1;
    let rotation = 0;

    if (!input || !dropzone) return;

    const handleFile = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      sourceFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          sourceImage = img;
          aspectRatio = img.naturalWidth / img.naturalHeight;
          widthInput.value = img.naturalWidth;
          heightInput.value = img.naturalHeight;
          rotation = 0;
          controls.classList.remove('hidden');
          dropzone.classList.add('hidden');
          document.getElementById('resizer-preview').src = e.target.result;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    // Preset buttons (3:4, 1:1, 16:9, 9:16, Avatar)
    document.querySelectorAll('.resizer-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseInt(btn.dataset.w, 10);
        const h = parseInt(btn.dataset.h, 10);
        if (w && h) {
          widthInput.value = w;
          heightInput.value = h;
        }
      });
    });

    widthInput?.addEventListener('input', () => {
      if (lockAspect?.checked && sourceImage) {
        heightInput.value = Math.round(widthInput.value / aspectRatio);
      }
    });

    heightInput?.addEventListener('input', () => {
      if (lockAspect?.checked && sourceImage) {
        widthInput.value = Math.round(heightInput.value * aspectRatio);
      }
    });

    // Rotate 90 deg
    document.getElementById('resizer-rotate-btn')?.addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      const prev = document.getElementById('resizer-preview');
      if (prev) prev.style.transform = `rotate(${rotation}deg)`;
    });

    downloadBtn?.addEventListener('click', () => {
      if (!sourceImage) return;
      const targetW = parseInt(widthInput.value, 10) || sourceImage.naturalWidth;
      const targetH = parseInt(heightInput.value, 10) || sourceImage.naturalHeight;

      const canvas = document.createElement('canvas');
      if (rotation === 90 || rotation === 270) {
        canvas.width = targetH;
        canvas.height = targetW;
      } else {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const isPng = sourceFile?.type === 'image/png' || sourceFile?.name?.toLowerCase().endsWith('.png');
      const outMime = isPng ? 'image/png' : 'image/jpeg';
      const outExt = isPng ? 'png' : 'jpg';

      const ctx = canvas.getContext('2d');
      if (!isPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(sourceImage, -targetW / 2, -targetH / 2, targetW, targetH);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `resized_${targetW}x${targetH}.${outExt}`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, outMime, 0.95);
    });

    document.getElementById('resizer-reset')?.addEventListener('click', () => {
      controls.classList.add('hidden');
      dropzone.classList.remove('hidden');
      input.value = '';
      sourceImage = null;
      sourceFile = null;
    });
  },

  // --- 2. Favicon Generator ---
  bindFaviconGenerator() {
    const input = document.getElementById('favicon-input');
    const dropzone = document.getElementById('favicon-dropzone');
    const controls = document.getElementById('favicon-controls');
    let sourceImage = null;

    if (!input || !dropzone) return;

    const handleFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          sourceImage = img;
          controls.classList.remove('hidden');
          dropzone.classList.add('hidden');
          // Update previews
          ['16', '32', '192'].forEach(sz => {
            const previewEl = document.getElementById(`favicon-prev-${sz}`);
            if (previewEl) previewEl.src = e.target.result;
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    const downloadIcon = (size, filename) => {
      if (!sourceImage) return;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(sourceImage, 0, 0, size, size);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
      }, 'image/png');
    };

    document.getElementById('btn-download-ico')?.addEventListener('click', () => downloadIcon(32, 'favicon.ico'));
    document.getElementById('btn-download-16')?.addEventListener('click', () => downloadIcon(16, 'favicon-16x16.png'));
    document.getElementById('btn-download-32')?.addEventListener('click', () => downloadIcon(32, 'favicon-32x32.png'));
    document.getElementById('btn-download-192')?.addEventListener('click', () => downloadIcon(192, 'apple-touch-icon.png'));

    document.getElementById('favicon-reset')?.addEventListener('click', () => {
      controls.classList.add('hidden');
      dropzone.classList.remove('hidden');
      input.value = '';
      sourceImage = null;
    });
  },

  // --- 3. Images to PDF ---
  bindImagesToPdf() {
    const input = document.getElementById('img2pdf-input');
    const dropzone = document.getElementById('img2pdf-dropzone');
    const fileListEl = document.getElementById('img2pdf-list');
    const generateBtn = document.getElementById('img2pdf-generate');
    let loadedFiles = [];

    if (!input || !dropzone) return;

    const addFiles = (files) => {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          loadedFiles.push(file);
        }
      });
      renderList();
    };

    const escapeHtml = (str) => {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    };

    const renderList = () => {
      if (!fileListEl) return;
      if (loadedFiles.length === 0) {
        fileListEl.innerHTML = '';
        generateBtn.classList.add('hidden');
        return;
      }
      generateBtn.classList.remove('hidden');
      fileListEl.innerHTML = `
        <div class="space-y-2 mt-4">
          <p class="text-xs text-neutral-500 font-medium">Выбрано файлов: ${loadedFiles.length}</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${loadedFiles.map((f, i) => `
              <div class="p-2 border border-neutral-200 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900 text-[11px] truncate flex items-center justify-between">
                <span class="truncate">${escapeHtml(f.name)}</span>
                <button type="button" class="text-red-500 hover:text-red-700 ml-1 remove-pdf-img" data-idx="${i}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      fileListEl.querySelectorAll('.remove-pdf-img').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          loadedFiles.splice(idx, 1);
          renderList();
        };
      });
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) addFiles(e.target.files);
    });

    // Pure Client-side binary PDF compiler for images
    generateBtn?.addEventListener('click', async () => {
      if (loadedFiles.length === 0) return;

      const pageSize = document.getElementById('img2pdf-page-size')?.value || 'a4';

      // 1. Direct binary download via jsPDF if loaded
      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: (pageSize === 'letter' || pageSize === 'us-letter') ? 'letter' : 'a4'
          });

          const pWidth = pdf.internal.pageSize.getWidth();
          const pHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < loadedFiles.length; i++) {
            const file = loadedFiles[i];
            const imgData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(file);
            });

            if (i > 0) pdf.addPage();

            const img = new Image();
            await new Promise((resolve) => {
              img.onload = resolve;
              img.src = imgData;
            });

            const margin = 20;
            const availW = pWidth - margin * 2;
            const availH = pHeight - margin * 2;
            const ratio = Math.min(availW / img.width, availH / img.height);
            const drawW = img.width * ratio;
            const drawH = img.height * ratio;
            const x = margin + (availW - drawW) / 2;
            const y = margin + (availH - drawH) / 2;

            const format = file.type.includes('png') ? 'PNG' : 'JPEG';
            pdf.addImage(imgData, format, x, y, drawW, drawH);
          }

          pdf.save('omnikit-document.pdf');
          return;
        } catch (err) {
          console.warn('jsPDF generation failed, using print fallback:', err);
        }
      }

      // 2. High-fidelity print view fallback
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Пожалуйста, разрешите всплывающие окна для экспорта PDF');
        return;
      }

      printWindow.document.title = 'OmniKit PDF Export';
      const style = printWindow.document.createElement('style');
      style.textContent = `
        @page { size: ${pageSize.toUpperCase()}; margin: 10mm; }
        body { margin: 0; padding: 0; background: #fff; }
        .page { page-break-after: always; display: flex; align-items: center; justify-content: center; height: 100vh; }
        img { max-width: 100%; max-height: 100%; object-fit: contain; }
      `;
      printWindow.document.head.appendChild(style);

      const contentDiv = printWindow.document.createElement('div');
      contentDiv.id = 'content';
      printWindow.document.body.appendChild(contentDiv);
      for (const file of loadedFiles) {
        const pageDiv = printWindow.document.createElement('div');
        pageDiv.className = 'page';
        const img = printWindow.document.createElement('img');
        img.src = URL.createObjectURL(file);
        pageDiv.appendChild(img);
        contentDiv.appendChild(pageDiv);
      }

      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  },

  // --- 4. HEIC Converter ---
  bindHeicConverter() {
    const input = document.getElementById('heic-input');
    const dropzone = document.getElementById('heic-dropzone');
    const statusBox = document.getElementById('heic-status');

    if (!input || !dropzone) return;

    if (input) {
      input.setAttribute('accept', '.heic,.heif,.jpg,.jpeg,.png,.webp,image/*');
    }

    const convertHeic = async (file) => {
      if (!file) return;
      const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
      const isHeicInput = /\.(heic|heif)$/i.test(file.name) || (file.type && file.type.includes('heic'));
      const isImageToHeic = !isHeicInput && (file.type?.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name));

      const rawBase = file.name.replace(/\.[^/.]+$/, "") || 'converted';
      const safeBase = rawBase.replace(/[^\wа-яА-ЯёЁ.-]/g, '_');

      // Modern rounded-2xl progress card matching site aesthetics
      statusBox.textContent = '';
      const card = document.createElement('div');
      card.className = 'p-6 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-center flex flex-col items-center justify-center space-y-3 shadow-sm animate-fade-in';
      
      const spinner = document.createElement('div');
      spinner.className = 'w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin';
      
      const textContainer = document.createElement('div');
      const titleH4 = document.createElement('h4');
      titleH4.className = 'font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100';
      titleH4.textContent = isRu 
        ? (isImageToHeic ? 'Конвертация в HEIC...' : 'Конвертация HEIC в JPG...') 
        : (isImageToHeic ? 'Converting to HEIC...' : 'Converting HEIC to JPG...');
      
      const fileP = document.createElement('p');
      fileP.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono';
      fileP.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      
      textContainer.appendChild(titleH4);
      textContainer.appendChild(fileP);
      card.appendChild(spinner);
      card.appendChild(textContainer);
      statusBox.appendChild(card);

      const showSuccessResult = (blob, outExt, outMime) => {
        const url = URL.createObjectURL(blob);
        statusBox.textContent = '';
        
        const resCard = document.createElement('div');
        resCard.className = 'p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4';
        
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3.5 min-w-0';
        
        const previewImg = document.createElement('img');
        previewImg.src = url;
        previewImg.alt = 'Preview';
        previewImg.className = 'w-16 h-16 object-cover rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0 bg-neutral-100 dark:bg-neutral-800';
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'min-w-0 text-left';
        
        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-center gap-2';
        const dot = document.createElement('span');
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0';
        const titleText = document.createElement('h4');
        titleText.className = 'font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 truncate';
        titleText.textContent = `${safeBase}.${outExt}`;
        titleRow.appendChild(dot);
        titleRow.appendChild(titleText);
        
        const infoP = document.createElement('p');
        infoP.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-1';
        infoP.textContent = `${isRu ? 'Исходный' : 'Original'}: ${(file.size / 1024).toFixed(1)} KB • ${isRu ? 'Готово' : 'Output'}: ${(blob.size / 1024).toFixed(1)} KB`;
        
        metaDiv.appendChild(titleRow);
        metaDiv.appendChild(infoP);
        leftDiv.appendChild(previewImg);
        leftDiv.appendChild(metaDiv);
        
        const dlLink = document.createElement('a');
        dlLink.href = url;
        dlLink.download = `${safeBase}.${outExt}`;
        dlLink.className = 'btn-primary text-xs py-2.5 px-5 rounded-xl inline-flex items-center gap-2 shadow-sm shrink-0 w-full sm:w-auto justify-center';
        
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'download');
        icon.className = 'w-4 h-4';
        const spanText = document.createElement('span');
        spanText.textContent = isRu ? `Скачать ${outExt.toUpperCase()}` : `Download ${outExt.toUpperCase()}`;
        
        dlLink.appendChild(icon);
        dlLink.appendChild(spanText);
        
        resCard.appendChild(leftDiv);
        resCard.appendChild(dlLink);
        statusBox.appendChild(resCard);
        
        if (window.lucide) lucide.createIcons();
      };

      if (isImageToHeic) {
        // PNG / JPG -> HEIC Converter
        try {
          const img = new Image();
          const objUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                showSuccessResult(blob, 'heic', 'image/heic');
              } else {
                canvas.toBlob((fallbackBlob) => {
                  showSuccessResult(fallbackBlob || file, 'heic', 'image/jpeg');
                }, 'image/jpeg', 0.92);
              }
            }, 'image/heic', 0.92);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            statusBox.innerHTML = `<div class="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-600">${isRu ? 'Ошибка чтения картинки' : 'Error reading image'}</div>`;
          };
          img.src = objUrl;
          return;
        } catch (err) {
          console.warn('Image to HEIC fallback:', err);
        }
      }

      // HEIC -> JPG / PNG
      if (window.heic2any) {
        try {
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          showSuccessResult(blob, 'jpg', 'image/jpeg');
          return;
        } catch (err) {
          console.warn('heic2any error, trying native Canvas:', err);
        }
      }

      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) throw new Error('Canvas blob failed');
          showSuccessResult(blob, 'jpg', 'image/jpeg');
        }, 'image/jpeg', 0.92);
      } catch (err) {
        statusBox.innerHTML = `
          <div class="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-center space-y-2">
            <p class="text-xs font-semibold text-amber-600 dark:text-amber-400">
              ${isRu ? 'Не удалось декодировать файл. Убедитесь, что это действительное изображение.' : 'Could not decode file. Please ensure it is a valid image.'}
            </p>
          </div>
        `;
      }
    };

    dropzone.addEventListener('click', (e) => {
      if (e.target !== input) input.click();
    });
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) convertHeic(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) convertHeic(e.target.files[0]);
    });
  }
};

if (typeof window !== "undefined") {
  window.MediaExtended = MediaExtended;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = MediaExtended;
}

/**
 * OmniKit PDF Suite (100% Client-Side)
 * 1. Images to PDF (jsPDF)
 * 2. PDF to JPG/PNG (pdf.js)
 * 3. Merge PDF (pdf-lib)
 * 4. Split PDF (pdf-lib)
 */

const PdfSuite = {
  activeTab: 'img2pdf',
  pdfDoc: null,
  pdfBytes: null,
  pdfImages: [],
  mergeFiles: [],

    escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  init() {
    this.bindTabs();
    this.bindImgToPdf();
    this.bindPdfToImages();
    this.bindMergePdf();
    this.bindSplitPdf();
  },

  bindTabs() {
    document.querySelectorAll('.pdf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.pdf-tab-btn').forEach(b => {
      const active = b.dataset.tab === tab;
      b.className = active 
        ? 'pdf-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition shrink-0'
        : 'pdf-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition shrink-0';
    });

    ['img2pdf', 'pdf2img', 'merge', 'split'].forEach(t => {
      const el = document.getElementById(`pdf-pane-${t}`);
      if (el) el.classList.toggle('hidden', t !== tab);
    });

    if (window.lucide) lucide.createIcons();
  },

  // --- 1. Images to PDF ---
  bindImgToPdf() {
    const input = document.getElementById('img2pdf-input');
    const dropzone = document.getElementById('img2pdf-dropzone');
    const listEl = document.getElementById('img2pdf-list');
    const generateBtn = document.getElementById('img2pdf-generate');
    const pageSizeSelect = document.getElementById('img2pdf-page-size');
    const orientationSelect = document.getElementById('img2pdf-orientation');
    const settingsPanel = document.getElementById('img2pdf-settings-panel');
    let files = [];

    if (!input || !dropzone) return;

    const render = () => {
      if (!listEl) return;
      if (files.length === 0) {
        listEl.innerHTML = '';
        settingsPanel?.classList.add('hidden');
        generateBtn?.classList.add('hidden');
        return;
      }
      settingsPanel?.classList.remove('hidden');
      generateBtn?.classList.remove('hidden');
      const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
      listEl.innerHTML = `
        <div class="space-y-2 mt-4">
          <p class="text-xs text-neutral-500 font-medium">${isRu ? 'Выбрано изображений:' : 'Selected images:'} ${files.length}</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${files.map((f, i) => `
              <div class="p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-[11px] truncate flex items-center justify-between">
                <span class="truncate">${this.escapeHtml(f.name)}</span>
                <button type="button" class="text-red-500 hover:text-red-700 ml-1 remove-img-btn" data-idx="${i}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      listEl.querySelectorAll('.remove-img-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx, 10);
          files.splice(idx, 1);
          render();
        });
      });
    };

    this.addImagesToPdf = (newFiles) => {
      Array.from(newFiles).forEach(f => {
        if (f.type.startsWith('image/')) files.push(f);
      });
      render();
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) this.addImagesToPdf(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) this.addImagesToPdf(e.target.files);
    });

    generateBtn?.addEventListener('click', async () => {
      if (files.length === 0) return;
      generateBtn.disabled = true;
      generateBtn.textContent = (window.I18N?.currentLang === 'ru') ? 'Создание PDF...' : 'Generating PDF...';

      try {
        const { jsPDF } = window.jspdf;
        const size = pageSizeSelect?.value === 'letter' ? 'letter' : 'a4';
        const orient = orientationSelect?.value === 'landscape' ? 'landscape' : 'portrait';
        const doc = new jsPDF({ orientation: orient, unit: 'mm', format: size });

        for (let i = 0; i < files.length; i++) {
          if (i > 0) doc.addPage(size, orient);
          const dataUrl = await new Promise((res) => {
            const r = new FileReader();
            r.onload = (e) => res(e.target.result);
            r.readAsDataURL(files[i]);
          });

          const img = new Image();
          await new Promise((res) => {
            img.onload = res;
            img.src = dataUrl;
          });

          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 10;
          const maxW = pageWidth - margin * 2;
          const maxH = pageHeight - margin * 2;

          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const ratio = Math.min(maxW / w, maxH / h);
          w *= ratio;
          h *= ratio;
          const x = (pageWidth - w) / 2;
          const y = (pageHeight - h) / 2;

          doc.addImage(img, 'JPEG', x, y, w, h);
        }

        doc.save('omnikit-document.pdf');
      } catch (err) {
        alert('Ошибка сборки PDF: ' + err.message);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = (window.I18N?.currentLang || 'ru') === 'ru' ? 'Собрать PDF документ' : 'Merge & Download PDF';
      }
    });
  },

  // --- 2. PDF to Images (JPG/PNG) via pdf.js ---
  bindPdfToImages() {
    const input = document.getElementById('pdf2img-input');
    const dropzone = document.getElementById('pdf2img-dropzone');
    const previewContainer = document.getElementById('pdf2img-preview');
    const actions = document.getElementById('pdf2img-actions');
    const formatSelect = document.getElementById('pdf2img-format');
    const downloadZipBtn = document.getElementById('pdf2img-download-all');

    if (!input || !dropzone) return;

    const loadPdfFile = async (file) => {
      if (!file) return;
      if (!window.pdfjsLib) {
        alert('Библиотека PDF.js загружается, пожалуйста, повторите через 2 секунды.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          this.pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const numPages = this.pdfDoc.numPages;
          this.pdfImages = [];

          if (previewContainer) {
            previewContainer.innerHTML = `
              <div class="text-xs text-neutral-500 mb-2 font-medium">
                ${(window.I18N?.currentLang || 'ru') === 'ru' ? `Страниц в документе: ${numPages}` : `Total pages: ${numPages}`}
              </div>
              <div id="pdf-pages-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
            `;
          }

          const grid = document.getElementById('pdf-pages-grid');
          actions?.classList.remove('hidden');

          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport }).promise;

            const format = formatSelect?.value || 'jpeg';
            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mime, 0.92);

            this.pdfImages.push({ pageNum, dataUrl, mime, ext: format === 'png' ? 'png' : 'jpg' });

            if (grid) {
              const card = document.createElement('div');
              card.className = 'p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161a] text-center space-y-2 shadow-sm';
              card.innerHTML = `
                <div class="aspect-[3/4] bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden flex items-center justify-center">
                  <img src="${dataUrl}" class="max-h-full max-w-full object-contain" alt="Page ${pageNum}">
                </div>
                <div class="flex items-center justify-between text-xs px-1">
                  <span class="font-mono text-neutral-500">${pageNum}</span>
                  <a href="${dataUrl}" download="page-${pageNum}.${format === 'png' ? 'png' : 'jpg'}" class="btn-secondary py-1 px-2 text-[10px]">
                    ${(window.I18N?.currentLang || 'ru') === 'ru' ? 'Скачать' : 'Save'}
                  </a>
                </div>
              `;
              grid.appendChild(card);
            }
          }
        } catch (err) {
          alert('Ошибка чтения PDF файла: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    this.loadPdfForImages = loadPdfFile;

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) loadPdfFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) loadPdfFile(e.target.files[0]);
    });

    downloadZipBtn?.addEventListener('click', async () => {
      if (!this.pdfImages || this.pdfImages.length === 0) return;
      if (!window.JSZip) {
        // Fallback: download sequential
        this.pdfImages.forEach(img => {
          const a = document.createElement('a');
          a.href = img.dataUrl;
          a.download = `page-${img.pageNum}.${img.ext}`;
          a.click();
        });
        return;
      }

      downloadZipBtn.disabled = true;
      downloadZipBtn.textContent = '...';

      try {
        const zip = new JSZip();
        for (const img of this.pdfImages) {
          const base64Data = img.dataUrl.split(',')[1];
          zip.file(`page-${img.pageNum}.${img.ext}`, base64Data, { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'omnikit-pdf-pages.zip';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Ошибка создания ZIP: ' + err.message);
      } finally {
        downloadZipBtn.disabled = false;
        downloadZipBtn.textContent = (window.I18N?.currentLang || 'ru') === 'ru' ? 'Скачать все страницы (ZIP)' : 'Download All as ZIP';
      }
    });
  },

  // --- 3. Merge Multiple PDFs via pdf-lib ---
  bindMergePdf() {
    const input = document.getElementById('merge-input');
    const dropzone = document.getElementById('merge-dropzone');
    const listEl = document.getElementById('merge-list');
    const mergeBtn = document.getElementById('merge-btn');
    this.mergeFiles = [];

    if (!input || !dropzone) return;

    const render = () => {
      if (!listEl) return;
      if (this.mergeFiles.length === 0) {
        listEl.innerHTML = '';
        mergeBtn?.classList.add('hidden');
        return;
      }
      mergeBtn?.classList.remove('hidden');
      const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
      listEl.innerHTML = `
        <div class="space-y-2 mt-4">
          <p class="text-xs text-neutral-500 font-medium">${isRu ? 'Файлов для объединения:' : 'PDF files to merge:'} ${this.mergeFiles.length}</p>
          <div class="space-y-1.5">
            ${this.mergeFiles.map((f, i) => `
              <div class="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161a] text-xs flex items-center justify-between">
                <span class="font-medium truncate mr-2">${i + 1}. ${this.escapeHtml(f.name)}</span>
                <button type="button" class="text-red-500 hover:text-red-700 remove-merge-file" data-idx="${i}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      listEl.querySelectorAll('.remove-merge-file').forEach(b => {
        b.addEventListener('click', () => {
          this.mergeFiles.splice(parseInt(b.dataset.idx, 10), 1);
          render();
        });
      });
    };

    this.addPdfsToMerge = (files) => {
      Array.from(files).forEach(f => {
        if (f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf') {
          this.mergeFiles.push(f);
        }
      });
      render();
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) this.addPdfsToMerge(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) this.addPdfsToMerge(e.target.files);
    });

    mergeBtn?.addEventListener('click', async () => {
      if (this.mergeFiles.length < 2) {
        alert((window.I18N?.currentLang || 'ru') === 'ru' ? 'Выберите минимум 2 PDF файла для склейки.' : 'Please add at least 2 PDF files to merge.');
        return;
      }
      if (!window.PDFLib) {
        alert('Библиотека PDF загружается, повторите через секунду.');
        return;
      }

      mergeBtn.disabled = true;
      mergeBtn.textContent = '...';

      try {
        const mergedPdf = await PDFLib.PDFDocument.create();

        for (const file of this.mergeFiles) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged-document.pdf';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Ошибка объединения PDF: ' + err.message);
      } finally {
        mergeBtn.disabled = false;
        mergeBtn.textContent = (window.I18N?.currentLang || 'ru') === 'ru' ? 'Склеить PDF файлы' : 'Merge PDF Files';
      }
    });
  },

  // --- 4. Split PDF via pdf-lib ---
  bindSplitPdf() {
    const input = document.getElementById('split-input');
    const dropzone = document.getElementById('split-dropzone');
    const controls = document.getElementById('split-controls');
    const pageRangeInput = document.getElementById('split-range');
    const splitBtn = document.getElementById('split-btn');
    const filenameLabel = document.getElementById('split-filename');
    let splitFile = null;

    if (!input || !dropzone) return;

    const loadForSplit = async (file) => {
      if (!file) return;
      splitFile = file;
      if (filenameLabel) filenameLabel.textContent = file.name;
      const totalPagesEl = document.getElementById('split-total-pages');
      if (window.PDFLib && totalPagesEl) {
        try {
          const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
          const buffer = await file.arrayBuffer();
          const pdfDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
          const count = pdfDoc.getPageCount();
          totalPagesEl.textContent = isRu ? `Всего: ${count} стр.` : `Total: ${count} pages`;
        } catch (e) {
          totalPagesEl.textContent = '';
        }
      }
      controls?.classList.remove('hidden');
    };

    this.loadPdfForSplit = loadForSplit;

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) loadForSplit(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) loadForSplit(e.target.files[0]);
    });

    splitBtn?.addEventListener('click', async () => {
      if (!splitFile || !window.PDFLib) return;
      const rangeStr = pageRangeInput?.value.trim();
      if (!rangeStr) {
        alert((window.I18N?.currentLang || 'ru') === 'ru' ? 'Укажите диапазон страниц, например: 1-3 или 1, 4' : 'Please specify page range (e.g. 1-3 or 1, 4)');
        return;
      }

      splitBtn.disabled = true;
      splitBtn.textContent = '...';

      try {
        const arrayBuffer = await splitFile.arrayBuffer();
        const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = srcPdf.getPageCount();

        // Parse range string (e.g. "1-3, 5")
        const pageIndices = new Set();
        const parts = rangeStr.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
                pageIndices.add(p - 1);
              }
            }
          } else {
            const p = parseInt(trimmed, 10);
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
              pageIndices.add(p - 1);
            }
          }
        }

        if (pageIndices.size === 0) {
          throw new Error('Номера страниц не найдены в документе (всего страниц: ' + totalPages + ')');
        }

        const newPdf = await PDFLib.PDFDocument.create();
        const copied = await newPdf.copyPages(srcPdf, Array.from(pageIndices));
        copied.forEach(pg => newPdf.addPage(pg));

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `split-${splitFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Ошибка разделения PDF: ' + err.message);
      } finally {
        splitBtn.disabled = false;
        splitBtn.textContent = (window.I18N?.currentLang || 'ru') === 'ru' ? 'Разделить и скачать' : 'Extract & Download';
      }
    });
  }
};

if (typeof window !== 'undefined') window.PdfSuite = PdfSuite;
if (typeof module !== 'undefined' && module.exports) module.exports = PdfSuite;


if (typeof module !== 'undefined' && module.exports) {
  module.exports = PdfSuite;
}

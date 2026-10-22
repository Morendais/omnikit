/**
 * OmniKit Online Signature & Draw Studio (100% In-Browser Execution)
 * - Smooth quadratic Bezier curve ink drawing
 * - Cursive handwriting typography mode
 * - Transparent PNG & SVG vector download
 * - One-click clipboard copy
 */

(function (global) {
  'use strict';

  const SignatureTool = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    history: [],
    currentMode: 'draw', // 'draw' or 'type'
    currentColor: '#0f172a',
    currentWidth: 3,
    isTransparent: true,
    lastX: 0,
    lastY: 0,

    init() {
      this.canvas = document.getElementById('signature-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.resizeCanvas();
      this.bindEvents();
      this.saveState();
    },

    resizeCanvas() {
      const container = this.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.min(800, Math.floor(rect.width));
      const height = 260;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.scale(dpr, dpr);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.redraw();
    },

    bindEvents() {
      const canvas = this.canvas;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      };

      const start = (e) => {
        if (this.currentMode !== 'draw') return;
        e.preventDefault();
        this.isDrawing = true;
        const pos = getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
      };

      const move = (e) => {
        if (!this.isDrawing || this.currentMode !== 'draw') return;
        e.preventDefault();
        const pos = getPos(e);

        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentWidth;

        // Quadratic curve interpolation for silky smooth ink
        const midX = (this.lastX + pos.x) / 2;
        const midY = (this.lastY + pos.y) / 2;

        this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
        this.ctx.stroke();

        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      const stop = () => {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.saveState();
      };

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);

      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', stop);

      // Mode toggles
      document.getElementById('sig-mode-draw')?.addEventListener('click', () => this.setMode('draw'));
      document.getElementById('sig-mode-type')?.addEventListener('click', () => this.setMode('type'));

      // Text input
      const typeInput = document.getElementById('sig-type-input');
      if (typeInput) {
        typeInput.addEventListener('input', () => {
          if (this.currentMode === 'type') this.renderTypedSignature(typeInput.value);
        });
      }

      // Font select
      document.getElementById('sig-font-select')?.addEventListener('change', () => {
        if (this.currentMode === 'type') this.renderTypedSignature(typeInput?.value || '');
      });

      // Colors
      document.querySelectorAll('.sig-color-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const color = e.currentTarget.getAttribute('data-color');
          if (color) {
            this.currentColor = color;
            document.querySelectorAll('.sig-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-indigo-500'));
            e.currentTarget.classList.add('ring-2', 'ring-indigo-500');
            if (this.currentMode === 'type') this.renderTypedSignature(typeInput?.value || '');
          }
        });
      });

      // Thickness slider
      const widthSlider = document.getElementById('sig-width-slider');
      if (widthSlider) {
        widthSlider.addEventListener('input', (e) => {
          this.currentWidth = parseInt(e.target.value, 10);
        });
      }

      // Clear & Undo
      document.getElementById('sig-clear-btn')?.addEventListener('click', () => this.clear());
      document.getElementById('sig-undo-btn')?.addEventListener('click', () => this.undo());

      // Transparent toggle
      const transToggle = document.getElementById('sig-trans-toggle');
      if (transToggle) {
        transToggle.addEventListener('change', (e) => {
          this.isTransparent = e.target.checked;
          this.redraw();
        });
      }

      // Export Buttons
      document.getElementById('sig-download-png')?.addEventListener('click', () => this.downloadPng());
      document.getElementById('sig-download-svg')?.addEventListener('click', () => this.downloadSvg());
      document.getElementById('sig-copy-btn')?.addEventListener('click', () => this.copyToClipboard());
    },

    setMode(mode) {
      this.currentMode = mode;
      const drawPanel = document.getElementById('sig-draw-controls');
      const typePanel = document.getElementById('sig-type-controls');
      const btnDraw = document.getElementById('sig-mode-draw');
      const btnType = document.getElementById('sig-mode-type');

      if (mode === 'draw') {
        drawPanel?.classList.remove('hidden');
        typePanel?.classList.add('hidden');
        btnDraw?.classList.add('active', 'bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
        btnType?.classList.remove('active', 'bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
        this.clear();
      } else {
        drawPanel?.classList.add('hidden');
        typePanel?.classList.remove('hidden');
        btnType?.classList.add('active', 'bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
        btnDraw?.classList.remove('active', 'bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
        const input = document.getElementById('sig-type-input');
        this.renderTypedSignature(input?.value || 'John Doe');
      }
    },

    renderTypedSignature(text) {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;

      this.ctx.clearRect(0, 0, w, h);
      if (!this.isTransparent) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, w, h);
      }

      if (!text) return;
      const font = document.getElementById('sig-font-select')?.value || 'cursive';
      this.ctx.font = `italic 54px ${font}`;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, w / 2, h / 2);
      this.saveState();
    },

    saveState() {
      if (this.history.length > 20) this.history.shift();
      const dpr = window.devicePixelRatio || 1;
      this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    },

    undo() {
      if (this.history.length > 1) {
        this.history.pop();
        const prev = this.history[this.history.length - 1];
        this.ctx.putImageData(prev, 0, 0);
      } else {
        this.clear();
      }
    },

    clear() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      this.ctx.clearRect(0, 0, w, h);
      if (!this.isTransparent) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, w, h);
      }
      this.history = [];
      this.saveState();
    },

    redraw() {
      if (!this.isTransparent) {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, w, h);
      }
    },

    downloadPng() {
      this.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.setAttribute('download', 'signature.png');
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('href', url);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }, 'image/png');
    },

    downloadSvg() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      const dataUrl = this.canvas.toDataURL('image/png');
      const svg = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" href="${dataUrl}"/>
</svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.setAttribute('download', 'signature.svg');
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('href', url);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },

    async copyToClipboard() {
      const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
      try {
        this.canvas.toBlob(async (blob) => {
          if (!blob) return;
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            if (window.App) window.App.showToast(isRu ? 'Подпись скопирована в буфер обмена!' : 'Signature copied to clipboard!', 'success');
          } else {
            if (window.App) window.App.showToast(isRu ? 'Буфер обмена не поддерживается этим браузером' : 'Clipboard not supported in this browser', 'error');
          }
        }, 'image/png');
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.SignatureTool = SignatureTool;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignatureTool;
  }
})(typeof window !== 'undefined' ? window : global);

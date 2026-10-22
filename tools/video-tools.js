/**
 * OmniKit Video Tools Suite (100% In-Browser Execution)
 * - Video to Animated GIF Converter with Frame Rate & Dimension tuning
 * - Video to Audio (WAV/MP3) Extractor using Web Audio API
 */

(function (global) {
  'use strict';

  // Lightweight Client-Side LZW GIF Encoder
  function encodeGif(frames, width, height, fps, onProgress) {
    // Generate animated GIF binary buffer
    const delay = Math.round(100 / fps);
    const buffer = [];

    function writeString(str) {
      for (let i = 0; i < str.length; i++) buffer.push(str.charCodeAt(i));
    }
    function writeShort(val) {
      buffer.push(val & 0xff, (val >> 8) & 0xff);
    }

    // Header & Logical Screen Descriptor
    writeString('GIF89a');
    writeShort(width);
    writeShort(height);
    buffer.push(0xf7); // Global color table present, 8 bits/pixel (256 colors)
    buffer.push(0x00); // Background color index
    buffer.push(0x00); // Pixel aspect ratio

    // 256-color Web-safe / adaptive palette
    const palette = [];
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
          palette.push(Math.round((r * 255) / 5), Math.round((g * 255) / 5), Math.round((b * 255) / 5));
        }
      }
    }
    // Fill remaining colors to 256 with grayscale steps
    for (let i = palette.length / 3; i < 256; i++) {
      const v = Math.round(((i - 216) * 255) / 39);
      palette.push(v, v, v);
    }
    for (let i = 0; i < 768; i++) buffer.push(palette[i] || 0);

    // Netscape Application Extension for Looping
    buffer.push(0x21, 0xff, 0x0b);
    writeString('NETSCAPE2.0');
    buffer.push(0x03, 0x01, 0x00, 0x00, 0x00);

    const totalFrames = frames.length;
    for (let fIdx = 0; fIdx < totalFrames; fIdx++) {
      const frameData = frames[fIdx]; // ImageData.data (RGBA)

      // Graphics Control Extension
      buffer.push(0x21, 0xf9, 0x04);
      buffer.push(0x04); // Disposal method: restore to background
      writeShort(delay);
      buffer.push(0x00); // Transparent color index (none)
      buffer.push(0x00); // Terminator

      // Image Descriptor
      buffer.push(0x2c);
      writeShort(0); // Left
      writeShort(0); // Top
      writeShort(width);
      writeShort(height);
      buffer.push(0x00); // Local color table flag

      // Quantize RGBA frame to 8-bit palette indices
      const indexedPixels = new Uint8Array(width * height);
      for (let i = 0, p = 0; i < frameData.length; i += 4, p++) {
        const r = frameData[i];
        const g = frameData[i + 1];
        const b = frameData[i + 2];
        // Fast 6x6x6 color cube indexing
        const ri = Math.min(5, Math.floor((r * 6) / 256));
        const gi = Math.min(5, Math.floor((g * 6) / 256));
        const bi = Math.min(5, Math.floor((b * 6) / 256));
        indexedPixels[p] = ri * 36 + gi * 6 + bi;
      }

      // LZW compression
      const minCodeSize = 8;
      buffer.push(minCodeSize);

      const clearCode = 1 << minCodeSize;
      const eoiCode = clearCode + 1;
      let codeSize = minCodeSize + 1;
      let nextCode = clearCode + 2;

      let codeTable = new Map();
      function resetTable() {
        codeTable.clear();
        for (let i = 0; i < clearCode; i++) codeTable.set(String.fromCharCode(i), i);
        codeSize = minCodeSize + 1;
        nextCode = clearCode + 2;
      }
      resetTable();

      let accum = 0;
      let bits = 0;
      const subBlock = [];

      function writeBits(code) {
        accum |= code << bits;
        bits += codeSize;
        while (bits >= 8) {
          subBlock.push(accum & 0xff);
          if (subBlock.length === 254) {
            buffer.push(254, ...subBlock);
            subBlock.length = 0;
          }
          accum >>= 8;
          bits -= 8;
        }
      }

      writeBits(clearCode);

      let currentStr = String.fromCharCode(indexedPixels[0]);
      for (let i = 1; i < indexedPixels.length; i++) {
        const char = String.fromCharCode(indexedPixels[i]);
        const combined = currentStr + char;
        if (codeTable.has(combined)) {
          currentStr = combined;
        } else {
          writeBits(codeTable.get(currentStr));
          if (nextCode < 4096) {
            codeTable.set(combined, nextCode++);
            if (nextCode === (1 << codeSize) && codeSize < 12) {
              codeSize++;
            }
          } else {
            writeBits(clearCode);
            resetTable();
          }
          currentStr = char;
        }
      }
      if (currentStr.length > 0) {
        writeBits(codeTable.get(currentStr));
      }
      writeBits(eoiCode);

      if (bits > 0) {
        subBlock.push(accum & 0xff);
      }
      if (subBlock.length > 0) {
        buffer.push(subBlock.length, ...subBlock);
      }
      buffer.push(0x00); // Block terminator

      if (onProgress) onProgress(Math.round(((fIdx + 1) / totalFrames) * 100));
    }

    // Trailer
    buffer.push(0x3b);
    return new Blob([new Uint8Array(buffer)], { type: 'image/gif' });
  }

  // AudioBuffer to 16-bit stereo/mono PCM WAV Encoder
  function encodeWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels
    let offset = 44;
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  const VideoTools = {
    init() {
      this.initVideoToGif();
      this.initVideoToAudio();
    },

    initVideoToGif() {
      const dropzone = document.getElementById('video2gif-dropzone');
      const input = document.getElementById('video2gif-input');
      const controls = document.getElementById('video2gif-controls');
      const videoEl = document.getElementById('video2gif-player');
      const convertBtn = document.getElementById('video2gif-convert-btn');
      const progressBox = document.getElementById('video2gif-progress');
      const progressBar = document.getElementById('video2gif-progress-bar');
      const progressText = document.getElementById('video2gif-progress-text');
      const resultCard = document.getElementById('video2gif-result');
      const resultImg = document.getElementById('video2gif-preview-img');
      const downloadBtn = document.getElementById('video2gif-download-btn');
      const sizeTag = document.getElementById('video2gif-size-tag');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeBlobUrl = null;
      let activeGifBlob = null;

      const sanitizeBlob = (url) => {
        if (!url || typeof url !== 'string') return '';
        try {
          const parsed = new URL(url, window.location.origin || 'http://localhost');
          return parsed.protocol === 'blob:' ? parsed.href : '';
        } catch (_) {
          return '';
        }
      };

      const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
          if (window.App) window.App.showToast(window.I18N?.currentLang === 'ru' ? 'Выберите видеофайл (MP4, WebM, MOV)' : 'Please select a valid video file (MP4, WebM, MOV)', 'error');
          return;
        }
        currentFile = file;
        if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = URL.createObjectURL(file);
        const safeUrl = sanitizeBlob(activeBlobUrl);
        if (safeUrl) {
          videoEl.src = safeUrl;
          videoEl.load();
        }

        videoEl.onloadedmetadata = () => {
          controls.classList.remove('hidden');
          resultCard.classList.add('hidden');
          progressBox.classList.add('hidden');
          const maxSec = Math.min(60, Math.floor(videoEl.duration));
          const endInput = document.getElementById('video2gif-end');
          if (endInput) {
            endInput.value = Math.min(10, maxSec);
            endInput.max = maxSec;
          }
        };
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) {
          handleFile(files[0]);
        }
      });
      input.addEventListener('change', () => {
        const files = input.files;
        if (files && files.length) {
          handleFile(files[0]);
        }
      });

      if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
          if (!currentFile || !videoEl) return;

          const fps = parseInt(document.getElementById('video2gif-fps')?.value || '10', 10);
          const targetWidth = parseInt(document.getElementById('video2gif-width')?.value || '480', 10);
          const startSec = Math.max(0, parseFloat(document.getElementById('video2gif-start')?.value || '0'));
          const endSec = Math.min(videoEl.duration, Math.max(startSec + 0.5, parseFloat(document.getElementById('video2gif-end')?.value || '5')));

          convertBtn.disabled = true;
          progressBox.classList.remove('hidden');
          resultCard.classList.add('hidden');
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = '0%';

          const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          const aspect = videoEl.videoHeight / videoEl.videoWidth || 0.5625;
          const targetHeight = Math.round(targetWidth * aspect);
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const totalFrames = Math.floor((endSec - startSec) * fps);
          const interval = 1 / fps;
          const extractedFrames = [];

          let currentFrame = 0;
          const seekAndCapture = () => {
            return new Promise((resolve) => {
              const seekTime = startSec + currentFrame * interval;
              if (seekTime > endSec || currentFrame >= totalFrames) {
                resolve(false);
                return;
              }
              videoEl.currentTime = seekTime;
              const onSeeked = () => {
                videoEl.removeEventListener('seeked', onSeeked);
                ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
                extractedFrames.push(ctx.getImageData(0, 0, targetWidth, targetHeight).data);
                currentFrame++;
                const capturePercent = Math.round((currentFrame / totalFrames) * 50);
                if (progressBar) progressBar.style.width = `${capturePercent}%`;
                if (progressText) progressText.textContent = `${capturePercent}% (${isRu ? 'захват кадров' : 'capturing'})`;
                resolve(true);
              };
              videoEl.addEventListener('seeked', onSeeked);
            });
          };

          while (await seekAndCapture()) {}

          // Encode frames to GIF
          if (progressText) progressText.textContent = `50% (${isRu ? 'генерация GIF' : 'encoding GIF'})`;
          
          setTimeout(() => {
            try {
              activeGifBlob = encodeGif(extractedFrames, targetWidth, targetHeight, fps, (p) => {
                const totalP = 50 + Math.round(p * 0.5);
                if (progressBar) progressBar.style.width = `${totalP}%`;
                if (progressText) progressText.textContent = `${totalP}%`;
              });

              const gifUrl = URL.createObjectURL(activeGifBlob);
              const safeGif = sanitizeBlob(gifUrl);
              if (resultImg && safeGif) resultImg.src = safeGif;
              if (sizeTag) sizeTag.textContent = `${(activeGifBlob.size / 1024).toFixed(1)} KB`;
              resultCard.classList.remove('hidden');
              progressBox.classList.add('hidden');
            } catch (err) {
              console.error('GIF encoding error:', err);
              if (window.App) window.App.showToast(isRu ? 'Ошибка генерации GIF' : 'Error generating GIF', 'error');
            } finally {
              convertBtn.disabled = false;
            }
          }, 50);
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeGifBlob) return;
          const blobUrl = URL.createObjectURL(activeGifBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'video').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}-animated.gif`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    },

    initVideoToAudio() {
      const dropzone = document.getElementById('video2audio-dropzone');
      const input = document.getElementById('video2audio-input');
      const controls = document.getElementById('video2audio-controls');
      const extractBtn = document.getElementById('video2audio-extract-btn');
      const progressBox = document.getElementById('video2audio-progress');
      const resultCard = document.getElementById('video2audio-result');
      const audioPlayer = document.getElementById('video2audio-player');
      const downloadBtn = document.getElementById('video2audio-download-btn');
      const sizeTag = document.getElementById('video2audio-size-tag');
      const fileLabel = document.getElementById('video2audio-file-label');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeAudioBlob = null;

      const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
          if (window.App) window.App.showToast(window.I18N?.currentLang === 'ru' ? 'Выберите видеофайл' : 'Please select a video file', 'error');
          return;
        }
        currentFile = file;
        if (fileLabel) fileLabel.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        controls.classList.remove('hidden');
        resultCard.classList.add('hidden');
        progressBox.classList.add('hidden');
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
      input.addEventListener('change', () => {
        const files = input.files;
        if (files && files.length) {
          handleFile(files[0]);
        }
      });

      if (extractBtn) {
        extractBtn.addEventListener('click', async () => {
          if (!currentFile) return;

          extractBtn.disabled = true;
          progressBox.classList.remove('hidden');
          resultCard.classList.add('hidden');

          try {
            const arrayBuffer = await currentFile.arrayBuffer();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            activeAudioBlob = encodeWav(audioBuffer);
            const audioUrl = URL.createObjectURL(activeAudioBlob);

            const safeAudio = sanitizeBlob(audioUrl);
            if (audioPlayer && safeAudio) audioPlayer.src = safeAudio;
            if (sizeTag) sizeTag.textContent = `${(activeAudioBlob.size / (1024 * 1024)).toFixed(2)} MB`;

            resultCard.classList.remove('hidden');
            progressBox.classList.add('hidden');
          } catch (err) {
            console.error('Audio extraction error:', err);
            const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
            if (window.App) window.App.showToast(isRu ? 'Не удалось извлечь аудиодорожку (файл поврежден или без звука)' : 'Could not extract audio (file may be corrupted or silent)', 'error');
          } finally {
            extractBtn.disabled = false;
          }
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeAudioBlob) return;
          const blobUrl = URL.createObjectURL(activeAudioBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'audio').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}-extracted.wav`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.VideoTools = VideoTools;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoTools;
  }
})(typeof window !== 'undefined' ? window : global);

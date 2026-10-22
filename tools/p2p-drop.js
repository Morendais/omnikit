/**
 * OmniKit — Local P2P Drop (WebRTC DataChannel AirDrop)
 * 100% Client-Side Peer-to-Peer file transfer between PC and Smartphone.
 * Zero-Knowledge, Zero Server Storage.
 */

const P2PDrop = {
  peerConnection: null,
  dataChannel: null,
  isHost: false,
  transferQueue: [],
  receivedChunks: [],
  receivingFileMeta: null,

  init() {
    this.bindUI();
  },

  bindUI() {
    const roleHostBtn = document.getElementById('p2p-role-host');
    const roleClientBtn = document.getElementById('p2p-role-client');
    const dropzone = document.getElementById('p2p-dropzone');
    const fileInput = document.getElementById('p2p-file-input');

    roleHostBtn?.addEventListener('click', () => this.startAsHost());
    roleClientBtn?.addEventListener('click', () => this.startAsClient());

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => e.preventDefault());
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        this.sendFile(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.sendFile(e.target.files[0]);
      }
    });
  },

  createPeerConnection() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    const pc = new RTCPeerConnection(config);

    pc.oniceconnectionstatechange = () => {
      this.updateStatus(pc.iceConnectionState);
    };

    return pc;
  },

  async startAsHost() {
    this.isHost = true;
    this.peerConnection = this.createPeerConnection();

    this.dataChannel = this.peerConnection.createDataChannel('omnikit-drop', {
      ordered: true
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering to complete so SDP has candidate information
    await new Promise((resolve) => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.peerConnection.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 1500); // safety fallback
      }
    });

    const sdpData = JSON.stringify(this.peerConnection.localDescription);
    this.renderHostQRCode(sdpData);
  },

  renderHostQRCode(sdp) {
    const qrContainer = document.getElementById('p2p-qrcode-box');
    const instructions = document.getElementById('p2p-instructions');
    const isRu = (window.I18N?.currentLang || 'ru') === 'ru';

    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
        text: window.location.origin + '/p2p-drop?join=' + encodeURIComponent(btoa(sdp).slice(0, 80)),
        width: 180,
        height: 180,
        colorDark: '#4f46e5',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      qrContainer.classList.remove('hidden');
    }

    if (instructions) {
      instructions.innerHTML = `
        <div class="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-left space-y-2">
          <p class="font-bold text-indigo-900 dark:text-indigo-200">
            ${isRu ? '1. Отсканируйте QR-код камерой смартфона' : '1. Scan this QR Code with your smartphone camera'}
          </p>
          <p class="text-neutral-600 dark:text-neutral-400">
            ${isRu ? 'Устройства установят прямое P2P соединение без загрузки на сервер.' : 'Devices will establish a direct local P2P WebRTC connection.'}
          </p>
        </div>
      `;
    }
  },

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      this.updateStatus('connected');
      document.getElementById('p2p-transfer-workspace')?.classList.remove('hidden');
      document.getElementById('p2p-setup-workspace')?.classList.add('hidden');
    };

    channel.onmessage = (e) => {
      if (typeof e.data === 'string') {
        const meta = JSON.parse(e.data);
        if (meta.type === 'file-start') {
          this.receivingFileMeta = meta;
          this.receivedChunks = [];
          this.updateProgress(0, meta.name);
        } else if (meta.type === 'file-end') {
          this.finalizeReceivedFile();
        }
      } else {
        // Binary Chunk
        this.receivedChunks.push(e.data);
        if (this.receivingFileMeta) {
          const currentSize = this.receivedChunks.reduce((acc, c) => acc + c.byteLength, 0);
          const percent = Math.min(100, (currentSize / this.receivingFileMeta.size) * 100);
          this.updateProgress(percent, this.receivingFileMeta.name);
        }
      }
    };
  },

  async sendFile(file) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      alert((window.I18N?.currentLang || 'ru') === 'ru' ? 'Нет активного соединения с устройством.' : 'No active connection to peer.');
      return;
    }

    const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
    this.updateProgress(0, file.name);

    // 1. Send Header
    this.dataChannel.send(JSON.stringify({
      type: 'file-start',
      name: file.name,
      size: file.size,
      mime: file.type
    }));

    // 2. Stream Chunks (64 KB each)
    const chunkSize = 64 * 1024;
    let offset = 0;

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.dataChannel.readyState === 'open') {
          this.dataChannel.send(e.target.result);
          offset += e.target.result.byteLength;
          const percent = (offset / file.size) * 100;
          this.updateProgress(percent, file.name);

          if (offset < file.size) {
            // Respect WebRTC buffer
            if (this.dataChannel.bufferedAmount > 1024 * 1024) {
              setTimeout(readNextChunk, 20);
            } else {
              readNextChunk();
            }
          } else {
            this.dataChannel.send(JSON.stringify({ type: 'file-end' }));
            if (window.App?.showToast) {
              window.App.showToast(isRu ? `Файл «${file.name}» успешно передан!` : `File "${file.name}" sent successfully!`);
            }
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  },

  finalizeReceivedFile() {
    if (!this.receivingFileMeta) return;
    const blob = new Blob(this.receivedChunks, { type: this.receivingFileMeta.mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const filename = this.receivingFileMeta.name;
    const isRu = (window.I18N?.currentLang || 'ru') === 'ru';

    const historyBox = document.getElementById('p2p-received-list');
    if (historyBox) {
      const item = document.createElement('div');
      item.className = 'p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs animate-fade-in';
      item.innerHTML = `
        <div class="flex items-center gap-2.5 truncate">
          <i data-lucide="file-check" class="w-4 h-4 text-emerald-500 shrink-0"></i>
          <span class="font-bold text-neutral-900 dark:text-neutral-100 truncate">${filename}</span>
          <span class="text-neutral-400 font-mono text-[10px]">(${(blob.size / 1024).toFixed(1)} KB)</span>
        </div>
        <a href="${url}" download="${filename}" class="btn-primary text-xs py-1 px-3 rounded-lg flex items-center gap-1 shrink-0">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>${isRu ? 'Скачать' : 'Download'}</span>
        </a>
      `;
      historyBox.prepend(item);
      if (window.lucide) lucide.createIcons();
    }

    if (window.App?.showToast) {
      window.App.showToast(isRu ? `Получен файл: ${filename}` : `Received file: ${filename}`);
    }
  },

  updateStatus(state) {
    const badge = document.getElementById('p2p-status-badge');
    const isRu = (window.I18N?.currentLang || 'ru') === 'ru';
    if (!badge) return;

    if (state === 'connected') {
      badge.textContent = isRu ? '● Подключено (P2P Direct)' : '● Connected (P2P Direct)';
      badge.className = 'text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20';
    } else {
      badge.textContent = isRu ? 'Ожидание устройства...' : 'Waiting for peer...';
      badge.className = 'text-[11px] font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full';
    }
  },

  updateProgress(percent, filename) {
    const bar = document.getElementById('p2p-progress-bar');
    const text = document.getElementById('p2p-progress-text');
    if (bar) bar.style.width = `${percent.toFixed(1)}%`;
    if (text) text.textContent = `${filename} (${percent.toFixed(0)}%)`;
  }
};

if (typeof window !== 'undefined') {
  window.P2PDrop = P2PDrop;
};

if (typeof window !== "undefined") {
  window.P2PDrop = P2PDrop;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = P2PDrop;
}

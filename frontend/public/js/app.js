/* ============================================
   VideoForge AI - Frontend Application
   ============================================ */

const API_BASE = window.location.origin.replace(':3001', ':3001').replace(/\/$/, '');
const API_URL = API_BASE + '/api';

// ---- Utility: Toggle password visibility ----
function togglePassword(btn) {
  const input = btn.parentElement.querySelector('input');
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'bi bi-eye';
  }
}

// ---- Main App Object ----
const VideoForge = {
  token: localStorage.getItem('vf_token') || null,
  user: JSON.parse(localStorage.getItem('vf_user') || 'null'),
  pollingIntervals: [],

  // ========== AUTH ==========

  requireAuth() {
    if (!this.token) {
      window.location.href = '/login';
      return false;
    }
    this.updateSidebarUser();
    this.loadUserCredits();
    return true;
  },

  updateSidebarUser() {
    if (!this.user) return;
    const nameEl = document.getElementById('sidebarUserName');
    const emailEl = document.getElementById('sidebarUserEmail');
    const adminEmailEl = document.getElementById('adminEmail');
    if (nameEl) nameEl.textContent = this.user.name || 'User';
    if (emailEl) emailEl.textContent = this.user.email || '';
    if (adminEmailEl) adminEmailEl.textContent = this.user.email || '';
  },

  async loadUserCredits() {
    try {
      const data = await this.api('/auth/me');
      if (data && data.user) {
        this.user = data.user;
        localStorage.setItem('vf_user', JSON.stringify(data.user));
        this.updateCreditsDisplay(data.user.credits);
      }
    } catch (e) {
      console.error('Failed to load user credits:', e);
    }
  },

  updateCreditsDisplay(credits) {
    const els = ['sidebarCredits', 'dashCredits', 'genCredits', 'creditBalance'];
    els.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = credits != null ? credits : '--';
    });
  },

  logout() {
    localStorage.removeItem('vf_token');
    localStorage.removeItem('vf_user');
    this.token = null;
    this.user = null;
    this.pollingIntervals.forEach(id => clearInterval(id));
    window.location.href = '/login';
  },

  // ========== API HELPER ==========

  async api(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : API_URL + endpoint;
    const headers = {
      ...(options.headers || {}),
    };
    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }
    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  },

  // ========== TOAST NOTIFICATIONS ==========

  toast(message, type = 'success') {
    const existing = document.querySelector('.vf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `vf-toast ${type}`;
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-10">
        <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}"
           style="color: ${type === 'success' ? '#69EEC6' : '#FF4757'}; font-size: 18px;"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  // ========== DASHBOARD ==========

  async loadDashboard() {
    try {
      const [videosData] = await Promise.all([
        this.api('/videos').catch(() => ({ videos: [] })),
      ]);

      const videos = videosData.videos || [];
      const completed = videos.filter(v => v.status === 'completed').length;
      const processing = videos.filter(v => ['processing', 'pending'].includes(v.status)).length;

      document.getElementById('dashTotalVideos').textContent = videos.length;
      document.getElementById('dashProcessing').textContent = processing;
      document.getElementById('dashCompleted').textContent = completed;

      // Recent videos table
      const tbody = document.getElementById('dashRecentVideos');
      if (videos.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center opacity-40 py-4">
              <i class="bi bi-camera-video fs-28 d-block mb-10"></i>
              No videos yet. <a href="/generate" style="color: #8A42FF;">Create your first video</a>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = videos.slice(0, 5).map(v => `
        <tr>
          <td>
            <div style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${this.escapeHtml(v.prompt || 'Image-to-video')}
            </div>
          </td>
          <td><span class="fs-13">${v.model || 'kling'}</span></td>
          <td><span class="status-badge status-${v.status}">${v.status}</span></td>
          <td><span class="fs-13 opacity-50">${this.formatDate(v.createdAt)}</span></td>
          <td>
            ${v.status === 'completed' && v.videoUrl
              ? `<a href="${v.videoUrl}" download class="fs-13 tran3s" style="color: #8A42FF;"><i class="bi bi-download"></i></a>`
              : '<span class="opacity-20">--</span>'}
          </td>
        </tr>
      `).join('');

      // Poll for processing videos
      if (processing > 0) {
        const intervalId = setInterval(() => this.loadDashboard(), 10000);
        this.pollingIntervals.push(intervalId);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  },

  // ========== GENERATE PAGE ==========

  generateMode: 'text',

  initGenerate() {
    this.setupGenerateForm();
    this.setupImageUpload();
    this.setupPromptCounter();
    this.setupCreditCostCalc();
  },

  setGenerateMode(mode) {
    this.generateMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.getElementById('promptSection').classList.toggle('d-none', mode === 'image');
    document.getElementById('imageSection').classList.toggle('d-none', mode === 'text');
    this.updateCreditCost();
  },

  setupGenerateForm() {
    const form = document.getElementById('generateForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('generateBtn');
      btn.classList.add('btn-loading');

      const errorEl = document.getElementById('generate-error');
      const successEl = document.getElementById('generate-success');
      errorEl.classList.add('d-none');
      successEl.classList.add('d-none');

      try {
        const formData = new FormData(form);
        let body;

        if (this.generateMode === 'image') {
          const fileInput = document.getElementById('imageInput');
          if (fileInput.files.length === 0) {
            throw new Error('Please upload a reference image');
          }
          body = new FormData();
          body.append('image', fileInput.files[0]);
          body.append('prompt', formData.get('imagePrompt') || '');
          body.append('model', formData.get('model'));
          body.append('duration', formData.get('duration'));
          body.append('aspectRatio', formData.get('aspectRatio'));
          body.append('mode', 'image');
        } else {
          const prompt = formData.get('prompt');
          if (!prompt || prompt.trim().length < 5) {
            throw new Error('Please enter a more detailed prompt (at least 5 characters)');
          }
          body = JSON.stringify({
            prompt: prompt.trim(),
            model: formData.get('model'),
            duration: parseInt(formData.get('duration')),
            aspectRatio: formData.get('aspectRatio'),
            mode: 'text',
          });
        }

        const data = await this.api('/videos/generate', {
          method: 'POST',
          body,
          headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
        });

        successEl.textContent = 'Video generation started! Tracking progress...';
        successEl.classList.remove('d-none');
        this.toast('Video generation started!');

        // Show status and start polling
        if (data.video && data.video._id) {
          this.pollGenerationStatus(data.video._id);
        }

        // Update credits
        this.loadUserCredits();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('d-none');
      } finally {
        btn.classList.remove('btn-loading');
      }
    });
  },

  setupImageUpload() {
    const zone = document.getElementById('imageDropZone');
    const input = document.getElementById('imageInput');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        this.showImagePreview(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        this.showImagePreview(input.files[0]);
      }
    });
  },

  showImagePreview(file) {
    const placeholder = document.getElementById('imagePlaceholder');
    const preview = document.getElementById('imagePreview');
    const img = preview.querySelector('img');

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      placeholder.classList.add('d-none');
      preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  },

  clearImage() {
    const input = document.getElementById('imageInput');
    const placeholder = document.getElementById('imagePlaceholder');
    const preview = document.getElementById('imagePreview');
    input.value = '';
    placeholder.classList.remove('d-none');
    preview.classList.add('d-none');
  },

  setupPromptCounter() {
    const textarea = document.getElementById('promptInput');
    const counter = document.getElementById('charCount');
    if (!textarea || !counter) return;

    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length} / 2000`;
    });
  },

  setupCreditCostCalc() {
    const modelSelect = document.getElementById('modelSelect');
    const durationSelect = document.querySelector('select[name="duration"]');
    if (modelSelect) modelSelect.addEventListener('change', () => this.updateCreditCost());
    if (durationSelect) durationSelect.addEventListener('change', () => this.updateCreditCost());
  },

  updateCreditCost() {
    const model = document.getElementById('modelSelect')?.value || 'kling';
    const duration = parseInt(document.querySelector('select[name="duration"]')?.value || '5');
    const costEl = document.getElementById('creditCost');
    if (!costEl) return;

    let cost = 10;
    if (model === 'kling-pro') cost = 15;
    if (duration === 10) cost *= 2;

    costEl.textContent = `${cost} credits`;
  },

  pollGenerationStatus(videoId) {
    const statusEl = document.getElementById('generationStatus');
    const statusText = document.getElementById('statusText');
    const statusProgress = document.getElementById('statusProgress');
    const statusDetail = document.getElementById('statusDetail');

    if (statusEl) statusEl.classList.remove('d-none');

    let progress = 0;
    const intervalId = setInterval(async () => {
      try {
        const data = await this.api(`/videos/${videoId}`);
        const video = data.video;

        if (!video) return;

        if (video.status === 'completed') {
          clearInterval(intervalId);
          if (statusText) statusText.textContent = 'Completed!';
          if (statusProgress) statusProgress.style.width = '100%';
          if (statusDetail) statusDetail.textContent = 'Your video is ready to download.';
          this.toast('Video generation completed!');
          this.loadUserCredits();
          return;
        }

        if (video.status === 'failed') {
          clearInterval(intervalId);
          if (statusText) statusText.textContent = 'Failed';
          if (statusDetail) statusDetail.textContent = video.error || 'Generation failed. Please try again.';
          this.toast('Video generation failed.', 'error');
          return;
        }

        // Simulate progress
        progress = Math.min(progress + 5, 90);
        if (statusProgress) statusProgress.style.width = `${progress}%`;

        const statusLabels = {
          pending: 'Queued...',
          processing: 'Generating...',
        };
        if (statusText) statusText.textContent = statusLabels[video.status] || 'Processing...';
        if (statusDetail) statusDetail.textContent = `Status: ${video.status}. This may take a few minutes.`;
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 5000);

    this.pollingIntervals.push(intervalId);
  },

  // ========== VIDEOS PAGE ==========

  currentVideoView: 'grid',
  currentFilter: 'all',
  allVideos: [],

  async loadVideos() {
    try {
      const data = await this.api('/videos');
      this.allVideos = data.videos || [];
      this.renderVideos();

      // Poll if any are processing
      const hasProcessing = this.allVideos.some(v => ['pending', 'processing'].includes(v.status));
      if (hasProcessing) {
        const intervalId = setInterval(() => this.loadVideos(), 10000);
        this.pollingIntervals.push(intervalId);
      }
    } catch (e) {
      console.error('Load videos error:', e);
    }
  },

  filterVideos(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderVideos();
  },

  setVideoView(view) {
    this.currentVideoView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    this.renderVideos();
  },

  renderVideos() {
    const container = document.getElementById('videosGrid');
    const emptyState = document.getElementById('videosEmpty');
    if (!container) return;

    let filtered = this.allVideos;
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(v => v.status === this.currentFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    if (this.currentVideoView === 'grid') {
      container.innerHTML = filtered.map(v => `
        <div class="col-lg-4 col-md-6">
          <div class="video-card">
            <div class="video-thumb">
              ${v.status === 'completed' && v.thumbnailUrl
                ? `<img src="${v.thumbnailUrl}" alt="Thumbnail">`
                : `<i class="bi bi-camera-video fs-28 opacity-20"></i>`}
              ${v.status === 'completed' ? `
                <div class="play-overlay" onclick="VideoForge.previewVideo('${v._id}')">
                  <i class="bi bi-play-circle-fill fs-28 text-white"></i>
                </div>
              ` : ''}
              <div style="position:absolute;top:10px;right:10px;">
                <span class="status-badge status-${v.status}">${v.status}</span>
              </div>
            </div>
            <div class="video-info">
              <div class="video-prompt">${this.escapeHtml(v.prompt || 'Image-to-video')}</div>
              <div class="video-meta">
                <span>${v.model || 'kling'}</span> &middot;
                <span>${this.formatDate(v.createdAt)}</span>
              </div>
              <div class="video-actions">
                ${v.status === 'completed' && v.videoUrl ? `
                  <a href="${v.videoUrl}" download class="action-btn tran3s"><i class="bi bi-download"></i> Download</a>
                ` : `
                  <button class="action-btn" disabled><i class="bi bi-download"></i> Download</button>
                `}
                <button class="action-btn delete-btn tran3s" onclick="VideoForge.deleteVideo('${v._id}')">
                  <i class="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      // List view
      container.innerHTML = `<div class="col-12">${filtered.map(v => `
        <div class="video-list-item">
          <div class="list-thumb">
            ${v.thumbnailUrl ? `<img src="${v.thumbnailUrl}" alt="">` : ''}
          </div>
          <div class="flex-grow-1 min-width-0">
            <div class="fs-14 fw-500 text-white text-truncate">${this.escapeHtml(v.prompt || 'Image-to-video')}</div>
            <div class="fs-12 opacity-40 mt-5">${v.model || 'kling'} &middot; ${this.formatDate(v.createdAt)}</div>
          </div>
          <span class="status-badge status-${v.status}">${v.status}</span>
          <div class="d-flex gap-2">
            ${v.status === 'completed' && v.videoUrl
              ? `<a href="${v.videoUrl}" download class="action-btn tran3s" style="padding:8px;border-radius:8px;"><i class="bi bi-download"></i></a>`
              : ''}
            <button class="action-btn delete-btn tran3s" style="padding:8px;border-radius:8px;" onclick="VideoForge.deleteVideo('${v._id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}</div>`;
    }
  },

  previewVideo(videoId) {
    const video = this.allVideos.find(v => v._id === videoId);
    if (!video || !video.videoUrl) return;

    const modalVideo = document.getElementById('modalVideo');
    const modalPrompt = document.getElementById('modalPrompt');
    const modalMeta = document.getElementById('modalMeta');
    const modalDownload = document.getElementById('modalDownload');

    modalVideo.querySelector('source').src = video.videoUrl;
    modalVideo.load();
    modalPrompt.textContent = video.prompt || 'Image-to-video generation';
    modalMeta.textContent = `${video.model || 'kling'} | ${this.formatDate(video.createdAt)}`;
    modalDownload.href = video.videoUrl;

    const modal = new bootstrap.Modal(document.getElementById('videoModal'));
    modal.show();
  },

  async deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await this.api(`/videos/${videoId}`, { method: 'DELETE' });
      this.toast('Video deleted');
      this.allVideos = this.allVideos.filter(v => v._id !== videoId);
      this.renderVideos();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ========== MERGE PAGE ==========

  mergeQueue: [],
  mergeFileCounter: 0,

  initMerge() {
    this.setupMergeDropZone();
    this.loadLibraryVideos();
  },

  setupMergeDropZone() {
    const zone = document.getElementById('mergeDropZone');
    const input = document.getElementById('mergeFileInput');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      Array.from(e.dataTransfer.files).forEach(f => this.addToMergeQueue(f));
    });
    input.addEventListener('change', () => {
      Array.from(input.files).forEach(f => this.addToMergeQueue(f));
      input.value = '';
    });
  },

  addToMergeQueue(fileOrVideo) {
    const id = 'merge_' + (++this.mergeFileCounter);
    const item = {
      id,
      name: fileOrVideo.name || fileOrVideo.prompt || 'Video',
      file: fileOrVideo instanceof File ? fileOrVideo : null,
      videoUrl: fileOrVideo.videoUrl || null,
      videoId: fileOrVideo._id || null,
    };
    this.mergeQueue.push(item);
    this.renderMergeQueue();
  },

  removeFromMergeQueue(id) {
    this.mergeQueue = this.mergeQueue.filter(item => item.id !== id);
    this.renderMergeQueue();
  },

  renderMergeQueue() {
    const container = document.getElementById('mergeQueue');
    const emptyEl = document.getElementById('mergeEmpty');
    const countEl = document.getElementById('mergeCount');
    const mergeBtn = document.getElementById('mergeBtn');

    if (this.mergeQueue.length === 0) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      container.querySelectorAll('.merge-queue-item').forEach(el => el.remove());
      if (countEl) countEl.textContent = '0 videos';
      if (mergeBtn) mergeBtn.disabled = true;
      return;
    }

    if (emptyEl) emptyEl.classList.add('d-none');
    if (countEl) countEl.textContent = `${this.mergeQueue.length} videos`;
    if (mergeBtn) mergeBtn.disabled = this.mergeQueue.length < 2;

    // Remove old items but keep empty state
    container.querySelectorAll('.merge-queue-item').forEach(el => el.remove());

    this.mergeQueue.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'merge-queue-item';
      el.draggable = true;
      el.dataset.index = i;
      el.innerHTML = `
        <div class="drag-handle"><i class="bi bi-grip-vertical"></i></div>
        <div class="queue-thumb">
          ${item.file ? '<i class="bi bi-film fs-16 opacity-20 d-flex align-items-center justify-content-center h-100"></i>' : ''}
        </div>
        <div class="queue-info">
          <div class="queue-name">${this.escapeHtml(item.name)}</div>
          <div class="queue-meta">#${i + 1} in queue</div>
        </div>
        <button class="remove-btn" onclick="VideoForge.removeFromMergeQueue('${item.id}')">
          <i class="bi bi-x-lg"></i>
        </button>
      `;

      // Drag & drop reordering
      el.addEventListener('dragstart', (e) => {
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', i.toString());
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = parseInt(el.dataset.index);
        if (fromIdx !== toIdx) {
          const [moved] = this.mergeQueue.splice(fromIdx, 1);
          this.mergeQueue.splice(toIdx, 0, moved);
          this.renderMergeQueue();
        }
      });

      container.appendChild(el);
    });
  },

  async loadLibraryVideos() {
    try {
      const data = await this.api('/videos');
      const completed = (data.videos || []).filter(v => v.status === 'completed');
      const container = document.getElementById('libraryVideos');
      if (!container) return;

      if (completed.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="opacity-40 fs-14 m0">No completed videos in your library.</p></div>';
        return;
      }

      container.innerHTML = completed.map(v => `
        <div class="col-md-4 col-6">
          <div class="library-item p-10 bg-wrapper border-20" onclick="VideoForge.toggleLibraryItem(this, ${JSON.stringify(v).replace(/"/g, '&quot;')})">
            <div class="lib-check"><i class="bi bi-check"></i></div>
            <div style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;margin-bottom:8px;">
              ${v.thumbnailUrl ? `<img src="${v.thumbnailUrl}" class="w-100 h-100" style="object-fit:cover;">` : ''}
            </div>
            <div class="fs-12 text-white text-truncate">${this.escapeHtml(v.prompt || 'Video')}</div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Load library error:', e);
    }
  },

  toggleLibraryItem(el, video) {
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
      this.addToMergeQueue(video);
    } else {
      // Remove by videoId
      const idx = this.mergeQueue.findIndex(item => item.videoId === video._id);
      if (idx > -1) {
        this.mergeQueue.splice(idx, 1);
        this.renderMergeQueue();
      }
    }
  },

  async mergeVideos() {
    if (this.mergeQueue.length < 2) {
      this.toast('Add at least 2 videos to merge', 'error');
      return;
    }

    const mergeBtn = document.getElementById('mergeBtn');
    const statusEl = document.getElementById('mergeStatus');
    const progressEl = document.getElementById('mergeUploadProgress');
    const statusText = document.getElementById('mergeStatusText');
    const progressBar = document.getElementById('mergeProgressBar');

    mergeBtn.disabled = true;
    mergeBtn.classList.add('btn-loading');
    if (statusEl) statusEl.classList.remove('d-none');

    try {
      const formData = new FormData();

      for (const item of this.mergeQueue) {
        if (item.file) {
          formData.append('videos', item.file);
        } else if (item.videoId) {
          formData.append('videoIds', item.videoId);
        }
      }

      if (progressEl) progressEl.classList.remove('d-none');

      const data = await this.api('/videos/merge', {
        method: 'POST',
        body: formData,
      });

      if (statusText) statusText.textContent = 'Merge complete!';
      if (progressBar) progressBar.style.width = '100%';

      // Show result
      if (data.video && data.video.videoUrl) {
        const resultEl = document.getElementById('mergeResult');
        const mergedVideo = document.getElementById('mergedVideo');
        const downloadLink = document.getElementById('mergeDownload');

        mergedVideo.querySelector('source').src = data.video.videoUrl;
        mergedVideo.load();
        downloadLink.href = data.video.videoUrl;
        resultEl.classList.remove('d-none');
      }

      this.toast('Videos merged successfully!');
    } catch (e) {
      this.toast(e.message, 'error');
      if (statusText) statusText.textContent = 'Merge failed';
    } finally {
      mergeBtn.classList.remove('btn-loading');
      if (progressEl) progressEl.classList.add('d-none');
    }
  },

  // ========== CREDITS PAGE ==========

  async loadCredits() {
    try {
      await this.loadUserCredits();

      // Load transaction history
      const data = await this.api('/credits/transactions').catch(() => ({ transactions: [] }));
      const tbody = document.getElementById('transactionHistory');
      if (!tbody) return;

      const transactions = data.transactions || [];
      if (transactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center opacity-40 py-4">
              <i class="bi bi-clock-history fs-28 d-block mb-10"></i>
              No transactions yet
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = transactions.map(t => `
        <tr>
          <td class="fs-13">${this.formatDate(t.createdAt)}</td>
          <td>
            <span class="status-badge ${t.type === 'purchase' ? 'status-completed' : t.type === 'usage' ? 'status-processing' : 'status-pending'}">
              ${t.type}
            </span>
          </td>
          <td class="fs-13">${this.escapeHtml(t.description || '')}</td>
          <td class="fs-13 fw-500 ${t.amount > 0 ? 'text-success' : 'text-danger'}">
            ${t.amount > 0 ? '+' : ''}${t.amount}
          </td>
          <td class="fs-13 opacity-50">${t.balance || '--'}</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Load credits error:', e);
    }
  },

  async buyCredits(packageType) {
    try {
      const data = await this.api('/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ package: packageType }),
      });

      this.toast(`Successfully purchased credits!`);
      this.loadUserCredits();
      this.loadCredits();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  // ========== ADMIN PANEL ==========

  async loadAdmin() {
    try {
      const data = await this.api('/admin/stats').catch(() => ({}));

      if (data.totalUsers != null) document.getElementById('adminTotalUsers').textContent = data.totalUsers;
      if (data.totalVideos != null) document.getElementById('adminTotalVideos').textContent = data.totalVideos;
      if (data.creditsUsed != null) document.getElementById('adminCreditsUsed').textContent = data.creditsUsed;
      if (data.revenue != null) document.getElementById('adminRevenue').textContent = '$' + (data.revenue || 0);

      // Load users
      const usersData = await this.api('/admin/users').catch(() => ({ users: [] }));
      const usersTable = document.getElementById('adminUsersTable');
      const users = usersData.users || [];

      if (users.length > 0 && usersTable) {
        usersTable.innerHTML = users.slice(0, 10).map(u => `
          <tr>
            <td class="fs-13 fw-500 text-white">${this.escapeHtml(u.name || '')}</td>
            <td class="fs-13">${this.escapeHtml(u.email || '')}</td>
            <td class="fs-13">${u.credits || 0}</td>
            <td class="fs-13">${u.videoCount || 0}</td>
            <td class="fs-13 opacity-50">${this.formatDate(u.createdAt)}</td>
            <td><span class="status-badge ${u.role === 'admin' ? 'status-processing' : 'status-completed'}">${u.role || 'user'}</span></td>
          </tr>
        `).join('');
      }

      // Load recent videos
      const videosData = await this.api('/admin/videos').catch(() => ({ videos: [] }));
      const videosTable = document.getElementById('adminVideosTable');
      const videos = videosData.videos || [];

      if (videos.length > 0 && videosTable) {
        videosTable.innerHTML = videos.slice(0, 10).map(v => `
          <tr>
            <td class="fs-13">${this.escapeHtml(v.userName || v.userId || '')}</td>
            <td class="fs-13" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(v.prompt || '')}</td>
            <td class="fs-13">${v.model || 'kling'}</td>
            <td><span class="status-badge status-${v.status}">${v.status}</span></td>
            <td class="fs-13">${v.creditsCost || '--'}</td>
            <td class="fs-13 opacity-50">${this.formatDate(v.createdAt)}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error('Admin load error:', e);
    }
  },

  adminTab(tab) {
    // Scroll to section
    const section = document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Section`);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  },

  showAddPackageModal() {
    this.toast('Package management coming soon', 'error');
  },

  // ========== UTILITIES ==========

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
};

// ========== AUTH FORM HANDLERS ==========

document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const errorEl = document.getElementById('login-error');
      btn.classList.add('btn-loading');
      errorEl.classList.add('d-none');

      try {
        const formData = new FormData(loginForm);
        const data = await VideoForge.api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
          }),
        });

        VideoForge.token = data.token;
        VideoForge.user = data.user;
        localStorage.setItem('vf_token', data.token);
        localStorage.setItem('vf_user', JSON.stringify(data.user));

        window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('d-none');
      } finally {
        btn.classList.remove('btn-loading');
      }
    });
  }

  // Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('registerBtn');
      const errorEl = document.getElementById('register-error');
      const successEl = document.getElementById('register-success');
      btn.classList.add('btn-loading');
      errorEl.classList.add('d-none');
      successEl.classList.add('d-none');

      try {
        const formData = new FormData(registerForm);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        const data = await VideoForge.api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.get('name'),
            email: formData.get('email'),
            password,
          }),
        });

        if (data.token) {
          VideoForge.token = data.token;
          VideoForge.user = data.user;
          localStorage.setItem('vf_token', data.token);
          localStorage.setItem('vf_user', JSON.stringify(data.user));
          window.location.href = '/dashboard';
        } else {
          successEl.textContent = 'Account created! Redirecting to login...';
          successEl.classList.remove('d-none');
          setTimeout(() => window.location.href = '/login', 2000);
        }
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('d-none');
      } finally {
        btn.classList.remove('btn-loading');
      }
    });
  }

  // Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('open');
      // Create overlay
      let overlay = document.querySelector('.sidebar-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.classList.remove('show');
        });
        document.body.appendChild(overlay);
      }
      overlay.classList.toggle('show');
    });
  }

  // Sticky header
  const mainMenu = document.querySelector('.theme-main-menu');
  if (mainMenu) {
    window.addEventListener('scroll', () => {
      mainMenu.classList.toggle('scrolled', window.scrollY > 50);
    });
  }
});

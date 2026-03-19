/* ============================================
   Video SaaS - Frontend Application
   API client, Auth, CRUD, UI helpers
   ============================================ */

// ------------------------------------
// API Helper
// ------------------------------------
const API = {
  baseURL: '',
  get token() {
    return localStorage.getItem('token');
  },

  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // If body is FormData, remove Content-Type so browser sets boundary
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(this.baseURL + url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  },

  async get(url) {
    return this.fetch(url, { method: 'GET' });
  },

  async post(url, data) {
    const isFormData = data instanceof FormData;
    return this.fetch(url, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  async put(url, data) {
    return this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(url) {
    return this.fetch(url, { method: 'DELETE' });
  },
};

// ------------------------------------
// Auth
// ------------------------------------
const Auth = {
  async login(email, password) {
    const data = await API.post('/api/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    }
    return data;
  },

  async register(name, email, password) {
    const data = await API.post('/api/auth/register', { name, email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    }
    return data;
  },

  async getProfile() {
    return API.get('/api/auth/profile');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  checkAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login';
    }
  },

  getUser() {
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
};

// ------------------------------------
// Videos
// ------------------------------------
const Videos = {
  async generate(data) {
    return API.post('/api/videos/generate', data);
  },

  async list(page = 1, limit = 20) {
    return API.get(`/api/videos?page=${page}&limit=${limit}`);
  },

  async get(id) {
    return API.get(`/api/videos/${id}`);
  },

  async checkStatus(id) {
    return API.get(`/api/videos/${id}/status`);
  },

  async delete(id) {
    return API.delete(`/api/videos/${id}`);
  },

  pollStatus(id, callback, interval = 3000) {
    const poll = async () => {
      try {
        const data = await this.checkStatus(id);
        callback(null, data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(timer);
        }
      } catch (err) {
        callback(err, null);
        clearInterval(timer);
      }
    };
    poll(); // immediate first check
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer); // return cancel function
  },
};

// ------------------------------------
// Merge
// ------------------------------------
const Merge = {
  async submit(formData) {
    return API.post('/api/merge', formData);
  },

  async checkStatus(id) {
    return API.get(`/api/merge/${id}/status`);
  },

  pollStatus(id, callback, interval = 3000) {
    const poll = async () => {
      try {
        const data = await this.checkStatus(id);
        callback(null, data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(timer);
        }
      } catch (err) {
        callback(err, null);
        clearInterval(timer);
      }
    };
    poll();
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  },
};

// ------------------------------------
// Credits
// ------------------------------------
const Credits = {
  async getBalance() {
    return API.get('/api/credits/balance');
  },

  async getPackages() {
    return API.get('/api/credits/packages');
  },

  async purchase(packageId) {
    return API.post('/api/credits/purchase', { packageId });
  },

  async getHistory(page = 1) {
    return API.get(`/api/credits/history?page=${page}`);
  },
};

// ------------------------------------
// Admin
// ------------------------------------
const Admin = {
  async getStats() {
    return API.get('/api/admin/stats');
  },

  async getUsers(page = 1) {
    return API.get(`/api/admin/users?page=${page}`);
  },

  async getVideos(page = 1) {
    return API.get(`/api/admin/videos?page=${page}`);
  },

  async adjustCredits(userId, credits, reason = '') {
    return API.post('/api/admin/credits/adjust', { userId, credits, reason });
  },

  async updateUser(userId, data) {
    return API.put(`/api/admin/users/${userId}`, data);
  },
};

// ------------------------------------
// UI Helpers
// ------------------------------------
const UI = {
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-circle-fill',
      info: 'bi-info-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
      <i class="bi ${icons[type] || icons.info} toast-icon"></i>
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  },

  statusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    return `<span class="status-badge ${s}"><span class="dot"></span>${s}</span>`;
  },

  truncate(text, len = 50) {
    if (!text || text.length <= len) return text || '';
    return text.substring(0, len) + '...';
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  setLoading(btn, loading = true) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || 'Submit';
    }
  },

  confirm(message) {
    return window.confirm(message);
  },
};

// ------------------------------------
// Sidebar credit balance updater
// ------------------------------------
async function updateSidebarCredits() {
  const el = document.getElementById('sidebar-credit-amount');
  if (!el) return;
  try {
    const data = await Credits.getBalance();
    el.textContent = data.credits ?? data.balance ?? 0;
  } catch {
    // silent fail
  }
}

// ------------------------------------
// Sidebar toggle (mobile)
// ------------------------------------
function setupSidebarToggle() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

// ------------------------------------
// Page: Dashboard
// ------------------------------------
async function initDashboard() {
  try {
    const [profile, videos] = await Promise.all([
      Auth.getProfile(),
      Videos.list(1, 5),
    ]);

    // Populate stats
    const statsContainer = document.getElementById('dashboard-stats');
    if (statsContainer && profile) {
      const user = profile.user || profile;
      document.querySelectorAll('[data-stat="credits"]').forEach(el => {
        el.textContent = user.credits ?? 0;
      });
      document.querySelectorAll('[data-stat="totalVideos"]').forEach(el => {
        el.textContent = user.totalVideos ?? 0;
      });
    }

    // Populate recent videos
    const recentContainer = document.getElementById('recent-videos');
    if (recentContainer && videos) {
      const list = videos.videos || videos.data || [];
      if (list.length === 0) {
        recentContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="bi bi-film"></i></div>
            <h5>No videos yet</h5>
            <p>Generate your first AI video to get started.</p>
            <a href="/generate" class="btn btn-gradient">Create Video</a>
          </div>`;
      } else {
        recentContainer.innerHTML = list.map(v => videoCardHTML(v)).join('');
      }
    }
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

function videoCardHTML(video) {
  const thumb = video.thumbnailUrl
    ? `<img src="${video.thumbnailUrl}" alt="">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><i class="bi bi-film" style="font-size:2rem;"></i></div>`;

  return `
    <div class="col-md-6 col-lg-4 animate-slideUp">
      <div class="video-card">
        <div class="video-thumbnail">
          ${thumb}
          ${video.status === 'completed' ? '<div class="play-overlay"><i class="bi bi-play-circle-fill"></i></div>' : ''}
        </div>
        <div class="video-body">
          <div class="video-title">${UI.escapeHtml(video.title || video.prompt || 'Untitled')}</div>
          <div class="video-meta">
            ${UI.statusBadge(video.status)}
            <span>${UI.formatDate(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ------------------------------------
// Page: Generate Video
// ------------------------------------
function initGenerate() {
  const form = document.getElementById('generate-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const result = await Videos.generate(payload);

      UI.showToast('Video generation started!', 'success');

      // Show progress section
      const progressSection = document.getElementById('generation-progress');
      if (progressSection) {
        progressSection.classList.remove('d-none');
        progressSection.innerHTML = `
          <div class="glass-card text-center p-4">
            <div class="processing-spinner mb-3">
              <div class="spinner"></div>
              <span>Processing your video...</span>
            </div>
            <div class="progress-custom mt-3">
              <div class="progress-fill" id="gen-progress-bar" style="width: 0%"></div>
            </div>
            <p class="text-muted-custom mt-2 mb-0" id="gen-status-text">Initializing...</p>
          </div>`;
      }

      const videoId = result.video?.id || result.videoId || result.id;
      if (videoId) {
        Videos.pollStatus(videoId, (err, data) => {
          if (err) {
            UI.showToast('Error checking status', 'error');
            return;
          }
          const bar = document.getElementById('gen-progress-bar');
          const text = document.getElementById('gen-status-text');
          if (data.progress && bar) bar.style.width = data.progress + '%';
          if (text) text.textContent = statusMessage(data.status);

          if (data.status === 'completed') {
            UI.showToast('Video completed!', 'success');
            if (bar) bar.style.width = '100%';
            if (text) {
              text.innerHTML = `Done! <a href="/my-videos" class="text-accent">View your videos</a>`;
            }
            updateSidebarCredits();
          } else if (data.status === 'failed') {
            UI.showToast(data.error || 'Video generation failed', 'error');
            if (text) text.textContent = 'Generation failed. ' + (data.error || '');
          }
        });
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });
}

function statusMessage(status) {
  const messages = {
    pending: 'Queued, waiting to start...',
    processing: 'Generating your video...',
    rendering: 'Rendering final output...',
    completed: 'Complete!',
    failed: 'Failed',
  };
  return messages[status] || status;
}

// ------------------------------------
// Page: My Videos
// ------------------------------------
async function initVideos() {
  const container = document.getElementById('videos-grid');
  if (!container) return;

  container.innerHTML = `<div class="col-12 text-center py-5"><div class="processing-spinner"><div class="spinner"></div><span>Loading videos...</span></div></div>`;

  try {
    const data = await Videos.list();
    const list = data.videos || data.data || [];

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-icon"><i class="bi bi-camera-video"></i></div>
            <h5>No videos yet</h5>
            <p>Start creating AI-generated videos.</p>
            <a href="/generate" class="btn btn-gradient">Generate Video</a>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = list.map(v => videoCardWithActions(v)).join('');

    // Attach delete handlers
    container.querySelectorAll('[data-delete-video]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteVideo;
        if (!UI.confirm('Delete this video? This cannot be undone.')) return;
        try {
          await Videos.delete(id);
          UI.showToast('Video deleted', 'success');
          btn.closest('.col-md-6, .col-lg-4').remove();
        } catch (err) {
          UI.showToast(err.message, 'error');
        }
      });
    });

    // Poll any processing videos
    list.filter(v => v.status === 'processing' || v.status === 'pending').forEach(v => {
      const id = v._id || v.id;
      Videos.pollStatus(id, (err, data) => {
        if (err) return;
        const card = document.querySelector(`[data-video-id="${id}"]`);
        if (!card) return;
        const badgeEl = card.querySelector('.status-badge');
        if (badgeEl) badgeEl.outerHTML = UI.statusBadge(data.status);
        if (data.status === 'completed') {
          UI.showToast('A video has finished processing!', 'success');
        }
      });
    });
  } catch (err) {
    container.innerHTML = '';
    UI.showToast(err.message, 'error');
  }
}

function videoCardWithActions(video) {
  const id = video._id || video.id;
  const thumb = video.thumbnailUrl
    ? `<img src="${video.thumbnailUrl}" alt="">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><i class="bi bi-film" style="font-size:2rem;"></i></div>`;

  const downloadBtn = video.status === 'completed' && video.videoUrl
    ? `<a href="${video.videoUrl}" target="_blank" class="btn-icon" title="Download"><i class="bi bi-download"></i></a>`
    : '';

  return `
    <div class="col-md-6 col-lg-4 animate-slideUp" data-video-id="${id}">
      <div class="video-card">
        <div class="video-thumbnail">
          ${thumb}
          ${video.status === 'completed' ? '<div class="play-overlay"><i class="bi bi-play-circle-fill"></i></div>' : ''}
        </div>
        <div class="video-body">
          <div class="video-title">${UI.escapeHtml(video.title || video.prompt || 'Untitled')}</div>
          <div class="video-meta">
            ${UI.statusBadge(video.status)}
            <span>${UI.formatDate(video.createdAt)}</span>
          </div>
          <div class="d-flex gap-2 mt-2 justify-content-end">
            ${downloadBtn}
            <button class="btn-icon danger" data-delete-video="${id}" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
}

// ------------------------------------
// Page: Merge Videos
// ------------------------------------
function initMerge() {
  const form = document.getElementById('merge-form');
  const dropzone = document.getElementById('merge-dropzone');
  const fileInput = document.getElementById('merge-files');
  const fileList = document.getElementById('merge-file-list');
  let selectedFiles = [];

  if (!form || !dropzone) return;

  // Drag and drop
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    addFiles(files);
  });

  dropzone.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      addFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });
  }

  function addFiles(files) {
    selectedFiles = selectedFiles.concat(files);
    renderFileList();
  }

  function renderFileList() {
    if (!fileList) return;
    if (selectedFiles.length === 0) {
      fileList.innerHTML = '';
      return;
    }
    fileList.innerHTML = selectedFiles.map((f, i) => `
      <div class="d-flex align-items-center justify-content-between p-2 glass-card mb-2" style="padding:12px!important;">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-film text-accent"></i>
          <span class="small">${UI.escapeHtml(f.name)}</span>
          <span class="small text-muted-custom">(${formatFileSize(f.size)})</span>
        </div>
        <button type="button" class="btn-icon danger btn-sm" data-remove="${i}"><i class="bi bi-x"></i></button>
      </div>
    `).join('');

    fileList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt(btn.dataset.remove), 1);
        renderFileList();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedFiles.length < 2) {
      UI.showToast('Please add at least 2 videos to merge.', 'warning');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f, i) => formData.append('videos', f));

      // Add any extra form fields
      const titleInput = form.querySelector('[name="title"]');
      if (titleInput) formData.append('title', titleInput.value);

      const result = await Merge.submit(formData);
      UI.showToast('Merge started!', 'success');

      const mergeId = result.mergeId || result.id;
      if (mergeId) {
        const progressEl = document.getElementById('merge-progress');
        if (progressEl) {
          progressEl.classList.remove('d-none');
          progressEl.innerHTML = `
            <div class="glass-card text-center p-4">
              <div class="processing-spinner mb-3"><div class="spinner"></div><span>Merging videos...</span></div>
              <div class="progress-custom mt-3"><div class="progress-fill" id="merge-bar" style="width:10%"></div></div>
            </div>`;
        }

        Merge.pollStatus(mergeId, (err, data) => {
          if (err) return UI.showToast('Error checking merge status', 'error');
          const bar = document.getElementById('merge-bar');
          if (data.progress && bar) bar.style.width = data.progress + '%';
          if (data.status === 'completed') {
            UI.showToast('Merge completed!', 'success');
            if (bar) bar.style.width = '100%';
            updateSidebarCredits();
          } else if (data.status === 'failed') {
            UI.showToast(data.error || 'Merge failed', 'error');
          }
        });
      }

      selectedFiles = [];
      renderFileList();
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ------------------------------------
// Page: Buy Credits
// ------------------------------------
async function initCredits() {
  // Load balance
  const balanceEl = document.getElementById('credit-balance-number');
  if (balanceEl) {
    try {
      const data = await Credits.getBalance();
      balanceEl.textContent = data.credits ?? data.balance ?? 0;
    } catch { /* silent */ }
  }

  // Load packages
  const packagesContainer = document.getElementById('credit-packages');
  if (packagesContainer) {
    try {
      const data = await Credits.getPackages();
      const packages = data.packages || data || [];
      packagesContainer.innerHTML = packages.map((pkg, i) => pricingCardHTML(pkg, i === 1)).join('');

      packagesContainer.querySelectorAll('[data-purchase]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pkgId = btn.dataset.purchase;
          UI.setLoading(btn, true);
          try {
            const result = await Credits.purchase(pkgId);
            if (result.checkoutUrl || result.url) {
              window.location.href = result.checkoutUrl || result.url;
            } else {
              UI.showToast('Credits added!', 'success');
              updateSidebarCredits();
              if (balanceEl) {
                const updated = await Credits.getBalance();
                balanceEl.textContent = updated.credits ?? updated.balance ?? 0;
              }
            }
          } catch (err) {
            UI.showToast(err.message, 'error');
          } finally {
            UI.setLoading(btn, false);
          }
        });
      });
    } catch (err) {
      UI.showToast('Failed to load packages', 'error');
    }
  }

  // Load history
  const historyTable = document.getElementById('credit-history-body');
  if (historyTable) {
    try {
      const data = await Credits.getHistory();
      const history = data.history || data.transactions || data.data || [];
      if (history.length === 0) {
        historyTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted-custom py-4">No transactions yet</td></tr>`;
      } else {
        historyTable.innerHTML = history.map(tx => `
          <tr>
            <td>${UI.formatDate(tx.createdAt || tx.date)}</td>
            <td>${UI.escapeHtml(tx.description || tx.type || '')}</td>
            <td class="${tx.amount > 0 ? 'text-accent' : ''}">${tx.amount > 0 ? '+' : ''}${tx.amount}</td>
            <td>${tx.balance ?? ''}</td>
          </tr>
        `).join('');
      }
    } catch { /* silent */ }
  }
}

function pricingCardHTML(pkg, featured = false) {
  const id = pkg._id || pkg.id;
  return `
    <div class="col-md-6 col-lg-4 animate-slideUp">
      <div class="pricing-card ${featured ? 'featured' : ''}">
        <div class="pricing-name">${UI.escapeHtml(pkg.name || '')}</div>
        <div class="pricing-credits">${pkg.credits}</div>
        <div class="pricing-credits-label">credits</div>
        <div class="pricing-price">$${(pkg.price / 100).toFixed(2)}</div>
        <button class="btn btn-gradient w-100" data-purchase="${id}">Purchase</button>
      </div>
    </div>`;
}

// ------------------------------------
// Page: Admin
// ------------------------------------
async function initAdmin() {
  // Stats
  try {
    const stats = await Admin.getStats();
    document.querySelectorAll('[data-admin-stat]').forEach(el => {
      const key = el.dataset.adminStat;
      if (stats[key] !== undefined) el.textContent = stats[key];
    });
  } catch (err) {
    UI.showToast('Failed to load admin stats', 'error');
  }

  // Users table
  const usersBody = document.getElementById('admin-users-body');
  if (usersBody) {
    try {
      const data = await Admin.getUsers();
      const users = data.users || data.data || [];
      usersBody.innerHTML = users.map(u => `
        <tr>
          <td>${UI.escapeHtml(u.name || '')}</td>
          <td>${UI.escapeHtml(u.email || '')}</td>
          <td>${u.credits ?? 0}</td>
          <td>${u.role || 'user'}</td>
          <td>${UI.formatDate(u.createdAt)}</td>
          <td>
            <button class="btn-icon" data-adjust-credits="${u._id || u.id}" title="Adjust credits">
              <i class="bi bi-coin"></i>
            </button>
          </td>
        </tr>
      `).join('');

      // Credit adjustment handlers
      usersBody.querySelectorAll('[data-adjust-credits]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.adjustCredits;
          const amount = prompt('Enter credit adjustment (positive to add, negative to deduct):');
          if (amount === null) return;
          const credits = parseInt(amount, 10);
          if (isNaN(credits)) {
            UI.showToast('Invalid number', 'error');
            return;
          }
          const reason = prompt('Reason for adjustment:') || '';
          try {
            await Admin.adjustCredits(userId, credits, reason);
            UI.showToast('Credits adjusted', 'success');
            initAdmin(); // Refresh
          } catch (err) {
            UI.showToast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      UI.showToast('Failed to load users', 'error');
    }
  }

  // Admin videos table
  const videosBody = document.getElementById('admin-videos-body');
  if (videosBody) {
    try {
      const data = await Admin.getVideos();
      const videos = data.videos || data.data || [];
      videosBody.innerHTML = videos.map(v => `
        <tr>
          <td>${UI.escapeHtml(UI.truncate(v.title || v.prompt || 'Untitled', 40))}</td>
          <td>${UI.escapeHtml(v.userName || v.userEmail || '')}</td>
          <td>${UI.statusBadge(v.status)}</td>
          <td>${UI.formatDate(v.createdAt)}</td>
        </tr>
      `).join('');
    } catch { /* silent */ }
  }
}

// ------------------------------------
// Auth Page Handlers
// ------------------------------------
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);

    try {
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;
      await Auth.login(email, password);
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    UI.setLoading(btn, true);

    try {
      const name = form.querySelector('[name="name"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;
      const confirmPassword = form.querySelector('[name="confirmPassword"]');

      if (confirmPassword && password !== confirmPassword.value) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      await Auth.register(name, email, password);
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });
}

// ------------------------------------
// Logout handler
// ------------------------------------
function setupLogout() {
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });
}

// ------------------------------------
// Active sidebar link
// ------------------------------------
function setActiveSidebarLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });
}

// ------------------------------------
// Populate user info in sidebar
// ------------------------------------
function populateUserInfo() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.querySelector('.sidebar-footer .user-name');
  const emailEl = document.querySelector('.sidebar-footer .user-email');
  const avatarEl = document.querySelector('.sidebar-footer .user-avatar');

  if (nameEl) nameEl.textContent = user.name || '';
  if (emailEl) emailEl.textContent = user.email || '';
  if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
}

// ------------------------------------
// DOMContentLoaded - Router
// ------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Auth pages (no auth check needed)
  if (path === '/login' || path === '/login.html') {
    initLoginPage();
    return;
  }
  if (path === '/register' || path === '/register.html') {
    initRegisterPage();
    return;
  }

  // All dashboard pages
  const dashboardPages = ['/dashboard', '/generate', '/my-videos', '/merge', '/buy-credits', '/admin'];
  const isDashboard = dashboardPages.some(p => path.startsWith(p));

  if (isDashboard) {
    Auth.checkAuth();
    setupSidebarToggle();
    setActiveSidebarLink();
    populateUserInfo();
    setupLogout();
    updateSidebarCredits();
  }

  // Page-specific init
  if (path === '/dashboard' || path === '/dashboard.html') initDashboard();
  if (path === '/generate' || path === '/generate.html') initGenerate();
  if (path === '/my-videos' || path === '/my-videos.html') initVideos();
  if (path === '/merge' || path === '/merge.html') initMerge();
  if (path === '/buy-credits' || path === '/buy-credits.html') initCredits();
  if (path === '/admin' || path === '/admin.html') initAdmin();
});

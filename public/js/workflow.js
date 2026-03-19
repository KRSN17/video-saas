/**
 * WorkflowCanvas - A complete drag-and-drop node-based workflow editor
 * Inspired by Weavy.ai's visual node editor. Pure vanilla JS.
 */

// ---------------------------------------------------------------------------
// Node type definitions
// ---------------------------------------------------------------------------
const NODE_TYPES = {
  'prompt': {
    color: '#9b59b6', label: 'Prompt', category: 'text',
    inputs: [],
    outputs: [{ name: 'text', type: 'text' }],
    params: [{ name: 'text', type: 'textarea', placeholder: 'Enter your prompt...' }]
  },
  'prompt-enhancer': {
    color: '#8e44ad', label: 'Prompt Enhancer', category: 'text',
    inputs: [{ name: 'text', type: 'text' }],
    outputs: [{ name: 'enhanced', type: 'text' }],
    params: [{ name: 'style', type: 'select', options: ['Cinematic', 'Anime', 'Realistic', 'Abstract'] }]
  },
  'image-input': {
    color: '#27ae60', label: 'Image Input', category: 'image',
    inputs: [],
    outputs: [{ name: 'image', type: 'image' }],
    params: [{ name: 'url', type: 'text', placeholder: 'Image URL or upload' }]
  },
  'text-to-video': {
    color: '#e74c3c', label: 'Text to Video', category: 'video', aiNode: true,
    inputs: [{ name: 'prompt', type: 'text' }],
    outputs: [{ name: 'video', type: 'video' }],
    params: [
      { name: 'model', type: 'select', options: ['kling-text', 'minimax-text', 'wan-text', 'luma-ray2', 'hunyuan', 'ltx-video', 'veo2'] },
      { name: 'duration', type: 'select', options: ['5', '10'] },
      { name: 'aspect_ratio', type: 'select', options: ['16:9', '9:16', '1:1'] }
    ]
  },
  'image-to-video': {
    color: '#e74c3c', label: 'Image to Video', category: 'video', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'video', type: 'video' }],
    params: [
      { name: 'model', type: 'select', options: ['kling-image', 'runway-gen4'] },
      { name: 'duration', type: 'select', options: ['5', '10'] }
    ]
  },
  'video-merge': {
    color: '#3498db', label: 'Merge Videos', category: 'utility',
    inputs: [{ name: 'video_a', type: 'video' }, { name: 'video_b', type: 'video' }],
    outputs: [{ name: 'merged', type: 'video' }],
    params: []
  },
  'video-output': {
    color: '#1abc9c', label: 'Output / Download', category: 'output',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [],
    params: [{ name: 'filename', type: 'text', placeholder: 'output.mp4' }]
  }
};

const TYPE_COLORS = {
  text: '#9b59b6',
  image: '#27ae60',
  video: '#e74c3c'
};

const CATEGORIES = {
  text: { label: 'Text', types: ['prompt', 'prompt-enhancer'] },
  image: { label: 'Image', types: ['image-input'] },
  video: { label: 'Video AI', types: ['text-to-video', 'image-to-video'] },
  utility: { label: 'Utility', types: ['video-merge'] },
  output: { label: 'Output', types: ['video-output'] }
};

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------
class WorkflowCanvas {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.nodes = new Map();
    this.connections = [];
    this.selectedNodes = new Set();
    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    this.dragging = null;
    this.dragOffset = { x: 0, y: 0 };
    this.connecting = null;
    this.panning = false;
    this.panStart = { x: 0, y: 0 };
    this.nextId = 1;
    this.spaceHeld = false;
    this.undoStack = [];
    this.redoStack = [];
    this.nodePicker = null;
    this.contextMenu = null;
    this.hoveredPort = null;
    this.tempConnectionLine = null;

    this._init();
  }

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------
  _init() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.background = '#0a0a14';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.userSelect = 'none';
    this.container.style.cursor = 'default';
    this.container.tabIndex = 0;

    // Grid canvas (background)
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    this.container.appendChild(this.gridCanvas);

    // SVG layer for connections
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;transform-origin:0 0;';
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.container.appendChild(this.svg);

    // Defs for glow filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    ['#9b59b6', '#27ae60', '#e74c3c'].forEach((c, i) => {
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.id = `glow-${['text','image','video'][i]}`;
      filter.innerHTML = `<feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
      defs.appendChild(filter);
    });
    this.svg.appendChild(defs);

    // Connection group
    this.connectionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.connectionGroup);

    // Temp connection line
    this.tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempConnectionLine.setAttribute('fill', 'none');
    this.tempConnectionLine.setAttribute('stroke-width', '2');
    this.tempConnectionLine.setAttribute('stroke-dasharray', '6 3');
    this.tempConnectionLine.style.display = 'none';
    this.svg.appendChild(this.tempConnectionLine);

    // Node layer
    this.nodeLayer = document.createElement('div');
    this.nodeLayer.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;';
    this.container.appendChild(this.nodeLayer);

    // Minimap
    this._createMinimap();

    // Inject stylesheet
    this._injectStyles();

    // Events
    this._bindEvents();

    // Initial draws
    this._onResize();
    window.addEventListener('resize', () => this._onResize());
  }

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------
  _injectStyles() {
    if (document.getElementById('wf-styles')) return;
    const style = document.createElement('style');
    style.id = 'wf-styles';
    style.textContent = `
      .wf-node {
        position: absolute;
        width: 220px;
        background: rgba(20, 20, 35, 0.92);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 12px;
        color: #ccc;
        transition: box-shadow 0.15s;
        cursor: grab;
      }
      .wf-node:active { cursor: grabbing; }
      .wf-node.selected {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.5), 0 4px 24px rgba(0,0,0,0.5);
      }
      .wf-node-header {
        height: 32px;
        border-radius: 10px 10px 0 0;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 6px;
        font-weight: 600;
        font-size: 12px;
        color: #fff;
      }
      .wf-node-header .wf-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .wf-run-btn {
        width: 22px; height: 22px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.18);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        transition: background 0.15s;
      }
      .wf-run-btn:hover { background: rgba(255,255,255,0.35); }
      .wf-run-btn.running { animation: wf-spin 0.8s linear infinite; }
      @keyframes wf-spin { to { transform: rotate(360deg); } }
      .wf-node-body { padding: 8px 10px; }
      .wf-ports { display: flex; flex-direction: column; gap: 6px; }
      .wf-port-row {
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
        height: 18px;
      }
      .wf-port-row.input { justify-content: flex-start; }
      .wf-port-row.output { justify-content: flex-end; }
      .wf-port {
        width: 12px; height: 12px;
        border-radius: 50%;
        border: 2px solid;
        background: #0a0a14;
        cursor: crosshair;
        position: absolute;
        transition: box-shadow 0.15s, transform 0.15s;
        z-index: 2;
        pointer-events: all;
      }
      .wf-port.input-port { left: -17px; }
      .wf-port.output-port { right: -17px; }
      .wf-port:hover, .wf-port.highlight {
        transform: scale(1.4);
        box-shadow: 0 0 8px currentColor;
      }
      .wf-port-label { font-size: 11px; color: #999; }
      .wf-port-row.output .wf-port-label { text-align: right; flex: 1; }
      .wf-port-row.input .wf-port-label { text-align: left; flex: 1; }
      .wf-params { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
      .wf-params label { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
      .wf-params input, .wf-params select, .wf-params textarea {
        width: 100%;
        box-sizing: border-box;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: #ddd;
        padding: 4px 6px;
        font-size: 11px;
        font-family: inherit;
        outline: none;
        resize: vertical;
      }
      .wf-params textarea { min-height: 48px; }
      .wf-params input:focus, .wf-params select:focus, .wf-params textarea:focus {
        border-color: rgba(59,130,246,0.5);
      }
      .wf-node-picker {
        position: absolute;
        width: 240px;
        background: rgba(20,20,35,0.96);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        z-index: 1000;
        font-family: 'Inter', -apple-system, sans-serif;
        overflow: hidden;
        backdrop-filter: blur(16px);
      }
      .wf-node-picker input {
        width: 100%; box-sizing: border-box;
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        color: #ddd;
        padding: 10px 12px;
        font-size: 13px;
        outline: none;
      }
      .wf-node-picker-list { max-height: 260px; overflow-y: auto; padding: 4px 0; }
      .wf-node-picker-item {
        padding: 7px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #ccc;
      }
      .wf-node-picker-item:hover { background: rgba(255,255,255,0.06); }
      .wf-node-picker-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .wf-node-picker-cat {
        padding: 6px 12px 3px;
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .wf-ctx-menu {
        position: absolute;
        min-width: 160px;
        background: rgba(20,20,35,0.96);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        z-index: 1000;
        padding: 4px 0;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      .wf-ctx-item {
        padding: 7px 14px;
        font-size: 12px;
        color: #ccc;
        cursor: pointer;
      }
      .wf-ctx-item:hover { background: rgba(255,255,255,0.06); }
      .wf-ctx-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
      .wf-minimap {
        position: absolute;
        bottom: 16px; right: 16px;
        width: 180px; height: 120px;
        background: rgba(10,10,20,0.85);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        overflow: hidden;
        z-index: 100;
      }
      .wf-minimap canvas { width: 100%; height: 100%; }
      .wf-connection-path {
        pointer-events: stroke;
        cursor: pointer;
        transition: stroke-width 0.12s;
      }
      .wf-connection-path:hover { stroke-width: 4px !important; }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------------------------------------------------
  // Minimap
  // -----------------------------------------------------------------------
  _createMinimap() {
    this.minimapEl = document.createElement('div');
    this.minimapEl.className = 'wf-minimap';
    this.minimapCanvas = document.createElement('canvas');
    this.minimapEl.appendChild(this.minimapCanvas);
    this.container.appendChild(this.minimapEl);
  }

  _drawMinimap() {
    const mc = this.minimapCanvas;
    const rect = this.minimapEl.getBoundingClientRect();
    mc.width = rect.width * 2;
    mc.height = rect.height * 2;
    const ctx = mc.getContext('2d');
    ctx.clearRect(0, 0, mc.width, mc.height);

    if (this.nodes.size === 0) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 220);
      maxY = Math.max(maxY, n.y + 120);
    });

    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const scaleX = mc.width / (maxX - minX);
    const scaleY = mc.height / (maxY - minY);
    const s = Math.min(scaleX, scaleY);

    const ox = (mc.width - (maxX - minX) * s) / 2;
    const oy = (mc.height - (maxY - minY) * s) / 2;

    // Draw connections
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    this.connections.forEach(c => {
      const fn = this.nodes.get(c.fromNode);
      const tn = this.nodes.get(c.toNode);
      if (!fn || !tn) return;
      const x1 = ox + (fn.x + 220 - minX) * s;
      const y1 = oy + (fn.y + 40 - minY) * s;
      const x2 = ox + (tn.x - minX) * s;
      const y2 = oy + (tn.y + 40 - minY) * s;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw nodes
    this.nodes.forEach(n => {
      const def = NODE_TYPES[n.type];
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(
        ox + (n.x - minX) * s,
        oy + (n.y - minY) * s,
        220 * s,
        Math.max(60, 32 + n.inputs.length * 24 + n.outputs.length * 24) * s
      );
    });
    ctx.globalAlpha = 1;

    // Viewport rectangle
    const cr = this.container.getBoundingClientRect();
    const vx = ox + (-this.pan.x / this.zoom - minX) * s;
    const vy = oy + (-this.pan.y / this.zoom - minY) * s;
    const vw = (cr.width / this.zoom) * s;
    const vh = (cr.height / this.zoom) * s;
    ctx.strokeStyle = 'rgba(59,130,246,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, vw, vh);
  }

  // -----------------------------------------------------------------------
  // Grid drawing
  // -----------------------------------------------------------------------
  _drawGrid() {
    const c = this.gridCanvas;
    const cr = this.container.getBoundingClientRect();
    c.width = cr.width * devicePixelRatio;
    c.height = cr.height * devicePixelRatio;
    const ctx = c.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, cr.width, cr.height);

    const spacing = 24 * this.zoom;
    const dotSize = Math.max(1, 1.2 * this.zoom);
    const offsetX = (this.pan.x % (24 * this.zoom));
    const offsetY = (this.pan.y % (24 * this.zoom));

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = offsetX; x < cr.width; x += spacing) {
      for (let y = offsetY; y < cr.height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Larger grid dots every 5
    const lgSpacing = spacing * 5;
    const lgOffsetX = (this.pan.x % (120 * this.zoom));
    const lgOffsetY = (this.pan.y % (120 * this.zoom));
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let x = lgOffsetX; x < cr.width; x += lgSpacing) {
      for (let y = lgOffsetY; y < cr.height; y += lgSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _onResize() {
    this._drawGrid();
    this._updateTransform();
    this.render();
  }

  _updateTransform() {
    this.nodeLayer.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.svg.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  // -----------------------------------------------------------------------
  // Screen <-> Canvas coordinate helpers
  // -----------------------------------------------------------------------
  _screenToCanvas(sx, sy) {
    const cr = this.container.getBoundingClientRect();
    return {
      x: (sx - cr.left - this.pan.x) / this.zoom,
      y: (sy - cr.top - this.pan.y) / this.zoom
    };
  }

  _canvasToScreen(cx, cy) {
    const cr = this.container.getBoundingClientRect();
    return {
      x: cx * this.zoom + this.pan.x + cr.left,
      y: cy * this.zoom + this.pan.y + cr.top
    };
  }

  // -----------------------------------------------------------------------
  // Event binding
  // -----------------------------------------------------------------------
  _bindEvents() {
    const el = this.container;

    // --- Mouse down ---
    el.addEventListener('mousedown', (e) => {
      this._closeMenus();
      if (e.target.closest('.wf-node-picker') || e.target.closest('.wf-ctx-menu')) return;

      // Middle mouse or space held -> pan
      if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
        this.panning = true;
        this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        el.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }

      // Click on empty canvas -> deselect
      if (e.button === 0 && e.target === el || e.target === this.gridCanvas || e.target === this.svg || e.target === this.nodeLayer) {
        this.selectedNodes.clear();
        this._updateSelectionVisuals();
      }
    });

    // --- Mouse move ---
    window.addEventListener('mousemove', (e) => {
      if (this.panning) {
        this.pan.x = e.clientX - this.panStart.x;
        this.pan.y = e.clientY - this.panStart.y;
        this._updateTransform();
        this._drawGrid();
        this._drawMinimap();
        return;
      }

      if (this.dragging) {
        const pos = this._screenToCanvas(e.clientX, e.clientY);
        const node = this.nodes.get(this.dragging);
        if (node) {
          node.x = pos.x - this.dragOffset.x;
          node.y = pos.y - this.dragOffset.y;
          node.el.style.left = node.x + 'px';
          node.el.style.top = node.y + 'px';
          this.render();
        }
        return;
      }

      if (this.connecting) {
        const pos = this._screenToCanvas(e.clientX, e.clientY);
        this._drawTempConnection(pos.x, pos.y);
        this._highlightCompatiblePorts(this.connecting);
        // Check hover on ports
        this._checkPortHover(e.clientX, e.clientY);
        return;
      }
    });

    // --- Mouse up ---
    window.addEventListener('mouseup', (e) => {
      if (this.panning) {
        this.panning = false;
        el.style.cursor = this.spaceHeld ? 'grab' : 'default';
        return;
      }

      if (this.dragging) {
        this.dragging = null;
        return;
      }

      if (this.connecting) {
        // Check if we're over a compatible port
        const target = this._findPortAtScreen(e.clientX, e.clientY);
        if (target && this._canConnect(this.connecting, target)) {
          this._pushUndo();
          this.connections.push({
            fromNode: this.connecting.direction === 'output' ? this.connecting.nodeId : target.nodeId,
            fromPort: this.connecting.direction === 'output' ? this.connecting.portName : target.portName,
            toNode: this.connecting.direction === 'output' ? target.nodeId : this.connecting.nodeId,
            toPort: this.connecting.direction === 'output' ? target.portName : this.connecting.portName,
            type: this.connecting.portType
          });
        }
        this.connecting = null;
        this.tempConnectionLine.style.display = 'none';
        this._clearPortHighlights();
        this.render();
        return;
      }
    });

    // --- Wheel / zoom ---
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.25, Math.min(3, this.zoom + delta * this.zoom));
      const cr = this.container.getBoundingClientRect();
      const mx = e.clientX - cr.left;
      const my = e.clientY - cr.top;

      // Zoom centered on cursor
      this.pan.x = mx - (mx - this.pan.x) * (newZoom / this.zoom);
      this.pan.y = my - (my - this.pan.y) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this._updateTransform();
      this._drawGrid();
      this._drawMinimap();
      this.render();
    }, { passive: false });

    // --- Double click -> node picker ---
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.wf-node')) return;
      const pos = this._screenToCanvas(e.clientX, e.clientY);
      this._showNodePicker(e.clientX, e.clientY, pos.x, pos.y);
    });

    // --- Right click -> context menu ---
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (e.target.closest('.wf-node')) return;
      const pos = this._screenToCanvas(e.clientX, e.clientY);
      this._showContextMenu(e.clientX, e.clientY, pos.x, pos.y);
    });

    // --- Keyboard ---
    el.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.matches('input,textarea,select')) {
        e.preventDefault();
        this.spaceHeld = true;
        el.style.cursor = 'grab';
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (e.target.matches('input,textarea,select')) return;
        this._pushUndo();
        this.selectedNodes.forEach(id => this.removeNode(id));
        this.selectedNodes.clear();
      }
      if (e.code === 'KeyA' && (e.ctrlKey || e.metaKey)) {
        if (e.target.matches('input,textarea,select')) return;
        e.preventDefault();
        this.selectedNodes.clear();
        this.nodes.forEach((_, id) => this.selectedNodes.add(id));
        this._updateSelectionVisuals();
      }
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) this._redo(); else this._undo();
      }
    });

    el.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceHeld = false;
        if (!this.panning) el.style.cursor = 'default';
      }
    });

    // Clicking on SVG connection paths
    this.svg.addEventListener('click', (e) => {
      const path = e.target.closest('.wf-connection-path');
      if (path) {
        const idx = parseInt(path.dataset.idx, 10);
        if (!isNaN(idx)) {
          this._pushUndo();
          this.disconnect(idx);
        }
      }
    });
    // Allow pointer events on paths
    this.svg.style.pointerEvents = 'none';
    this.connectionGroup.style.pointerEvents = 'all';
  }

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------
  _pushUndo() {
    this.undoStack.push(this._snapshot());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  _snapshot() {
    const nodesArr = [];
    this.nodes.forEach((n, id) => {
      nodesArr.push({ id, type: n.type, x: n.x, y: n.y, values: { ...n.values } });
    });
    return {
      nodes: nodesArr,
      connections: this.connections.map(c => ({ ...c })),
      nextId: this.nextId
    };
  }

  _restoreSnapshot(snap) {
    // Remove existing node elements
    this.nodes.forEach(n => { if (n.el && n.el.parentNode) n.el.parentNode.removeChild(n.el); });
    this.nodes.clear();
    this.selectedNodes.clear();

    snap.nodes.forEach(nd => {
      this.nextId = Math.max(this.nextId, nd.id + 1);
      this._createNodeInternal(nd.id, nd.type, nd.x, nd.y, nd.values);
    });
    this.connections = snap.connections.map(c => ({ ...c }));
    this.nextId = snap.nextId;
    this.render();
  }

  _undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this._snapshot());
    this._restoreSnapshot(this.undoStack.pop());
  }

  _redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this._snapshot());
    this._restoreSnapshot(this.redoStack.pop());
  }

  // -----------------------------------------------------------------------
  // Node creation
  // -----------------------------------------------------------------------
  addNode(type, x, y) {
    if (!NODE_TYPES[type]) throw new Error(`Unknown node type: ${type}`);
    this._pushUndo();
    const id = this.nextId++;
    this._createNodeInternal(id, type, x, y, {});
    this.render();
    return id;
  }

  _createNodeInternal(id, type, x, y, values) {
    const def = NODE_TYPES[type];
    const el = document.createElement('div');
    el.className = 'wf-node';
    el.dataset.nodeId = id;
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    // Header
    const header = document.createElement('div');
    header.className = 'wf-node-header';
    header.style.background = def.color;

    const title = document.createElement('span');
    title.className = 'wf-title';
    title.textContent = def.label;
    header.appendChild(title);

    if (def.aiNode) {
      const runBtn = document.createElement('button');
      runBtn.className = 'wf-run-btn';
      runBtn.innerHTML = '&#9654;';
      runBtn.title = 'Run this node';
      runBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.runNode(id);
      });
      header.appendChild(runBtn);
    }

    el.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'wf-node-body';

    // Input ports
    if (def.inputs.length > 0) {
      const portsDiv = document.createElement('div');
      portsDiv.className = 'wf-ports';
      def.inputs.forEach(inp => {
        const row = document.createElement('div');
        row.className = 'wf-port-row input';
        const port = document.createElement('div');
        port.className = 'wf-port input-port';
        port.style.borderColor = TYPE_COLORS[inp.type] || '#888';
        port.style.color = TYPE_COLORS[inp.type] || '#888';
        port.dataset.nodeId = id;
        port.dataset.portName = inp.name;
        port.dataset.portType = inp.type;
        port.dataset.direction = 'input';
        this._bindPortEvents(port);
        row.appendChild(port);
        const label = document.createElement('span');
        label.className = 'wf-port-label';
        label.textContent = inp.name;
        row.appendChild(label);
        portsDiv.appendChild(row);
      });
      body.appendChild(portsDiv);
    }

    // Output ports
    if (def.outputs.length > 0) {
      const portsDiv = document.createElement('div');
      portsDiv.className = 'wf-ports';
      def.outputs.forEach(out => {
        const row = document.createElement('div');
        row.className = 'wf-port-row output';
        const label = document.createElement('span');
        label.className = 'wf-port-label';
        label.textContent = out.name;
        row.appendChild(label);
        const port = document.createElement('div');
        port.className = 'wf-port output-port';
        port.style.borderColor = TYPE_COLORS[out.type] || '#888';
        port.style.color = TYPE_COLORS[out.type] || '#888';
        port.dataset.nodeId = id;
        port.dataset.portName = out.name;
        port.dataset.portType = out.type;
        port.dataset.direction = 'output';
        this._bindPortEvents(port);
        row.appendChild(port);
        portsDiv.appendChild(row);
      });
      body.appendChild(portsDiv);
    }

    // Params
    const paramValues = values || {};
    if (def.params.length > 0) {
      const paramsDiv = document.createElement('div');
      paramsDiv.className = 'wf-params';
      def.params.forEach(p => {
        const label = document.createElement('label');
        label.textContent = p.name;
        paramsDiv.appendChild(label);

        let input;
        if (p.type === 'textarea') {
          input = document.createElement('textarea');
          input.placeholder = p.placeholder || '';
          input.value = paramValues[p.name] || '';
        } else if (p.type === 'select') {
          input = document.createElement('select');
          (p.options || []).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            input.appendChild(o);
          });
          input.value = paramValues[p.name] || (p.options && p.options[0]) || '';
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.placeholder = p.placeholder || '';
          input.value = paramValues[p.name] || '';
        }

        input.dataset.paramName = p.name;
        input.addEventListener('input', () => {
          const node = this.nodes.get(id);
          if (node) node.values[p.name] = input.value;
        });
        // Prevent node drag when interacting with inputs
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        paramsDiv.appendChild(input);
      });
      body.appendChild(paramsDiv);
    }

    el.appendChild(body);

    // Node drag
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.wf-run-btn')) return;
      e.stopPropagation();
      const pos = this._screenToCanvas(e.clientX, e.clientY);
      this.dragging = id;
      const node = this.nodes.get(id);
      this.dragOffset = { x: pos.x - node.x, y: pos.y - node.y };

      // Selection
      if (!e.shiftKey && !this.selectedNodes.has(id)) {
        this.selectedNodes.clear();
      }
      this.selectedNodes.add(id);
      this._updateSelectionVisuals();
    });

    // Click to select
    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.wf-port') || e.target.matches('input,textarea,select')) return;
      if (e.target.closest('.wf-run-btn')) return;
      const pos = this._screenToCanvas(e.clientX, e.clientY);
      this.dragging = id;
      const node = this.nodes.get(id);
      this.dragOffset = { x: pos.x - node.x, y: pos.y - node.y };

      if (!e.shiftKey && !this.selectedNodes.has(id)) {
        this.selectedNodes.clear();
      }
      this.selectedNodes.add(id);
      this._updateSelectionVisuals();
    });

    this.nodeLayer.appendChild(el);

    // Init param values
    const initValues = {};
    def.params.forEach(p => {
      initValues[p.name] = paramValues[p.name] || (p.type === 'select' && p.options ? p.options[0] : '');
    });

    this.nodes.set(id, {
      id, type, x, y, el,
      inputs: def.inputs,
      outputs: def.outputs,
      values: { ...initValues, ...paramValues }
    });
  }

  // -----------------------------------------------------------------------
  // Port events
  // -----------------------------------------------------------------------
  _bindPortEvents(portEl) {
    portEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.connecting = {
        nodeId: parseInt(portEl.dataset.nodeId, 10),
        portName: portEl.dataset.portName,
        portType: portEl.dataset.portType,
        direction: portEl.dataset.direction,
        el: portEl
      };
      this.tempConnectionLine.setAttribute('stroke', TYPE_COLORS[portEl.dataset.portType] || '#888');
      this.tempConnectionLine.style.display = 'block';
    });
  }

  _getPortPosition(nodeId, portName, direction) {
    const node = this.nodes.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    const portEl = node.el.querySelector(
      `.wf-port[data-node-id="${nodeId}"][data-port-name="${portName}"][data-direction="${direction}"]`
    );
    if (!portEl) return { x: node.x, y: node.y };

    // Get port offset relative to the node element (unaffected by zoom/pan)
    const nodeRect = node.el.getBoundingClientRect();
    const portRect = portEl.getBoundingClientRect();

    // Both rects are in screen space (already scaled by zoom),
    // so the difference gives screen-pixel offset within the node.
    // Divide by zoom to get canvas-space offset.
    const offsetX = (portRect.left + portRect.width / 2 - nodeRect.left) / this.zoom;
    const offsetY = (portRect.top + portRect.height / 2 - nodeRect.top) / this.zoom;

    return { x: node.x + offsetX, y: node.y + offsetY };
  }

  _drawTempConnection(mx, my) {
    const from = this._getPortPosition(
      this.connecting.nodeId,
      this.connecting.portName,
      this.connecting.direction
    );

    let x1, y1, x2, y2;
    if (this.connecting.direction === 'output') {
      x1 = from.x; y1 = from.y; x2 = mx; y2 = my;
    } else {
      x1 = mx; y1 = my; x2 = from.x; y2 = from.y;
    }

    const dx = Math.abs(x2 - x1) * 0.5;
    const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    this.tempConnectionLine.setAttribute('d', d);
  }

  _findPortAtScreen(sx, sy) {
    const els = document.elementsFromPoint(sx, sy);
    for (const e of els) {
      if (e.classList && e.classList.contains('wf-port')) {
        return {
          nodeId: parseInt(e.dataset.nodeId, 10),
          portName: e.dataset.portName,
          portType: e.dataset.portType,
          direction: e.dataset.direction,
          el: e
        };
      }
    }
    return null;
  }

  _canConnect(a, b) {
    // Must be different directions
    if (a.direction === b.direction) return false;
    // Must be same type
    if (a.portType !== b.portType) return false;
    // Must be different nodes
    if (a.nodeId === b.nodeId) return false;
    // Check if input already has a connection
    const inputSide = a.direction === 'input' ? a : b;
    const existing = this.connections.find(
      c => c.toNode === inputSide.nodeId && c.toPort === inputSide.portName
    );
    if (existing) return false;
    return true;
  }

  _highlightCompatiblePorts(source) {
    this.nodes.forEach(node => {
      node.el.querySelectorAll('.wf-port').forEach(portEl => {
        const target = {
          nodeId: parseInt(portEl.dataset.nodeId, 10),
          portName: portEl.dataset.portName,
          portType: portEl.dataset.portType,
          direction: portEl.dataset.direction
        };
        if (this._canConnect(source, target)) {
          portEl.classList.add('highlight');
        } else {
          portEl.classList.remove('highlight');
        }
      });
    });
  }

  _clearPortHighlights() {
    this.container.querySelectorAll('.wf-port.highlight').forEach(p => p.classList.remove('highlight'));
  }

  _checkPortHover(sx, sy) {
    const port = this._findPortAtScreen(sx, sy);
    this.hoveredPort = port;
  }

  // -----------------------------------------------------------------------
  // Node operations
  // -----------------------------------------------------------------------
  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    if (node.el && node.el.parentNode) node.el.parentNode.removeChild(node.el);
    this.nodes.delete(id);
    // Remove related connections
    this.connections = this.connections.filter(
      c => c.fromNode !== id && c.toNode !== id
    );
    this.selectedNodes.delete(id);
    this.render();
  }

  connect(fromNodeId, fromPort, toNodeId, toPort) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) return;

    const outDef = fromNode.outputs.find(o => o.name === fromPort);
    const inDef = toNode.inputs.find(i => i.name === toPort);
    if (!outDef || !inDef) return;
    if (outDef.type !== inDef.type) return;

    // Check duplicate
    const dup = this.connections.find(
      c => c.fromNode === fromNodeId && c.fromPort === fromPort &&
           c.toNode === toNodeId && c.toPort === toPort
    );
    if (dup) return;

    this._pushUndo();
    this.connections.push({
      fromNode: fromNodeId,
      fromPort,
      toNode: toNodeId,
      toPort,
      type: outDef.type
    });
    this.render();
  }

  disconnect(connectionIndex) {
    if (connectionIndex >= 0 && connectionIndex < this.connections.length) {
      this.connections.splice(connectionIndex, 1);
      this.render();
    }
  }

  getNodeData(id) {
    const node = this.nodes.get(id);
    if (!node) return null;
    return {
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      values: { ...node.values },
      inputs: node.inputs,
      outputs: node.outputs
    };
  }

  _updateSelectionVisuals() {
    this.nodes.forEach((node, id) => {
      if (this.selectedNodes.has(id)) {
        node.el.classList.add('selected');
      } else {
        node.el.classList.remove('selected');
      }
    });
  }

  // -----------------------------------------------------------------------
  // Connection rendering
  // -----------------------------------------------------------------------
  render() {
    // Clear existing connections
    while (this.connectionGroup.firstChild) {
      this.connectionGroup.removeChild(this.connectionGroup.firstChild);
    }

    this.connections.forEach((conn, idx) => {
      const from = this._getPortPosition(conn.fromNode, conn.fromPort, 'output');
      const to = this._getPortPosition(conn.toNode, conn.toPort, 'input');

      const dx = Math.abs(to.x - from.x) * 0.5;
      const d = `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', TYPE_COLORS[conn.type] || '#888');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.classList.add('wf-connection-path');
      path.dataset.idx = idx;

      // Animated dash for AI connections
      if (conn.type === 'video') {
        path.setAttribute('stroke-dasharray', '8 4');
        path.innerHTML = `<animate attributeName="stroke-dashoffset" values="0;-24" dur="1.5s" repeatCount="indefinite"/>`;
      }

      this.connectionGroup.appendChild(path);
    });

    this._drawMinimap();
  }

  // -----------------------------------------------------------------------
  // Node picker (double-click)
  // -----------------------------------------------------------------------
  _showNodePicker(screenX, screenY, canvasX, canvasY) {
    this._closeMenus();

    const picker = document.createElement('div');
    picker.className = 'wf-node-picker';
    picker.style.left = screenX + 'px';
    picker.style.top = screenY + 'px';

    const input = document.createElement('input');
    input.placeholder = 'Search nodes...';
    picker.appendChild(input);

    const list = document.createElement('div');
    list.className = 'wf-node-picker-list';
    picker.appendChild(list);

    const renderItems = (filter) => {
      list.innerHTML = '';
      const lf = (filter || '').toLowerCase();
      Object.entries(CATEGORIES).forEach(([catKey, cat]) => {
        const matchingTypes = cat.types.filter(t => {
          const def = NODE_TYPES[t];
          return !lf || def.label.toLowerCase().includes(lf) || t.includes(lf);
        });
        if (matchingTypes.length === 0) return;

        const catLabel = document.createElement('div');
        catLabel.className = 'wf-node-picker-cat';
        catLabel.textContent = cat.label;
        list.appendChild(catLabel);

        matchingTypes.forEach(t => {
          const def = NODE_TYPES[t];
          const item = document.createElement('div');
          item.className = 'wf-node-picker-item';

          const dot = document.createElement('div');
          dot.className = 'wf-node-picker-dot';
          dot.style.background = def.color;
          item.appendChild(dot);

          const name = document.createElement('span');
          name.textContent = def.label;
          item.appendChild(name);

          item.addEventListener('click', () => {
            this.addNode(t, canvasX, canvasY);
            this._closeMenus();
          });
          list.appendChild(item);
        });
      });
    };

    input.addEventListener('input', () => renderItems(input.value));
    renderItems('');

    this.container.appendChild(picker);
    this.nodePicker = picker;
    setTimeout(() => input.focus(), 0);
  }

  // -----------------------------------------------------------------------
  // Context menu (right-click)
  // -----------------------------------------------------------------------
  _showContextMenu(screenX, screenY, canvasX, canvasY) {
    this._closeMenus();

    const menu = document.createElement('div');
    menu.className = 'wf-ctx-menu';
    menu.style.left = screenX + 'px';
    menu.style.top = screenY + 'px';

    Object.entries(CATEGORIES).forEach(([catKey, cat]) => {
      const catItem = document.createElement('div');
      catItem.className = 'wf-ctx-item';
      catItem.textContent = cat.label;
      catItem.style.fontWeight = '600';
      catItem.style.color = '#999';
      catItem.style.cursor = 'default';
      menu.appendChild(catItem);

      cat.types.forEach(t => {
        const def = NODE_TYPES[t];
        const item = document.createElement('div');
        item.className = 'wf-ctx-item';
        item.style.paddingLeft = '24px';
        item.textContent = def.label;
        item.addEventListener('click', () => {
          this.addNode(t, canvasX, canvasY);
          this._closeMenus();
        });
        menu.appendChild(item);
      });
    });

    const sep = document.createElement('div');
    sep.className = 'wf-ctx-sep';
    menu.appendChild(sep);

    // Run workflow option
    const runAll = document.createElement('div');
    runAll.className = 'wf-ctx-item';
    runAll.textContent = 'Run Workflow';
    runAll.addEventListener('click', () => {
      this.runWorkflow();
      this._closeMenus();
    });
    menu.appendChild(runAll);

    // Export
    const expItem = document.createElement('div');
    expItem.className = 'wf-ctx-item';
    expItem.textContent = 'Export Workflow';
    expItem.addEventListener('click', () => {
      const json = this.exportWorkflow();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workflow.json';
      a.click();
      URL.revokeObjectURL(url);
      this._closeMenus();
    });
    menu.appendChild(expItem);

    this.container.appendChild(menu);
    this.contextMenu = menu;
  }

  _closeMenus() {
    if (this.nodePicker) {
      this.nodePicker.remove();
      this.nodePicker = null;
    }
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  // -----------------------------------------------------------------------
  // Workflow execution
  // -----------------------------------------------------------------------
  async runNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    const def = NODE_TYPES[node.type];
    if (!def.aiNode) return;

    const runBtn = node.el.querySelector('.wf-run-btn');
    if (runBtn) runBtn.classList.add('running');

    // Collect input values from connections
    const inputValues = {};
    this.connections.forEach(c => {
      if (c.toNode === id) {
        const sourceNode = this.nodes.get(c.fromNode);
        if (sourceNode && sourceNode.result && sourceNode.result[c.fromPort]) {
          inputValues[c.toPort] = sourceNode.result[c.fromPort];
        }
      }
    });

    try {
      const payload = {
        type: node.type,
        params: { ...node.values },
        inputs: inputValues
      };

      // Try to call the API if available
      if (typeof window.workflowRunNode === 'function') {
        node.result = await window.workflowRunNode(payload);
      } else {
        // Simulated execution
        console.log(`[Workflow] Running node ${id} (${node.type}):`, payload);
        await new Promise(resolve => setTimeout(resolve, 1500));
        node.result = {};
        def.outputs.forEach(o => {
          node.result[o.name] = `[${o.type}:generated_${id}]`;
        });
        console.log(`[Workflow] Node ${id} result:`, node.result);
      }
    } catch (err) {
      console.error(`[Workflow] Node ${id} error:`, err);
      node.result = { error: err.message };
    } finally {
      if (runBtn) runBtn.classList.remove('running');
    }

    return node.result;
  }

  async runWorkflow() {
    // Topological sort
    const order = this._topologicalSort();
    console.log('[Workflow] Execution order:', order.map(id => {
      const n = this.nodes.get(id);
      return `${id}:${n.type}`;
    }));

    for (const id of order) {
      const node = this.nodes.get(id);
      const def = NODE_TYPES[node.type];
      if (def.aiNode) {
        await this.runNode(id);
      } else {
        // Propagate values for non-AI nodes
        node.result = {};
        // For passthrough nodes, collect inputs
        this.connections.forEach(c => {
          if (c.toNode === id) {
            const sourceNode = this.nodes.get(c.fromNode);
            if (sourceNode && sourceNode.result) {
              node.result[c.toPort] = sourceNode.result[c.fromPort];
            }
          }
        });
        // For nodes with params as outputs (like prompt)
        if (def.outputs.length > 0 && def.params.length > 0) {
          def.outputs.forEach(o => {
            if (!node.result[o.name]) {
              // Use first param value as output
              const firstParam = def.params[0];
              node.result[o.name] = node.values[firstParam.name] || '';
            }
          });
        }
        // For merge/passthrough: combine inputs to first output
        if (def.inputs.length > 0 && def.outputs.length > 0) {
          const outName = def.outputs[0].name;
          if (!node.result[outName]) {
            const collected = [];
            def.inputs.forEach(inp => {
              if (node.result[inp.name]) collected.push(node.result[inp.name]);
            });
            if (collected.length > 0) {
              node.result[outName] = collected.join('+');
            }
          }
        }
      }
    }

    console.log('[Workflow] Complete');
    return order.map(id => ({
      id,
      type: this.nodes.get(id).type,
      result: this.nodes.get(id).result
    }));
  }

  _topologicalSort() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        console.warn('[Workflow] Cycle detected at node', id);
        return;
      }
      visiting.add(id);
      // Visit dependencies (nodes that feed into this node)
      this.connections.forEach(c => {
        if (c.toNode === id) visit(c.fromNode);
      });
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    this.nodes.forEach((_, id) => visit(id));
    return order;
  }

  // -----------------------------------------------------------------------
  // Import / Export
  // -----------------------------------------------------------------------
  exportWorkflow() {
    const nodesArr = [];
    this.nodes.forEach((n, id) => {
      nodesArr.push({
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        values: { ...n.values }
      });
    });
    return JSON.stringify({
      version: 1,
      nodes: nodesArr,
      connections: this.connections.map(c => ({
        fromNode: c.fromNode,
        fromPort: c.fromPort,
        toNode: c.toNode,
        toPort: c.toPort,
        type: c.type
      }))
    }, null, 2);
  }

  importWorkflow(json) {
    let data;
    if (typeof json === 'string') {
      data = JSON.parse(json);
    } else {
      data = json;
    }

    this._pushUndo();

    // Clear
    this.nodes.forEach(n => { if (n.el && n.el.parentNode) n.el.parentNode.removeChild(n.el); });
    this.nodes.clear();
    this.connections = [];
    this.selectedNodes.clear();
    this.nextId = 1;

    // Recreate
    (data.nodes || []).forEach(nd => {
      if (nd.id >= this.nextId) this.nextId = nd.id + 1;
      this._createNodeInternal(nd.id, nd.type, nd.x, nd.y, nd.values || {});
    });

    this.connections = (data.connections || []).map(c => ({ ...c }));
    this.render();
  }

  // -----------------------------------------------------------------------
  // Utility: center view to fit all nodes
  // -----------------------------------------------------------------------
  fitView() {
    if (this.nodes.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 220);
      maxY = Math.max(maxY, n.y + 150);
    });

    const cr = this.container.getBoundingClientRect();
    const pw = maxX - minX + 100;
    const ph = maxY - minY + 100;
    const z = Math.min(cr.width / pw, cr.height / ph, 1.5);
    this.zoom = z;
    this.pan.x = (cr.width - pw * z) / 2 - minX * z + 50 * z;
    this.pan.y = (cr.height - ph * z) / 2 - minY * z + 50 * z;

    this._updateTransform();
    this._drawGrid();
    this.render();
  }
}

// ---------------------------------------------------------------------------
// Export for module systems or attach to window
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WorkflowCanvas, NODE_TYPES, TYPE_COLORS, CATEGORIES };
} else {
  window.WorkflowCanvas = WorkflowCanvas;
  window.NODE_TYPES = NODE_TYPES;
  window.TYPE_COLORS = TYPE_COLORS;
  window.CATEGORIES = CATEGORIES;
}

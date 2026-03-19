/**
 * WorkflowCanvas - A complete drag-and-drop node-based workflow editor
 * Inspired by Weavy.ai's visual node editor. Pure vanilla JS.
 */

// ---------------------------------------------------------------------------
// Node type definitions
// ---------------------------------------------------------------------------
const NODE_TYPES = {
  // ── TEXT NODES (purple) ──
  'prompt': {
    color: '#9b59b6', label: 'Prompt', category: 'text',
    inputs: [],
    outputs: [{ name: 'text', type: 'text' }],
    params: [{ name: 'text', type: 'textarea', placeholder: 'Enter your prompt...' }]
  },
  'prompt-enhancer': {
    color: '#8e44ad', label: 'Prompt Enhancer', category: 'text', aiNode: true,
    inputs: [{ name: 'text', type: 'text' }],
    outputs: [{ name: 'enhanced', type: 'text' }],
    params: [{ name: 'style', type: 'select', options: ['Cinematic', 'Anime', 'Realistic', 'Abstract', 'Photographic', 'Fantasy'] }]
  },
  'prompt-concat': {
    color: '#7d3c98', label: 'Prompt Concatenator', category: 'text',
    inputs: [{ name: 'text_a', type: 'text' }, { name: 'text_b', type: 'text' }],
    outputs: [{ name: 'combined', type: 'text' }],
    params: [{ name: 'separator', type: 'text', placeholder: ', ' }]
  },
  'run-llm': {
    color: '#6c3483', label: 'Run LLM', category: 'text', aiNode: true,
    inputs: [{ name: 'prompt', type: 'text' }, { name: 'image', type: 'image' }],
    outputs: [{ name: 'response', type: 'text' }],
    params: [{ name: 'model', type: 'select', options: ['gpt-4o', 'claude-sonnet', 'gemini-pro'] }]
  },

  // ── IMAGE INPUT NODES (green) ──
  'image-input': {
    color: '#27ae60', label: 'Image Input', category: 'image',
    inputs: [],
    outputs: [{ name: 'image', type: 'image' }],
    params: [{ name: 'url', type: 'dropzone', placeholder: 'Drop image here' }]
  },
  'video-input': {
    color: '#e74c3c', label: 'Video Input', category: 'input',
    inputs: [],
    outputs: [{ name: 'video', type: 'video' }],
    params: [{ name: 'url', type: 'dropzone', placeholder: 'Drop video here' }]
  },

  // ── IMAGE GENERATION (green, AI) ──
  'text-to-image': {
    color: '#2ecc71', label: 'Text to Image', category: 'image-gen', aiNode: true,
    inputs: [{ name: 'prompt', type: 'text' }],
    outputs: [{ name: 'image', type: 'image' }],
    params: [
      { name: 'model', type: 'select', options: ['flux-pro', 'stable-diffusion-3.5', 'ideogram-v3', 'imagen-3'] },
      { name: 'size', type: 'select', options: ['1024x1024', '1024x768', '768x1024', '1920x1080'] },
      { name: 'negative_prompt', type: 'textarea', placeholder: 'What to avoid...' }
    ]
  },
  'image-to-image': {
    color: '#2ecc71', label: 'Image to Image', category: 'image-gen', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'result', type: 'image' }],
    params: [
      { name: 'model', type: 'select', options: ['flux-kontext', 'stable-diffusion-3.5'] },
      { name: 'strength', type: 'select', options: ['0.3', '0.5', '0.7', '0.9'] }
    ]
  },

  // ── VIDEO GENERATION (red, AI) ──
  'text-to-video': {
    color: '#e74c3c', label: 'Text to Video', category: 'video-gen', aiNode: true,
    inputs: [{ name: 'prompt', type: 'text' }],
    outputs: [{ name: 'video', type: 'video' }],
    params: [
      { name: 'model', type: 'select', options: ['kling-text', 'minimax-text', 'wan-text', 'luma-ray2', 'hunyuan', 'ltx-video', 'veo2'] },
      { name: 'duration', type: 'select', options: ['5', '10'] },
      { name: 'aspect_ratio', type: 'select', options: ['16:9', '9:16', '1:1'] }
    ]
  },
  'image-to-video': {
    color: '#c0392b', label: 'Image to Video', category: 'video-gen', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'video', type: 'video' }],
    params: [
      { name: 'model', type: 'select', options: ['kling-image', 'runway-gen4', 'veo-3.1'] },
      { name: 'duration', type: 'select', options: ['5', '10'] }
    ]
  },
  'video-to-video': {
    color: '#c0392b', label: 'Video to Video', category: 'video-gen', aiNode: true,
    inputs: [{ name: 'video', type: 'video' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'result', type: 'video' }],
    params: [
      { name: 'model', type: 'select', options: ['runway-gen4', 'kling-text'] },
      { name: 'strength', type: 'select', options: ['0.3', '0.5', '0.7'] }
    ]
  },

  // ── EDITING TOOLS (blue) ──
  'upscale': {
    color: '#3498db', label: 'Upscale', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'upscaled', type: 'image' }],
    params: [{ name: 'scale', type: 'select', options: ['2x', '4x'] }]
  },
  'inpaint': {
    color: '#2980b9', label: 'Inpaint', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'mask', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'result', type: 'image' }],
    params: [{ name: 'model', type: 'select', options: ['flux-inpaint', 'sd-inpaint'] }]
  },
  'outpaint': {
    color: '#2980b9', label: 'Outpaint', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'result', type: 'image' }],
    params: [
      { name: 'direction', type: 'select', options: ['all', 'left', 'right', 'top', 'bottom'] },
      { name: 'pixels', type: 'select', options: ['128', '256', '512'] }
    ]
  },
  'blur': {
    color: '#3498db', label: 'Blur', category: 'editing',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'blurred', type: 'image' }],
    params: [{ name: 'radius', type: 'select', options: ['5', '10', '20', '50'] }]
  },
  'crop': {
    color: '#3498db', label: 'Crop', category: 'editing',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'cropped', type: 'image' }],
    params: [{ name: 'aspect', type: 'select', options: ['16:9', '9:16', '1:1', '4:3', '3:2'] }]
  },
  'relight': {
    color: '#2471a3', label: 'Relight', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }],
    outputs: [{ name: 'relit', type: 'image' }],
    params: [{ name: 'mode', type: 'select', options: ['product', 'human', 'scene'] }]
  },
  'remove-bg': {
    color: '#3498db', label: 'Remove Background', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'result', type: 'image' }, { name: 'mask', type: 'image' }],
    params: []
  },
  'depth-map': {
    color: '#2980b9', label: 'Depth Map', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'depth', type: 'image' }],
    params: []
  },
  'describe-image': {
    color: '#5b2c6f', label: 'Describe Image', category: 'editing', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'description', type: 'text' }],
    params: [{ name: 'detail', type: 'select', options: ['brief', 'detailed', 'technical'] }]
  },

  // ── CONTROL NODES (lime/yellow) ──
  'controlnet': {
    color: '#f39c12', label: 'ControlNet', category: 'control', aiNode: true,
    inputs: [{ name: 'image', type: 'image' }, { name: 'prompt', type: 'text' }, { name: 'control', type: 'image' }],
    outputs: [{ name: 'result', type: 'image' }],
    params: [
      { name: 'type', type: 'select', options: ['canny', 'depth', 'pose', 'normal', 'line-art'] },
      { name: 'strength', type: 'select', options: ['0.3', '0.5', '0.7', '1.0'] }
    ]
  },
  'lora': {
    color: '#d4ac0d', label: 'LoRA', category: 'control',
    inputs: [],
    outputs: [{ name: 'lora', type: 'text' }],
    params: [
      { name: 'url', type: 'text', placeholder: 'LoRA URL or CivitAI link' },
      { name: 'weight', type: 'select', options: ['0.5', '0.7', '0.8', '1.0', '1.2'] }
    ]
  },

  // ── UTILITY (teal/grey) ──
  'video-merge': {
    color: '#16a085', label: 'Merge Videos', category: 'utility',
    inputs: [{ name: 'video_a', type: 'video' }, { name: 'video_b', type: 'video' }],
    outputs: [{ name: 'merged', type: 'video' }],
    params: []
  },
  'layer-composite': {
    color: '#17a2b8', label: 'Layer Composite', category: 'utility',
    inputs: [{ name: 'foreground', type: 'image' }, { name: 'background', type: 'image' }, { name: 'mask', type: 'image' }],
    outputs: [{ name: 'composited', type: 'image' }],
    params: [{ name: 'blend', type: 'select', options: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'] }]
  },
  'compare': {
    color: '#95a5a6', label: 'Compare', category: 'utility',
    inputs: [{ name: 'image_a', type: 'image' }, { name: 'image_b', type: 'image' }],
    outputs: [{ name: 'comparison', type: 'image' }],
    params: [{ name: 'mode', type: 'select', options: ['slider', 'side-by-side', 'overlay'] }]
  },
  'router': {
    color: '#7f8c8d', label: 'Router', category: 'utility',
    inputs: [{ name: 'input', type: 'image' }],
    outputs: [{ name: 'out_1', type: 'image' }, { name: 'out_2', type: 'image' }, { name: 'out_3', type: 'image' }],
    params: []
  },
  'preview': {
    color: '#95a5a6', label: 'Preview', category: 'utility',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [],
    params: []
  },

  // ── OUTPUT (teal) ──
  'video-output': {
    color: '#1abc9c', label: 'Export Video', category: 'output',
    inputs: [{ name: 'video', type: 'video' }],
    outputs: [],
    params: [{ name: 'filename', type: 'text', placeholder: 'output.mp4' }]
  },
  'image-output': {
    color: '#1abc9c', label: 'Export Image', category: 'output',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [],
    params: [{ name: 'filename', type: 'text', placeholder: 'output.png' }, { name: 'format', type: 'select', options: ['png', 'jpg', 'webp'] }]
  },
  'sticky-note': {
    color: '#f1c40f', label: 'Sticky Note', category: 'utility',
    inputs: [],
    outputs: [],
    params: [{ name: 'note', type: 'textarea', placeholder: 'Add a note...' }]
  }
};

const MODEL_CATALOG = {
  'text-to-image': {
    title: 'Image Models',
    subtitle: 'Generate from text',
    models: [
      { id: 'flux-pro', name: 'Flux 2 Pro', icon: '\u25b3', iconStyle: 'font-size:28px;' },
      { id: 'flux-dev-lora', name: 'Flux 2 Dev LoRA', icon: '\u25b3', iconStyle: 'font-size:28px;' },
      { id: 'stable-diffusion-3.5', name: 'Stable Diffusion 3.5', icon: '\u25ce', iconStyle: 'font-size:28px;' },
      { id: 'ideogram-v3', name: 'Ideogram V3', icon: '\u2726', iconStyle: 'font-size:28px;color:#ff6b35;' },
      { id: 'imagen-3', name: 'Imagen 3', icon: 'G', iconStyle: 'font-size:24px;font-weight:800;color:#4285f4;font-family:sans-serif;' },
      { id: 'gpt-image', name: 'GPT Image 1.5', icon: '\u25c8', iconStyle: 'font-size:26px;color:#10a37f;' },
      { id: 'recraft-v3', name: 'Recraft V3', icon: '\u2b21', iconStyle: 'font-size:28px;' },
      { id: 'nano-banana', name: 'Nano Banana', icon: '\ud83c\udf4c', iconStyle: 'font-size:24px;' },
    ]
  },
  'image-to-image': {
    title: 'Image Models',
    subtitle: 'Generate from image',
    models: [
      { id: 'flux-kontext', name: 'Flux Kontext', icon: '\u25b3', iconStyle: 'font-size:28px;' },
      { id: 'stable-diffusion-3.5', name: 'SD 3.5 img2img', icon: '\u25ce', iconStyle: 'font-size:28px;' },
    ]
  },
  'text-to-video': {
    title: 'Video Models',
    subtitle: 'Generate from text',
    models: [
      { id: 'kling-text', name: 'Kling 3', icon: '\u26a1', iconStyle: 'font-size:26px;color:#7c3aed;' },
      { id: 'minimax-text', name: 'MiniMax Video', icon: '\u25a3', iconStyle: 'font-size:26px;color:#06b6d4;' },
      { id: 'wan-text', name: 'Wan 2.5', icon: '\u25d0', iconStyle: 'font-size:26px;' },
      { id: 'luma-ray2', name: 'Luma Ray 2', icon: '\u25c9', iconStyle: 'font-size:26px;color:#8b5cf6;' },
      { id: 'hunyuan', name: 'Hunyuan Video', icon: '\u2b22', iconStyle: 'font-size:26px;color:#ef4444;' },
      { id: 'ltx-video', name: 'LTX Video', icon: '\u25b2', iconStyle: 'font-size:26px;color:#f59e0b;' },
      { id: 'veo2', name: 'Veo 3.1', icon: 'G', iconStyle: 'font-size:24px;font-weight:800;color:#4285f4;font-family:sans-serif;' },
      { id: 'sora2', name: 'Sora 2', icon: '\u25cb', iconStyle: 'font-size:28px;color:#fff;' },
    ]
  },
  'image-to-video': {
    title: 'Video Models',
    subtitle: 'Generate from image',
    models: [
      { id: 'kling-image', name: 'Kling 3 i2v', icon: '\u26a1', iconStyle: 'font-size:26px;color:#7c3aed;' },
      { id: 'runway-gen4', name: 'Runway Gen-4', icon: '\u25b6', iconStyle: 'font-size:24px;color:#22d3ee;' },
      { id: 'veo-3.1', name: 'Veo 3.1 i2v', icon: 'G', iconStyle: 'font-size:24px;font-weight:800;color:#4285f4;font-family:sans-serif;' },
    ]
  },
  'video-to-video': {
    title: 'Video Models',
    subtitle: 'Transform video',
    models: [
      { id: 'runway-gen4', name: 'Runway Gen-4', icon: '\u25b6', iconStyle: 'font-size:24px;color:#22d3ee;' },
      { id: 'kling-text', name: 'Kling 3 v2v', icon: '\u26a1', iconStyle: 'font-size:26px;color:#7c3aed;' },
    ]
  },
  'upscale': {
    title: 'Upscale Models',
    subtitle: 'Enhance resolution',
    models: [
      { id: 'real-esrgan', name: 'Real-ESRGAN', icon: '\u2b06', iconStyle: 'font-size:28px;color:#22c55e;' },
      { id: 'aura-sr', name: 'Aura SR', icon: '\u2727', iconStyle: 'font-size:28px;color:#8b5cf6;' },
    ]
  },
  'inpaint': {
    title: 'Inpaint Models',
    subtitle: 'Edit regions',
    models: [
      { id: 'flux-inpaint', name: 'Flux Inpaint', icon: '\u25b3', iconStyle: 'font-size:28px;' },
      { id: 'sd-inpaint', name: 'SD Inpaint', icon: '\u25ce', iconStyle: 'font-size:28px;' },
    ]
  },
  'relight': {
    title: 'Relight Models',
    subtitle: 'Change lighting',
    models: [
      { id: 'product', name: 'Product Relight', icon: '\u2600', iconStyle: 'font-size:26px;color:#f59e0b;' },
      { id: 'human', name: 'Human Relight', icon: '\ud83d\udc64', iconStyle: 'font-size:22px;' },
      { id: 'scene', name: 'Scene Relight', icon: '\ud83c\udf05', iconStyle: 'font-size:22px;' },
    ]
  }
};

const TYPE_COLORS = {
  text: '#9b59b6',
  image: '#27ae60',
  video: '#e74c3c',
  lora: '#d4ac0d'
};

const CATEGORIES = {
  text: { label: 'Text', types: ['prompt', 'prompt-enhancer', 'prompt-concat', 'run-llm'] },
  input: { label: 'Input', types: ['image-input', 'video-input'] },
  'image-gen': { label: 'Image Generation', types: ['text-to-image', 'image-to-image'] },
  'video-gen': { label: 'Video Generation', types: ['text-to-video', 'image-to-video', 'video-to-video'] },
  editing: { label: 'Editing Tools', types: ['upscale', 'inpaint', 'outpaint', 'blur', 'crop', 'relight', 'remove-bg', 'depth-map', 'describe-image'] },
  control: { label: 'Control', types: ['controlnet', 'lora'] },
  utility: { label: 'Utility', types: ['video-merge', 'layer-composite', 'compare', 'router', 'preview', 'sticky-note'] },
  output: { label: 'Output', types: ['video-output', 'image-output'] }
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
    this.container.style.background = '#0c0c0c';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.userSelect = 'none';
    this.container.style.cursor = 'grab';
    this.container.tabIndex = 0;

    // Grid canvas (background)
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    this.container.appendChild(this.gridCanvas);

    // SVG layer for connections
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;transform-origin:0 0;overflow:visible;';
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('overflow', 'visible');
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
      /* ── Weavy-style node ── */
      .wf-node {
        position: absolute;
        width: 320px;
        background: rgba(35, 35, 45, 0.92);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        font-family: 'Manrope', 'Inter', -apple-system, sans-serif;
        font-size: 12px;
        color: #ccc;
        cursor: grab;
        transition: box-shadow 0.2s, border-color 0.2s;
      }
      .wf-node:hover { border-color: rgba(255,255,255,0.18); }
      .wf-node:active { cursor: grabbing; }
      .wf-node.selected {
        border-color: rgba(255,255,255,0.3);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.12), 0 8px 40px rgba(0,0,0,0.5);
      }

      /* ── Header ── */
      .wf-node-header {
        height: 38px;
        border-radius: 16px 16px 0 0;
        display: flex;
        align-items: center;
        padding: 0 14px;
        gap: 8px;
        font-weight: 600;
        font-size: 13px;
        color: #fff;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .wf-node-header .wf-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .wf-node-header .wf-menu-btn {
        width: 24px; height: 24px; border: none; background: none;
        color: rgba(255,255,255,0.3); cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 4px; transition: all 0.15s;
      }
      .wf-node-header .wf-menu-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

      /* ── Body ── */
      .wf-node-body { padding: 0; }

      /* ── Ports section ── */
      .wf-ports-section {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
      }
      .wf-ports-left, .wf-ports-right {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .wf-ports-left { align-items: flex-start; }
      .wf-ports-right { align-items: flex-end; }
      .wf-port-row {
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
        height: 22px;
        padding: 0 14px;
      }
      .wf-port-row.input { justify-content: flex-start; }
      .wf-port-row.output { justify-content: flex-end; }
      .wf-port {
        width: 14px; height: 14px;
        border-radius: 50%;
        border: 2.5px solid;
        background: rgba(35,35,45,0.9);
        cursor: crosshair;
        position: absolute;
        transition: box-shadow 0.15s, transform 0.15s;
        z-index: 10;
        pointer-events: all;
      }
      .wf-port::before {
        content: '';
        position: absolute;
        top: -10px; left: -10px; right: -10px; bottom: -10px;
        border-radius: 50%;
      }
      .wf-port.input-port { left: -8px; }
      .wf-port.output-port { right: -8px; }
      .wf-port:hover, .wf-port.highlight {
        transform: scale(1.6);
        box-shadow: 0 0 14px currentColor;
        background: currentColor;
      }
      .wf-port-label {
        font-size: 12px;
        color: rgba(255,255,255,0.55);
        font-weight: 500;
      }
      .wf-port-row.input .wf-port-label { padding-left: 6px; }
      .wf-port-row.output .wf-port-label { padding-right: 6px; }

      /* ── Preview canvas (checkerboard) ── */
      .wf-preview {
        margin: 0 12px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .wf-preview-content {
        width: 100%;
        aspect-ratio: 1/1;
        position: relative;
        background-color: rgba(20,20,28,0.8);
        background-image:
          linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.03) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.03) 75%);
        background-size: 16px 16px;
        background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      }
      .wf-preview-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(255,255,255,0.12);
        gap: 6px;
        font-size: 11px;
        user-select: none;
      }
      .wf-preview-icon { font-size: 28px; font-style: normal; }
      .wf-preview-content video, .wf-preview-content img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .wf-preview-generating {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 100%; gap: 10px;
      }
      .wf-preview-spinner {
        width: 32px; height: 32px;
        border: 2px solid rgba(255,255,255,0.08);
        border-top-color: rgba(255,255,255,0.5);
        border-radius: 50%;
        animation: wf-spin 0.8s linear infinite;
      }
      .wf-preview-status {
        font-size: 10px; color: rgba(255,255,255,0.3);
        font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      }

      /* ── Bottom bar (actions) ── */
      .wf-node-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-top: 1px solid rgba(255,255,255,0.06);
        gap: 8px;
      }
      .wf-preview-btn {
        padding: 6px 14px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(8px);
        color: rgba(255,255,255,0.5);
        font-size: 11px;
        font-weight: 600;
        font-family: inherit;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .wf-preview-btn:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }
      .wf-preview-clear:hover { border-color: rgba(239,68,68,0.4); color: #f87171; }
      .wf-preview-download:hover { border-color: rgba(52,211,153,0.4); color: #34d399; }
      .wf-run-model-btn {
        padding: 7px 16px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(8px);
        color: rgba(255,255,255,0.7);
        font-size: 12px;
        font-weight: 700;
        font-family: inherit;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }
      .wf-run-model-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
      .wf-run-model-btn.running { opacity: 0.5; pointer-events: none; }

      /* Dropzone for image input */
      .wf-dropzone {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      }
      .wf-dropzone-inner {
        display: flex; flex-direction: column; align-items: center;
        gap: 6px; color: rgba(255,255,255,0.2); font-size: 11px;
        font-weight: 500; user-select: none; transition: color 0.2s;
      }
      .wf-dropzone:hover .wf-dropzone-inner { color: rgba(255,255,255,0.4); }
      .wf-dropzone.dragover {
        background: rgba(39,174,96,0.08);
        outline: 2px dashed rgba(39,174,96,0.4);
        outline-offset: -4px;
        border-radius: 8px;
      }
      .wf-dropzone.dragover .wf-dropzone-inner { color: rgba(39,174,96,0.6); }
      @keyframes wf-spin { to { transform: rotate(360deg); } }

      /* ── Hidden old run btn in header (replaced by footer btn) ── */
      .wf-run-btn { display: none; }

      /* ── Params (shown in right panel, minimal in node) ── */
      .wf-params { display: none; }
      .wf-ports { display: flex; flex-direction: column; gap: 8px; }

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

      /* Model Picker Modal */
      .wf-model-picker-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
        z-index: 9999; display: flex; align-items: center; justify-content: center;
      }
      .wf-model-picker {
        width: 520px; max-height: 600px; background: rgba(30,30,40,0.97);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
        overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        backdrop-filter: blur(24px);
      }
      .wf-model-picker-header {
        padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .wf-model-picker-title {
        font-size: 20px; font-weight: 800; color: #fff; margin: 0;
      }
      .wf-model-picker-subtitle {
        font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 4px;
        font-family: monospace;
      }
      .wf-model-picker-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 12px; padding: 20px 24px; overflow-y: auto; max-height: 460px;
      }
      .wf-model-card {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px; padding: 24px 16px; text-align: center;
        cursor: pointer; transition: all 0.2s;
      }
      .wf-model-card:hover {
        background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);
        transform: translateY(-2px);
      }
      .wf-model-card-icon {
        display: block; margin: 0 auto 12px; height: 40px; line-height: 40px;
        color: rgba(255,255,255,0.7); user-select: none;
      }
      .wf-model-card-name {
        font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8);
      }
      .wf-model-picker-close {
        position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
        border-radius: 8px; border: none; background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.4); font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .wf-model-picker-close:hover { background: rgba(255,255,255,0.12); color: #fff; }
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

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
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

      // Left click on empty canvas -> pan (not on a node)
      const clickedOnNode = e.target.closest('.wf-node');
      if (e.button === 0 && !clickedOnNode) {
        this.panning = true;
        this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        el.style.cursor = 'grabbing';
        this.selectedNodes.clear();
        this._updateSelectionVisuals();
        e.preventDefault();
        return;
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
        el.style.cursor = 'grab';
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

    // --- Wheel: zoom (pinch/ctrl+scroll) or pan (two-finger scroll) ---
    el.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom or Ctrl+scroll = zoom
        const delta = -e.deltaY * 0.005;
        const newZoom = Math.max(0.25, Math.min(3, this.zoom + delta * this.zoom));
        const cr = this.container.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        this.pan.x = mx - (mx - this.pan.x) * (newZoom / this.zoom);
        this.pan.y = my - (my - this.pan.y) * (newZoom / this.zoom);
        this.zoom = newZoom;
      } else {
        // Two-finger scroll = pan in all directions
        this.pan.x -= e.deltaX;
        this.pan.y -= e.deltaY;
      }

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

    // ── Header with color accent bar ──
    const header = document.createElement('div');
    header.className = 'wf-node-header';
    header.style.background = `linear-gradient(135deg, ${def.color}22, rgba(35,35,45,0.95))`;
    header.style.borderBottom = `2px solid ${def.color}44`;

    const title = document.createElement('span');
    title.className = 'wf-title';
    title.textContent = def.label;
    header.appendChild(title);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'wf-menu-btn';
    menuBtn.innerHTML = '⋯';
    menuBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    header.appendChild(menuBtn);

    el.appendChild(header);

    // ── Body ──
    const body = document.createElement('div');
    body.className = 'wf-node-body';

    // ── Ports section: inputs LEFT, outputs RIGHT ──
    const portsSection = document.createElement('div');
    portsSection.className = 'wf-ports-section';

    const portsLeft = document.createElement('div');
    portsLeft.className = 'wf-ports-left';
    const portsRight = document.createElement('div');
    portsRight.className = 'wf-ports-right';

    // Input ports (left side)
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
      label.textContent = inp.name.charAt(0).toUpperCase() + inp.name.slice(1).replace(/_/g, ' ');
      row.appendChild(label);
      portsLeft.appendChild(row);
    });

    // Output ports (right side)
    def.outputs.forEach(out => {
      const row = document.createElement('div');
      row.className = 'wf-port-row output';
      const label = document.createElement('span');
      label.className = 'wf-port-label';
      label.textContent = out.name.charAt(0).toUpperCase() + out.name.slice(1).replace(/_/g, ' ');
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
      portsRight.appendChild(row);
    });

    portsSection.appendChild(portsLeft);
    portsSection.appendChild(portsRight);
    body.appendChild(portsSection);

    // ── Preview / Dropzone area ──
    const hasPreview = def.aiNode || type === 'video-output' || type === 'video-merge' || type === 'image-input';
    let previewContent = null;
    if (hasPreview) {
      const preview = document.createElement('div');
      preview.className = 'wf-preview';
      previewContent = document.createElement('div');
      previewContent.className = 'wf-preview-content';

      if (type === 'image-input') {
        // Image dropzone
        previewContent.innerHTML = `<div class="wf-dropzone" id="dropzone-${id}">
          <div class="wf-dropzone-inner">
            <span style="font-size:28px;opacity:0.3;">⬆</span>
            <span>Drop image or click</span>
          </div>
          <input type="file" accept="image/*" style="display:none;" id="dropfile-${id}">
        </div>`;
        previewContent.style.cursor = 'pointer';
        previewContent.style.backgroundImage = 'none';
        previewContent.style.background = 'rgba(20,20,28,0.8)';

        setTimeout(() => {
          const dz = document.getElementById(`dropzone-${id}`);
          const fi = document.getElementById(`dropfile-${id}`);
          if (!dz || !fi) return;

          dz.addEventListener('click', (e) => { e.stopPropagation(); fi.click(); });
          dz.addEventListener('mousedown', (e) => e.stopPropagation());
          dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
          dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
          dz.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
            if (e.dataTransfer.files.length) this._handleImageDrop(id, e.dataTransfer.files[0], previewContent);
          });
          fi.addEventListener('change', (e) => {
            if (e.target.files.length) this._handleImageDrop(id, e.target.files[0], previewContent);
          });
        }, 50);
      } else {
        previewContent.innerHTML = '<div class="wf-preview-placeholder"><span>No output yet</span></div>';
      }

      preview.appendChild(previewContent);
      body.appendChild(preview);
    }

    // ── Store params (hidden, edited in right panel) ──
    const paramValues = values || {};

    el.appendChild(body);

    // ── Footer with action buttons + Run Model ──
    const footer = document.createElement('div');
    footer.className = 'wf-node-footer';

    if (hasPreview) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'wf-preview-btn wf-preview-clear';
      clearBtn.innerHTML = '✕ Clear';
      clearBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const node = this.nodes.get(id);
        if (node) { node.outputUrl = null; node.outputType = null; }
        if (previewContent) previewContent.innerHTML = '<div class="wf-preview-placeholder"><span>No output yet</span></div>';
      });
      footer.appendChild(clearBtn);

      const dlBtn = document.createElement('button');
      dlBtn.className = 'wf-preview-btn wf-preview-download';
      dlBtn.innerHTML = '↓ Download';
      dlBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const node = this.nodes.get(id);
        if (node?.outputUrl) {
          const a = document.createElement('a');
          a.href = node.outputUrl;
          a.download = 'output.mp4';
          a.click();
        }
      });
      footer.appendChild(dlBtn);
    }

    if (def.aiNode) {
      const runModelBtn = document.createElement('button');
      runModelBtn.className = 'wf-run-model-btn';
      runModelBtn.innerHTML = '→ Run Model';
      runModelBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      runModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        runModelBtn.classList.add('running');
        runModelBtn.innerHTML = '⟳ Running...';
        this.runNode(id).finally(() => {
          runModelBtn.classList.remove('running');
          runModelBtn.innerHTML = '→ Run Model';
        });
      });
      footer.appendChild(runModelBtn);
    }

    el.appendChild(footer);

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
            this._closeMenus();
            if (MODEL_CATALOG[t]) {
              this._showModelPicker(t, canvasX, canvasY);
            } else {
              this.addNode(t, canvasX, canvasY);
            }
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
          this._closeMenus();
          if (MODEL_CATALOG[t]) {
            this._showModelPicker(t, canvasX, canvasY);
          } else {
            this.addNode(t, canvasX, canvasY);
          }
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
  // Image drop handler
  // -----------------------------------------------------------------------
  _handleImageDrop(nodeId, file, previewContent) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      node.values.url = dataUrl;
      node.outputUrl = dataUrl;
      node.result = { image: dataUrl };
      previewContent.style.backgroundImage = 'none';
      previewContent.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
    };
    reader.readAsDataURL(file);

    // Also upload to server for use in API calls
    const formData = new FormData();
    formData.append('video', file); // reuse the upload endpoint
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      }).then(r => r.json()).then(data => {
        if (data.video?.localPath) {
          node.values.url = data.video.localPath;
        }
      }).catch(() => {});
    }
  }

  // Workflow execution
  // -----------------------------------------------------------------------
  _setNodePreview(node, state, url) {
    const previewContent = node.el.querySelector('.wf-preview-content');
    const clearBtn = node.el.querySelector('.wf-preview-clear');
    const dlBtn = node.el.querySelector('.wf-preview-download');
    if (!previewContent) return;

    if (state === 'generating') {
      previewContent.innerHTML = '<div class="wf-preview-generating"><div class="wf-preview-spinner"></div><span class="wf-preview-status">Generating...</span></div>';
      if (clearBtn) clearBtn.style.opacity = '0.3';
      if (dlBtn) dlBtn.style.opacity = '0.3';
    } else if (state === 'completed' && url) {
      node.outputUrl = url;
      node.outputType = 'video';
      previewContent.innerHTML = `<video src="${url}" controls muted preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;"></video>`;
      if (clearBtn) clearBtn.style.opacity = '1';
      if (dlBtn) dlBtn.style.opacity = '1';
    } else if (state === 'failed') {
      previewContent.innerHTML = '<div class="wf-preview-placeholder" style="color:rgba(239,68,68,0.5);"><i class="wf-preview-icon" style="opacity:0.6;">✕</i><span>Generation failed</span></div>';
      if (clearBtn) clearBtn.style.opacity = '1';
      if (dlBtn) dlBtn.style.opacity = '0.3';
    } else {
      previewContent.innerHTML = '<div class="wf-preview-placeholder"><i class="wf-preview-icon">▶</i><span>No output yet</span></div>';
      if (clearBtn) clearBtn.style.opacity = '0.3';
      if (dlBtn) dlBtn.style.opacity = '0.3';
    }
  }

  _showModelPicker(nodeType, x, y) {
    const catalog = MODEL_CATALOG[nodeType];
    if (!catalog) {
      // No model picker needed, just add node directly
      return this.addNode(nodeType, x, y);
    }

    const overlay = document.createElement('div');
    overlay.className = 'wf-model-picker-overlay';

    const picker = document.createElement('div');
    picker.className = 'wf-model-picker';
    picker.style.position = 'relative';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'wf-model-picker-close';
    closeBtn.innerHTML = '\u2715';
    closeBtn.addEventListener('click', () => overlay.remove());
    picker.appendChild(closeBtn);

    // Header
    const header = document.createElement('div');
    header.className = 'wf-model-picker-header';
    header.innerHTML = `<div class="wf-model-picker-title">${catalog.title}</div><div class="wf-model-picker-subtitle">${catalog.subtitle}</div>`;
    picker.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'wf-model-picker-grid';

    catalog.models.forEach(model => {
      const card = document.createElement('div');
      card.className = 'wf-model-card';
      card.innerHTML = `<span class="wf-model-card-icon" style="${model.iconStyle || ''}">${model.icon}</span><div class="wf-model-card-name">${model.name}</div>`;
      card.addEventListener('click', () => {
        overlay.remove();
        const id = this.addNode(nodeType, x, y);
        // Set the selected model on the node
        const node = this.nodes.get(id);
        if (node) {
          node.values.model = model.id;
          node.selectedModelName = model.name;
          node.selectedModelIcon = model.icon;
          node.selectedModelIconStyle = model.iconStyle || '';
          // Update the node header to show model name
          const titleEl = node.el.querySelector('.wf-title');
          if (titleEl) titleEl.textContent = model.name;
          // Add model badge under header
          const badge = document.createElement('div');
          badge.style.cssText = 'padding:4px 12px;font-size:10px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px;';
          badge.innerHTML = `<span style="${model.iconStyle || ''}font-size:14px;">${model.icon}</span><span>${model.name}</span>`;
          node.el.querySelector('.wf-node-header').after(badge);
        }
      });
      grid.appendChild(card);
    });

    picker.appendChild(grid);
    overlay.appendChild(picker);

    // Click overlay to close
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    document.body.appendChild(overlay);
  }

  async runNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    const def = NODE_TYPES[node.type];
    if (!def.aiNode) return;

    const runBtn = node.el.querySelector('.wf-run-btn');
    if (runBtn) runBtn.classList.add('running');

    // Show generating state in preview
    this._setNodePreview(node, 'generating');

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
        const videoUrl = node.result?.video || node.result?.merged || node.result?.videoUrl;
        this._setNodePreview(node, videoUrl ? 'completed' : 'failed', videoUrl);
      } else {
        // Simulated execution — show demo preview
        console.log(`[Workflow] Running node ${id} (${node.type}):`, payload);
        await new Promise(resolve => setTimeout(resolve, 2000));
        node.result = {};
        def.outputs.forEach(o => {
          node.result[o.name] = `[${o.type}:generated_${id}]`;
        });
        // Show a simulated "completed" state with placeholder
        const previewContent = node.el.querySelector('.wf-preview-content');
        if (previewContent) {
          previewContent.innerHTML = '<div class="wf-preview-placeholder" style="color:rgba(52,211,153,0.5);"><i class="wf-preview-icon" style="opacity:0.6;">✓</i><span>Simulated output</span></div>';
          const clearBtn = node.el.querySelector('.wf-preview-clear');
          if (clearBtn) clearBtn.style.opacity = '1';
        }
        console.log(`[Workflow] Node ${id} result:`, node.result);
      }
    } catch (err) {
      console.error(`[Workflow] Node ${id} error:`, err);
      node.result = { error: err.message };
      this._setNodePreview(node, 'failed');
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
  module.exports = { WorkflowCanvas, NODE_TYPES, TYPE_COLORS, CATEGORIES, MODEL_CATALOG };
} else {
  window.WorkflowCanvas = WorkflowCanvas;
  window.NODE_TYPES = NODE_TYPES;
  window.TYPE_COLORS = TYPE_COLORS;
  window.CATEGORIES = CATEGORIES;
  window.MODEL_CATALOG = MODEL_CATALOG;
}

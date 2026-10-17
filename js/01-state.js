      const canvas = document.getElementById('cv');
      const ctx = canvas.getContext('2d');
      const stage = document.getElementById('stage');
      const textInput = document.getElementById('textInput');
      const colorInput = document.getElementById('color');
      const bgColorInput = document.getElementById('bgcolor');
      const sizeInput = document.getElementById('size');
      const frameWInput = document.getElementById('frameW');
      const frameHInput = document.getElementById('frameH');
      const videoBtn = document.getElementById('videoBtn');
      const centerFrameBtn = document.getElementById('centerFrameBtn');
      const saveBtn = document.getElementById('saveBtn');
      const openBtn = document.getElementById('openBtn');
      const openFile = document.getElementById('openFile');
      const toolButtons = Array.from(document.querySelectorAll('.tool[data-tool]'));
      const tlNames = document.getElementById('tlNames');
      const tlNamesInner = document.getElementById('tlNamesInner');
      const tlTracks = document.getElementById('tlTracks');
      const tlRuler = document.getElementById('tlRuler');
      const tlRows = document.getElementById('tlRows');
      const tlPlayhead = document.getElementById('tlPlayhead');
      const timeLabel = document.getElementById('timeLabel');
      const playBtn = document.getElementById('playBtn');
      const durInput = document.getElementById('durInput');
      const fillBtn = document.getElementById('fillBtn');
      const snapBtn = document.getElementById('snapBtn');
      const onionBtn = document.getElementById('onionBtn');
      const onionPrevIn = document.getElementById('onionPrevIn');
      const onionNextIn = document.getElementById('onionNextIn');
      const onionStepIn = document.getElementById('onionStepIn');
      const curveCv = document.getElementById('curveCv');
      const curveCtx = curveCv.getContext('2d');
      const curveVals = document.getElementById('curveVals');
      const curveNums = document.getElementById('curveNums');
      const curvePresets = document.getElementById('curvePresets');
      const timelineEl = document.getElementById('timeline');
      const curvePanel = document.querySelector('.tl-curve');
      const toolbarEl = document.getElementById('toolbar');
      const stageEl = document.getElementById('stage');
      const gutterH = document.getElementById('gutterH');
      const gutterNamesEl = document.getElementById('gutterNames');
      const gutterCurveEl = document.getElementById('gutterCurve');
      const dockHint = document.getElementById('dockHint');
      let timelineDock = 'bottom';
      let curveDock = 'right';

      const shapes = [];
      let tool = 'stroke';
      let drawing = null;
      let selected = null;
      let moving = null;
      let lastPoint = null;
      let scaling = null;
      let rotating = null;
      let activeCh = null;
      const KF_GROUPS = { move: ['x', 'y'], scale: ['sx', 'sy'], rot: ['rot'] };
      const kfEnabled = { move: true, scale: true, rot: true };

      function kfChannels() {
        const out = [];
        for (const g in KF_GROUPS) if (kfEnabled[g]) out.push(...KF_GROUPS[g]);
        return out;
      }

      let duration = 5;
      let currentTime = 0;
      let playing = false;
      let scrubbing = false;
      const tlView = { t0: 0, t1: duration, vscale: 1, rowY: 0 };
      let tlPan = null;
      let kfDrag = null;
      let keySel = new Set();
      const frame = { x: 0, y: 0, w: 640, h: 360 };
      const frameWant = { w: 640, h: 360 };
      let frameReady = false;
      let framePinned = false;
      let frameDrag = null;
      let textEdit = null;
      let fillMode = false; // 新建图形的默认填充状态
      let snapGuide = { x: null, y: null }; // 当前吸附到的参考线（世界坐标）
      let snapEnabled = true; // 移动吸附总开关
      let tMode = null;   // Blender 式变换: null | 'grab' | 'scale'
      let tAxis = null;   // 约束轴: null | 'x' | 'y'
      let tStart = null;  // 变换起始状态
      let lastMouse = { x: 0, y: 0 }; // 画布内最近鼠标位置（CSS 像素）
      let suppressOverlay = false;
      let recording = false;
      let videoTap = null;
      let rafId = 0;
      let lastFrame = 0;
      let nextId = 1;
      let typeCount = { stroke: 0, line: 0, rect: 0, circle: 0, text: 0 };
      const typeNames = { stroke: '笔画', line: '直线', rect: '方块', circle: '圆形', text: '文字' };
      const TEXT_FONT = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';
      const isStrokeLike = (t) => t === 'stroke' || t === 'line';
      const KEY_EPS = 0.005;

      const LINEAR = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const STEP = { x1: 0, y1: 0, x2: 1, y2: 1, step: true };
      const CURVE_YMIN = -0.4;
      const CURVE_YMAX = 1.6;
      const PRESETS = [
        { name: '线性', v: [0, 0, 1, 1] },
        { name: '缓入', v: [0.42, 0, 1, 1] },
        { name: '缓出', v: [0, 0, 0.58, 1] },
        { name: '缓入缓出', v: [0.42, 0, 0.58, 1] },
        { name: '回弹', v: [0.34, 1.56, 0.64, 1] }
      ];
      let activeKey = null;
      let curveDrag = null;
      let curvePanLast = null;
      const CURVE_ZOOM_MIN = 1;
      const CURVE_ZOOM_MAX = 8;
      const curveView = { zoom: 1, panX: 0, panY: 0 };
      let lastSegA = null;
      let lastSegB = null;

      let dpr = 1;
      const VIEW_MIN = 0.1;
      const VIEW_MAX = 8;
      const view = { zoom: 1, x: 0, y: 0 };
      let viewPan = null;

      // ===== 洋葱皮：显示当前帧前后若干帧的幽灵轮廓 =====
      let onionOn = false;
      let onionPrev = 2;   // 当前帧之前显示几帧幽灵
      let onionNext = 2;   // 当前帧之后显示几帧幽灵
      let onionStep = 0.2; // 相邻幽灵帧的时间间隔（秒）

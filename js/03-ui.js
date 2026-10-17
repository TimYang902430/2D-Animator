
      function resize() {
        const rect = stage.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        if (!frameReady) {
          frameWant.w = Number(frameWInput.value) || 640;
          frameWant.h = Number(frameHInput.value) || 360;
          frameCtrl.applyWant();
          frameReady = true;
        } else if (framePinned) {
          frameCtrl.clamp();
        }
        // 其余情况：画框保持世界坐标不动（全屏/改尺寸只改变可视区域，不移动内容）
        frameCtrl.syncInputs();
        render();
        timeline.clampTlV();
        timeline.applyTlScroll();
        timeline.buildRuler();
        curveEditor.resizeCurve();
      }
      window.addEventListener('resize', resize);

      const fsBtn = document.getElementById('fsBtn');
      let autoFullscreen = true;
      let fsPending = false;

      function updateFsBtn() {
        fsBtn.textContent = document.fullscreenElement ? tr('⛶ 退出全屏') : tr('⛶ 全屏');
      }

      function enterFullscreen() {
        const box = document.documentElement;
        const fn = box.requestFullscreen || box.webkitRequestFullscreen;
        if (!fn) return;
        try {
          const p = fn.call(box);
          if (p && p.catch) p.catch(() => { });
        } catch (err) { }
      }

      function exitFullscreen() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (!fn) return;
        try {
          const p = fn.call(document);
          if (p && p.catch) p.catch(() => { });
        } catch (err) { }
      }

      function fullscreenOn() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
      }

      fsBtn.addEventListener('click', () => {
        if (fullscreenOn()) exitFullscreen();
        else enterFullscreen();
      });

      document.addEventListener('fullscreenchange', () => {
        fsPending = false;
        if (!fullscreenOn()) autoFullscreen = false;
        updateFsBtn();
        requestAnimationFrame(resize);
      });
      document.addEventListener('webkitfullscreenchange', () => {
        fsPending = false;
        if (!fullscreenOn()) autoFullscreen = false;
        updateFsBtn();
        requestAnimationFrame(resize);
      });

      function onAnyPress(e) {
        if (e.button != null && e.button !== 0) return;
        if (fsPending || fullscreenOn() || !autoFullscreen) return;
        if (e.target && e.target.closest && e.target.closest('#fsBtn, .gutter, .panel-grip, #ctxMenu, #pathBar')) return;
        fsPending = true;
        enterFullscreen();
        setTimeout(() => { fsPending = false; }, 600);
      }

      document.addEventListener('pointerdown', onAnyPress, true);
      document.addEventListener('click', onAnyPress, true);

      const PANEL_MIN = { tl: 190, reserve: 240, names: 56, namesMax: 280, curve: 120, curveMax: 360 };
      let panelDrag = null;
      let dockDrag = null;

      function clampNum(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
      }

      function applyPanelDrag(e) {
        const d = panelDrag;
        if (!d) return;
        if (d.kind === 'h') {
          const max = Math.max(PANEL_MIN.tl, window.innerHeight - PANEL_MIN.reserve);
          const dy = e.clientY - d.y0;
          const want = d.tlH + (timelineDock === 'top' ? dy : -dy);
          timelineEl.style.height = clampNum(want, PANEL_MIN.tl, max) + 'px';
          resize();
        } else if (d.kind === 'names') {
          tlNames.style.width = clampNum(d.namesW + (e.clientX - d.x0), PANEL_MIN.names, PANEL_MIN.namesMax) + 'px';
        } else if (d.kind === 'curve') {
          const dx = e.clientX - d.x0;
          const want = d.curveW + (curveDock === 'left' ? dx : -dx);
          curvePanel.style.width = clampNum(want, PANEL_MIN.curve, PANEL_MIN.curveMax) + 'px';
          curveEditor.resizeCurve();
        }
      }

      function bindGutter(el, kind) {
        function stop() {
          if (!panelDrag) return;
          panelDrag = null;
          el.classList.remove('dragging');
          resize();
        }
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          panelDrag = {
            kind,
            x0: e.clientX,
            y0: e.clientY,
            tlH: timelineEl.getBoundingClientRect().height,
            namesW: tlNames.getBoundingClientRect().width,
            curveW: curvePanel.getBoundingClientRect().width
          };
          el.classList.add('dragging');
          try { el.setPointerCapture(e.pointerId); } catch (err) { }
        });
        el.addEventListener('pointermove', (e) => {
          if (!panelDrag || panelDrag.kind !== kind) return;
          if (!(e.buttons & 1)) { stop(); return; }
          applyPanelDrag(e);
        });
        el.addEventListener('pointerup', stop);
        el.addEventListener('pointercancel', stop);
      }

      bindGutter(gutterH, 'h');
      bindGutter(gutterNamesEl, 'names');
      bindGutter(gutterCurveEl, 'curve');

      function showDockHint(x, y, w, h) {
        dockHint.style.display = 'block';
        dockHint.style.left = x + 'px';
        dockHint.style.top = y + 'px';
        dockHint.style.width = w + 'px';
        dockHint.style.height = h + 'px';
      }

      function dockTimeline(pos) {
        if (pos === 'top') toolbarEl.after(timelineEl, gutterH, stageEl);
        else toolbarEl.after(stageEl, gutterH, timelineEl);
        timelineDock = pos;
        resize();
      }

      function dockCurve(pos) {
        const body = document.querySelector('.tl-body');
        const seq = pos === 'left'
          ? [curvePanel, gutterCurveEl, tlNames, gutterNamesEl, tlTracks]
          : [tlNames, gutterNamesEl, tlTracks, gutterCurveEl, curvePanel];
        for (const el of seq) body.appendChild(el);
        curveDock = pos;
        curveEditor.resizeCurve();
      }

      function updateDockTarget(e) {
        if (!dockDrag) return;
        if (dockDrag.kind === 'timeline') {
          const sr = stageEl.getBoundingClientRect();
          const tlr = timelineEl.getBoundingClientRect();
          const tb = toolbarEl.getBoundingClientRect();
          dockDrag.target = e.clientY < sr.top + sr.height / 2 ? 'top' : 'bottom';
          if (dockDrag.target === 'top') showDockHint(tb.left, tb.bottom, window.innerWidth, tlr.height);
          else showDockHint(0, window.innerHeight - tlr.height, window.innerWidth, tlr.height);
        } else {
          const br = document.querySelector('.tl-body').getBoundingClientRect();
          const cr = curvePanel.getBoundingClientRect();
          dockDrag.target = e.clientX < br.left + br.width / 2 ? 'left' : 'right';
          if (dockDrag.target === 'left') showDockHint(br.left, br.top, cr.width, br.height);
          else showDockHint(br.right - cr.width, br.top, cr.width, br.height);
        }
      }

      function endDock(apply) {
        dockHint.style.display = 'none';
        document.body.classList.remove('docking');
        const d = dockDrag;
        dockDrag = null;
        if (!d || !apply) return;
        if (d.kind === 'timeline' && d.target !== timelineDock) dockTimeline(d.target);
        else if (d.kind === 'curve' && d.target !== curveDock) dockCurve(d.target);
      }

      function bindPanelGrip(el, kind) {
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          dockDrag = { kind, target: null };
          document.body.classList.add('docking');
          try { el.setPointerCapture(e.pointerId); } catch (err) { }
          updateDockTarget(e);
        });
        el.addEventListener('pointermove', (e) => {
          if (!dockDrag || dockDrag.kind !== kind) return;
          if (!(e.buttons & 1)) { endDock(false); return; }
          updateDockTarget(e);
        });
        el.addEventListener('pointerup', () => {
          if (!dockDrag || dockDrag.kind !== kind) return;
          endDock(true);
        });
        el.addEventListener('pointercancel', () => endDock(false));
      }

      bindPanelGrip(document.getElementById('tlGrip'), 'timeline');
      bindPanelGrip(document.getElementById('curveGrip'), 'curve');

      function applyToolCursor() {
        canvas.style.cursor = tool === 'select' ? 'default'
          : (tool === 'frame' ? 'move' : (tool === 'text' ? 'text' : 'crosshair'));
      }

      function setTool(next) {
        if (pathDraw) { pathDraw = null; hidePathBar(); }
        if (tMode) endT(false);
        tool = next;
        toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === next));
        applyToolCursor();
        if (next !== 'select') { selected = null; moving = null; lastPoint = null; scaling = null; rotating = null; activeKey = null; activeCh = null; keySel.clear(); }
        render();
      }

      toolButtons.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

      // 实心填充：有选中图形（矩形/圆形）时切换它的填充；否则切换新建默认
      fillBtn.addEventListener('click', () => {
        if (selected && (selected.type === 'rect' || selected.type === 'circle')) {
          history.record();
          selected.filled = !selected.filled;
          fillBtn.classList.toggle('active', selected.filled);
          render();
        } else {
          fillMode = !fillMode;
          fillBtn.classList.toggle('active', fillMode);
        }
      });

      // 移动吸附开关
      snapBtn.addEventListener('click', () => {
        snapEnabled = !snapEnabled;
        snapBtn.classList.toggle('active', snapEnabled);
        if (!snapEnabled) { snapGuide.x = null; snapGuide.y = null; }
        render();
      });

      function readOnion() {
        onionPrev = clampNum(Number(onionPrevIn.value) || 0, 0, 8);
        onionNext = clampNum(Number(onionNextIn.value) || 0, 0, 8);
        onionStep = clampNum(Number(onionStepIn.value) || 0.2, 0.05, 2);
      }
      onionBtn.addEventListener('click', () => {
        onionOn = !onionOn;
        onionBtn.textContent = onionOn ? tr('开') : tr('关');
        onionBtn.classList.toggle('active', onionOn);
        render();
      });
      onionPrevIn.addEventListener('input', () => { readOnion(); render(); });
      onionNextIn.addEventListener('input', () => { readOnion(); render(); });
      onionStepIn.addEventListener('input', () => { readOnion(); render(); });


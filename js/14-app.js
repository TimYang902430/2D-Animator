      const doc = new Doc();
      const timeline = new Timeline();
      const curveEditor = new CurveEditor();

      const GRID_T_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 30];
      const GRID_Y_STEPS = [0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1];

      const presetButtons = PRESETS.map(p => {
        const btn = document.createElement('button');
        btn.textContent = p.name;
        btn._v = p.v;
        btn.addEventListener('click', () => {
          const es = curveEditor.curveEases();
          if (!es.length) return;
          history.record();
          for (const e of es) {
            e.step = false;
            e.x1 = p.v[0]; e.y1 = p.v[1]; e.x2 = p.v[2]; e.y2 = p.v[3];
          }
          curveEditor.previewSegment();
          player.setTime(currentTime);
          curveEditor.drawCurve();
        });
        curvePresets.appendChild(btn);
        return btn;
      });

      const CURVE_HANDLE_HIT = 24;
      const CURVE_BODY_HIT = 12;

      curveCv.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        const g = curveEditor.curveGeom();
        const p = curveEditor.curveLocal(ev);
        const grip = curveEditor.curveHandleHit(p, g) || curveEditor.curveBodyHit(p, g);
        if (grip) {
          history.begin();
          curveDrag = grip;
          curveEditor.previewSegment();
          curveEditor.applyCurveDrag(p, g);
        } else {
          curveDrag = 'pan';
          curvePanLast = { x: ev.clientX, y: ev.clientY };
          curveCv.style.cursor = 'grabbing';
        }
        try { curveCv.setPointerCapture(ev.pointerId); } catch (err) { }
      });
      curveCv.addEventListener('pointermove', (ev) => {
        if (!curveDrag) {
          const g = curveEditor.curveGeom();
          const p = curveEditor.curveLocal(ev);
          curveCv.style.cursor = (curveEditor.curveHandleHit(p, g) || curveEditor.curveBodyHit(p, g)) ? 'move' : 'grab';
          return;
        }
        if (curveDrag === 'pan') {
          const dx = ev.clientX - curvePanLast.x;
          const dy = ev.clientY - curvePanLast.y;
          curvePanLast = { x: ev.clientX, y: ev.clientY };
          curveView.panX += dx;
          curveView.panY += dy;
          curveEditor.clampCurveView();
          curveEditor.drawCurve();
          return;
        }
        curveEditor.applyCurveDrag(curveEditor.curveLocal(ev), curveEditor.curveGeom());
      });

      curveCv.addEventListener('pointerup', () => curveEditor.endCurveDrag());
      curveCv.addEventListener('pointercancel', () => curveEditor.endCurveDrag());

      curveCv.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const g = curveEditor.curveGeom();
        const p = curveEditor.curveLocal(ev);
        const z0 = curveView.zoom;
        const z1 = clampNum(z0 * Math.exp(-ev.deltaY * 0.0015), CURVE_ZOOM_MIN, CURVE_ZOOM_MAX);
        if (z1 === z0) return;
        const range = CURVE_YMAX - CURVE_YMIN;
        const spanX = g.X(1) - g.X(0);
        const spanY = g.Y(CURVE_YMIN) - g.Y(CURVE_YMAX);
        const worldX = spanX > 0 ? (p.x - g.X(0)) / spanX : 0;
        const worldV = CURVE_YMIN + (spanY > 0 ? (g.Y(CURVE_YMIN) - p.y) / spanY : 0) * range;
        curveView.zoom = z1;
        curveView.panX = p.x - g.pad - worldX * (g.w - 2 * g.pad) * z1;
        curveView.panY = p.y - (g.h - g.pad) + ((worldV - CURVE_YMIN) / range) * (g.h - 2 * g.pad) * z1;
        curveEditor.clampCurveView();
        curveEditor.drawCurve();
      }, { passive: false });

      curveCv.addEventListener('dblclick', () => curveEditor.resetCurveView());
      document.getElementById('curveResetBtn').addEventListener('click', () => curveEditor.resetCurveView());

      playBtn.addEventListener('click', () => player.togglePlay());

      const kfChips = Array.from(document.querySelectorAll('.kf-chip'));
      kfChips.forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.kf;
          const turningOff = kfEnabled[key];
          const onCount = Object.keys(kfEnabled).filter(k => kfEnabled[k]).length;
          if (turningOff && onCount <= 1) return;
          kfEnabled[key] = !turningOff;
          btn.classList.toggle('active', kfEnabled[key]);
        });
      });

      document.getElementById('keyBtn').addEventListener('click', () => {
        if (!selected) return;
        history.record();
        let chs = kfChannels();
        if (!chs.length) chs = CHANNELS.slice();
        if (activeCh === PATH_CH && hasPath(selected)) {
          addKeyAt(selected, PATH_CH, currentTime);
        } else {
          for (const ch of chs) addKeyAt(selected, ch, currentTime);
          if (!activeCh || chs.indexOf(activeCh) < 0) activeCh = chs[0];
        }
        const keys = selected.ch[activeCh].keys;
        const i = keys.findIndex(k => Math.abs(k.t - currentTime) < KEY_EPS);
        if (i < 0) activeKey = null;
        else activeKey = (i === keys.length - 1 && keys.length > 1) ? keys[i - 1] : keys[i];
        timeline.buildTimeline();
      });

      document.getElementById('delKeyBtn').addEventListener('click', () => {
        if (!selected || !activeCh) return;
        history.record();
        if (keySel.size) {
          const items = timeline.collectKeySel();
          for (const it of items) {
            const arr = it.s.ch[it.ch].keys;
            const i = arr.indexOf(it.k);
            if (i >= 0) arr.splice(i, 1);
          }
          keySel.clear();
          activeKey = null;
          timeline.buildTimeline();
          player.setTime(currentTime);
          return;
        }
        if (removeKeyAt(selected, activeCh, currentTime)) {
          activeKey = null;
          timeline.buildTimeline();
          player.setTime(currentTime);
        }
      });

      function placeVisKey(v, instant) {
        if (!selected) return;
        const s = selected;
        player.pause();
        history.record();
        const key = addKeyVal(s, 'op', currentTime, v);
        const keys = s.ch.op.keys;
        const i = keys.indexOf(key);
        let showKey = key;
        if (i > 0) {
          keys[i - 1].ease = instant ? { ...STEP } : { ...LINEAR };
          showKey = keys[i - 1];
        }
        activeCh = 'op';
        activeKey = showKey;
        timeline.buildTimeline();
        player.setTime(currentTime);
        curveEditor.drawCurve();
      }

      document.getElementById('showBtn').addEventListener('click', () => placeVisKey(1, true));
      document.getElementById('hideBtn').addEventListener('click', () => placeVisKey(0, true));
      document.getElementById('fadeInBtn').addEventListener('click', () => placeVisKey(1, false));
      document.getElementById('fadeOutBtn').addEventListener('click', () => placeVisKey(0, false));

      durInput.addEventListener('change', () => {
        const v = Math.max(1, Math.min(60, Number(durInput.value) || 5));
        durInput.value = v;
        history.record();
        duration = v;
        for (const s of shapes) {
          for (const ch of shapeChannels(s)) {
            const keys = s.ch[ch].keys;
            for (const k of keys) if (k.t > duration) k.t = duration;
            keys.sort((a, b) => a.t - b.t);
            s.ch[ch].keys = keys.filter((k, i) => i === 0 || k.t - keys[i - 1].t > KEY_EPS);
          }
        }
        tlView.t0 = 0;
        tlView.t1 = duration;
        timeline.buildTimeline();
        player.setTime(Math.min(currentTime, duration));
      });

      tlTracks.addEventListener('pointerdown', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          tlPan = { x: e.clientX, y: e.clientY };
          tlTracks.style.cursor = 'grabbing';
          try { tlTracks.setPointerCapture(e.pointerId); } catch (err) { }
          return;
        }
        if (e.button !== 0) return;
        player.pause();
        scrubbing = true;
        try { tlTracks.setPointerCapture(e.pointerId); } catch (err) { }
        player.scrubTo(e);
      });
      tlTracks.addEventListener('pointermove', (e) => {
        if (tlPan) {
          const rect = tlTracks.getBoundingClientRect();
          const dx = e.clientX - tlPan.x;
          const dy = e.clientY - tlPan.y;
          tlPan = { x: e.clientX, y: e.clientY };
          const span = timeline.tlSpan();
          tlView.t0 -= (dx / Math.max(1, rect.width)) * span;
          tlView.t1 = tlView.t0 + span;
          tlView.rowY -= dy;
          timeline.clampTlH();
          timeline.clampTlV();
          timeline.buildTimeline();
          return;
        }
        if (scrubbing) player.scrubTo(e);
      });
      function endTlPointer() {
        scrubbing = false;
        if (tlPan) { tlPan = null; tlTracks.style.cursor = ''; }
      }
      tlTracks.addEventListener('pointerup', endTlPointer);
      tlTracks.addEventListener('pointercancel', endTlPointer);
      tlTracks.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

      tlTracks.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = tlTracks.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * 0.0015);
        if (e.ctrlKey || e.metaKey) {
          const f = rect.width > 0 ? clampNum((e.clientX - rect.left) / rect.width, 0, 1) : 0.5;
          const span = timeline.tlSpan();
          const tAt = tlView.t0 + f * span;
          const minSpan = Math.min(0.05, duration);
          const nSpan = clampNum(span / factor, minSpan, duration);
          tlView.t0 = tAt - f * nSpan;
          tlView.t1 = tlView.t0 + nSpan;
          timeline.clampTlH();
        } else {
          // 垂直缩放行高：锚定鼠标所指行，保证名称文字始终不小于下限
          const localY = Math.max(0, e.clientY - tlRuler.getBoundingClientRect().bottom);
          const rowIdx = (tlView.rowY + localY) / (timeline.tlRowH() || 1);
          tlView.vscale = clampNum(tlView.vscale * factor, 0.5, 4);
          tlView.rowY = rowIdx * timeline.tlRowH() - localY;
          timeline.clampTlV();
        }
        timeline.buildTimeline();
      }, { passive: false });

      document.getElementById('clear').addEventListener('click', () => {
        player.pause();
        hideTextEditor();
        if (pathDraw) { pathDraw = null; hidePathBar(); }
        history.record();
        shapes.length = 0;
        selected = null;
        moving = null;
        lastPoint = null;
        scaling = null;
        activeKey = null;
        keySel.clear();
        drawing = null;
        typeCount = { stroke: 0, line: 0, rect: 0, circle: 0, text: 0 };
        nextId = 1;
        timeline.buildTimeline();
        player.setTime(0);
      });

      resize();
      setTool('stroke');
      timeline.buildTimeline();
      player.setTime(0);
      updateFsBtn();

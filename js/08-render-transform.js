      // ---- 撤销 / 重做（Ctrl+Z / Ctrl+Y，上限 50 步） ----
      const UNDO_LIMIT = 50;
      const undoStack = [];
      const redoStack = [];
      let histPending = null; // 手势开始时的快照，手势结束才提交
      let histBusy = false;   // 恢复期间不再记录

      function drawContent(c) {
        for (const s of shapes) Geom.drawShape(s, c);
        if (drawing) Geom.drawBase(drawing.type, drawing, drawing.color, drawing.width, c, fillMode);
      }

      function renderToTap() {
        const t = videoTap;
        const c = t.octx;
        c.setTransform(t.scale, 0, 0, t.scale, -t.fx * t.scale, -t.fy * t.scale);
        c.fillStyle = bgColorInput.value;
        c.fillRect(t.fx, t.fy, t.fw, t.fh);
        drawContent(c);
        c.setTransform(1, 0, 0, 1, 0, 0);
      }

      // 洋葱皮：绘制当前帧前后若干帧的幽灵轮廓。之前帧偏红、之后帧偏蓝，越远越淡。
      function drawOnion(c) {
        if (!onionOn) return;
        if (onionPrev <= 0 && onionNext <= 0) return;
        const saved = shapes.map(s => ({ s, tf: { x: s.tf.x, y: s.tf.y, sx: s.tf.sx, sy: s.tf.sy, rot: s.tf.rot, op: s.tf.op } }));
        try {
          for (let i = onionPrev; i >= 1; i--) {
            const t = currentTime - i * onionStep;
            if (t < 0) continue;
            const a = 0.38 * (1 - (i - 1) / Math.max(onionPrev, 1));
            applyAnimation(t);
            for (const s of shapes) Geom.drawGhost(s, '#e05a3c', Math.max(0.04, a), c);
          }
          for (let i = 1; i <= onionNext; i++) {
            const t = currentTime + i * onionStep;
            if (t > duration) continue;
            const a = 0.38 * (1 - (i - 1) / Math.max(onionNext, 1));
            applyAnimation(t);
            for (const s of shapes) Geom.drawGhost(s, '#3b6fd0', Math.max(0.04, a), c);
          }
        } finally {
          // 回填原变换（保持对象引用不变），再恢复当前帧
          for (const it of saved) { it.s.tf.x = it.tf.x; it.s.tf.y = it.tf.y; it.s.tf.sx = it.tf.sx; it.s.tf.sy = it.tf.sy; it.s.tf.rot = it.tf.rot; it.s.tf.op = it.tf.op; }
          applyAnimation(currentTime);
        }
      }

      function render() {
        const W = viewCtrl.canvasW(), H = viewCtrl.canvasH();
        fillBtn.classList.toggle('active', selected ? !!selected.filled : fillMode);
        if (selected && colorInput.value !== selected.color) colorInput.value = selected.color;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = bgColorInput.value;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(view.x, view.y);
        ctx.scale(view.zoom, view.zoom);
        drawOnion(ctx);
        drawContent(ctx);
        if (!suppressOverlay) frameCtrl.draw();
        if (!suppressOverlay) drawPathOverlay();
        if (selected && !suppressOverlay) Geom.drawSelection(selected);
        // 吸附参考线（贯穿画布）
        if (!suppressOverlay && (snapGuide.x !== null || snapGuide.y !== null)) {
          ctx.save();
          ctx.strokeStyle = 'rgba(47, 111, 237, .9)';
          ctx.lineWidth = 1.5 / view.zoom;
          ctx.setLineDash([5 / view.zoom, 4 / view.zoom]);
          ctx.beginPath();
          if (snapGuide.x !== null) { ctx.moveTo(snapGuide.x, -1e5); ctx.lineTo(snapGuide.x, 1e5); }
          if (snapGuide.y !== null) { ctx.moveTo(-1e5, snapGuide.y); ctx.lineTo(1e5, snapGuide.y); }
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        if (videoTap) renderToTap();
      }

      function moveShape(s, dx, dy) {
        const t = Geom.tfOf(s);
        if (hasPath(s)) {
          Geom.translatePath(s.path, dx, dy);
          const p = Geom.pathPointAt(s.path, sampleChannel(s.ch[PATH_CH].keys, currentTime, 0));
          t.x = p.x - s.pivot.x;
          t.y = p.y - s.pivot.y;
          return;
        }
        const adj = Geom.snapMove(s, dx, dy);
        t.x += adj.dx;
        t.y += adj.dy;
        snapGuide.x = adj.gx;
        snapGuide.y = adj.gy;
      }

      // ===== Blender 式变换：G 移动 / S 缩放 / X/Y 轴约束 =====
      function startT(mode) {
        if (!selected || pathDraw) return;
        history.begin();
        const t = Geom.tfOf(selected);
        tMode = mode;
        tAxis = null;
        tStart = { x: t.x, y: t.y, sx: t.sx, sy: t.sy, mx: lastMouse.x, my: lastMouse.y };
        render();
      }

      function updateT() {
        if (!tMode || !selected || !tStart) return;
        const s = selected, t = s.tf;
        const dxw = (lastMouse.x - tStart.mx) / view.zoom;
        const dyw = (lastMouse.y - tStart.my) / view.zoom;
        if (tMode === 'grab') {
          const dx = tAxis === 'y' ? 0 : dxw;
          const dy = tAxis === 'x' ? 0 : dyw;
          const adj = Geom.snapMove(s, dx, dy);
          t.x = tStart.x + adj.dx;
          t.y = tStart.y + adj.dy;
          snapGuide.x = adj.gx;
          snapGuide.y = adj.gy;
          refreshKey(s, 'x', currentTime);
          refreshKey(s, 'y', currentTime);
        } else {
          let f = 1 + dxw / 100;
          if (f < 0.01) f = 0.01;
          if (tAxis === 'x') t.sx = tStart.sx * f;
          else if (tAxis === 'y') t.sy = tStart.sy * f;
          else { t.sx = tStart.sx * f; t.sy = tStart.sy * f; }
          refreshKey(s, 'sx', currentTime);
          refreshKey(s, 'sy', currentTime);
        }
        render();
      }

      function endT(commit) {
        if (!tMode) return;
        if (!commit && selected && tStart) {
          const t = selected.tf;
          t.x = tStart.x; t.y = tStart.y; t.sx = tStart.sx; t.sy = tStart.sy;
          refreshKey(selected, 'x', currentTime);
          refreshKey(selected, 'y', currentTime);
          refreshKey(selected, 'sx', currentTime);
          refreshKey(selected, 'sy', currentTime);
        }
        tMode = null; tAxis = null; tStart = null;
        snapGuide.x = null; snapGuide.y = null;
        history.commit(); // 取消时与起始快照相同，不会记录
        render();
      }

      function clampScale(v) {
        if (!isFinite(v)) return 1;
        if (Math.abs(v) < 0.02) return v < 0 ? -0.02 : 0.02;
        return v;
      }

      function startScale(s, handle, p) {
        scaling = { s, handle };
        moving = null;
        lastPoint = null;
        rotating = null;
        canvas.style.cursor = HANDLE_CURSOR[handle] || 'default';
      }

      function updateScale(p) {
        const sc = scaling;
        if (!sc) return;
        const s = sc.s;
        const b = Geom.baseBounds(s);
        const t = Geom.tfOf(s);
        const q = Geom.frameOffset(s, p);
        const h = sc.handle;
        if (h.indexOf('e') >= 0 || h.indexOf('w') >= 0) {
          const hx = (h.indexOf('e') >= 0 ? (b.x + b.w) : b.x) - s.pivot.x;
          if (Math.abs(hx) > 0.5) t.sx = clampScale(q.x / hx);
        }
        if (h.indexOf('s') >= 0 || h.indexOf('n') >= 0) {
          const hy = (h.indexOf('s') >= 0 ? (b.y + b.h) : b.y) - s.pivot.y;
          if (Math.abs(hy) > 0.5) t.sy = clampScale(q.y / hy);
        }
      }

      function endScale() {
        if (!scaling) return;
        const s = scaling.s;
        scaling = null;
        refreshKey(s, 'sx', currentTime);
        refreshKey(s, 'sy', currentTime);
        canvas.style.cursor = 'move';
        timeline.buildTimeline();
        render();
        history.commit();
      }

      function startRotate(s, p) {
        const c = { x: s.pivot.x + s.tf.x, y: s.pivot.y + s.tf.y };
        rotating = { s, center: c, start: Math.atan2(p.y - c.y, p.x - c.x), base: s.tf.rot };
        moving = null;
        lastPoint = null;
        scaling = null;
        canvas.style.cursor = 'grabbing';
      }

      function updateRotate(p, e) {
        const r = rotating;
        if (!r) return;
        const a = Math.atan2(p.y - r.center.y, p.x - r.center.x);
        let rot = r.base + (a - r.start);
        if (e && e.shiftKey) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
        r.s.tf.rot = rot;
      }

      function endRotate() {
        if (!rotating) return;
        const s = rotating.s;
        rotating = null;
        refreshKey(s, 'rot', currentTime);
        canvas.style.cursor = 'move';
        timeline.buildTimeline();
        render();
        history.commit();
      }

      function endMove() {
        if (!moving) return;
        const s = moving;
        moving = null;
        lastPoint = null;
        snapGuide.x = null;
        snapGuide.y = null;
        refreshKey(s, 'x', currentTime);
        refreshKey(s, 'y', currentTime);
        canvas.style.cursor = 'move';
        timeline.buildTimeline();
        render();
        history.commit();
      }


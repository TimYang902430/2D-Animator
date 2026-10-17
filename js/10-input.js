      function snapAngle(a, p) {
        const dx = p.x - a.x, dy = p.y - a.y;
        const len = Math.hypot(dx, dy);
        const step = Math.PI / 4;
        const ang = Math.round(Math.atan2(dy, dx) / step) * step;
        return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
      }

      canvas.addEventListener('pointerdown', (e) => {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
        const p = viewCtrl.toLocal(e);
        const color = colorInput.value;
        const width = Number(sizeInput.value);
        if (e.button === 1) {
          e.preventDefault();
          viewPan = { x: e.clientX, y: e.clientY };
          canvas.style.cursor = 'grabbing';
          return;
        }
        if (tMode && e.button === 0) { e.preventDefault(); endT(true); return; }
        if (pathDraw) {
          if (e.button === 0) pathPointerDown(p);
          return;
        }
        if (e.button !== 0) return;
        if (textEdit) commitTextEditor();

        if (tool === 'select') {
          history.begin();
          if (e.button !== 0) return;
          const grip = Geom.handleAt(p, selected);
          if (grip === 'rot') {
            startRotate(selected, p);
            render();
            return;
          }
          if (grip) {
            startScale(selected, grip, p);
            render();
            return;
          }
          if (moving) {
            endMove();
            return;
          }
          const hit = Geom.hitTest(p);
          if (hit !== selected) { activeKey = null; activeCh = null; }
          keySel.clear(); // 点击画布即退出时间轴关键帧选择，确保 Del 回到"删除物体"语义
          selected = hit;
          moving = hit;
          lastPoint = hit ? { x: p.x, y: p.y } : null;
          canvas.style.cursor = hit ? 'grabbing' : 'default';
          timeline.buildTimeline();
          render();
          return;
        }

        if (tool === 'frame') {
          history.begin();
          if (e.button !== 0) return;
          const grip = frameCtrl.handleAt(p);
          frameDrag = { mode: grip || 'move', x0: p.x, y0: p.y, orig: { x: frame.x, y: frame.y, w: frame.w, h: frame.h } };
          render();
          return;
        }

        if (tool === 'text') {
          history.begin();
          if (e.button !== 0) return;
          e.preventDefault();
          openTextEditor(p, null);
          return;
        }

        if (tool === 'stroke') {
          history.begin();
          drawing = { type: 'stroke', points: [p], color, width };
        } else if (tool === 'line') {
          history.begin();
          drawing = { type: 'line', points: [{ x: p.x, y: p.y }, { x: p.x, y: p.y }], color, width };
        } else if (tool === 'rect') {
          history.begin();
          drawing = { type: 'rect', x: p.x, y: p.y, w: 0, h: 0, color, width };
        } else if (tool === 'circle') {
          history.begin();
          drawing = { type: 'circle', x: p.x, y: p.y, r: 0, color, width };
        }
        render();
      });

      canvas.addEventListener('pointermove', (e) => {
        const rect = canvas.getBoundingClientRect();
        lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const p = viewCtrl.toLocal(e);
        if (tMode) { updateT(); return; }
        if (viewPan) {
          if (!(e.buttons & 4)) { viewPan = null; applyToolCursor(); return; }
          view.x += e.clientX - viewPan.x;
          view.y += e.clientY - viewPan.y;
          viewPan = { x: e.clientX, y: e.clientY };
          render();
          return;
        }
        if (pathDraw) { pathPointerMove(p); return; }
        if (tool === 'frame') {
          if (frameDrag) {
            if (!(e.buttons & 1)) { frameDrag = null; return; }
            frameCtrl.updateDrag(p);
            render();
          } else {
            const grip = frameCtrl.handleAt(p);
            canvas.style.cursor = grip ? FRAME_CURSOR[grip] : 'move';
          }
          return;
        }
        if (tool === 'select') {
          if (rotating) {
            if (!(e.buttons & 1)) { endRotate(); return; }
            updateRotate(p, e);
            render();
          } else if (scaling) {
            if (!(e.buttons & 1)) { endScale(); return; }
            updateScale(p);
            render();
          } else if (moving) {
            if (!(e.buttons & 1)) { endMove(); return; }
            const from = lastPoint || p;
            moveShape(moving, p.x - from.x, p.y - from.y);
            lastPoint = { x: p.x, y: p.y };
            render();
          } else {
            const grip = Geom.handleAt(p, selected);
            canvas.style.cursor = grip === 'rot' ? 'grab' : (grip ? HANDLE_CURSOR[grip] : (Geom.hitTest(p) ? 'move' : 'default'));
          }
          return;
        }
        if (!drawing) return;

        if (drawing.type === 'stroke') {
          const last = drawing.points[drawing.points.length - 1];
          if (Math.hypot(p.x - last.x, p.y - last.y) > 1.5) drawing.points.push(p);
        } else if (drawing.type === 'line') {
          drawing.points[1] = e.shiftKey ? snapAngle(drawing.points[0], p) : p;
        } else if (drawing.type === 'rect') {
          drawing.w = p.x - drawing.x;
          drawing.h = p.y - drawing.y;
        } else if (drawing.type === 'circle') {
          drawing.r = Math.hypot(p.x - drawing.x, p.y - drawing.y);
        }
        render();
      });

      function endDraw() {
        if (drawing) {
          const b = Geom.boundsOf(drawing);
          const tooSmall = drawing.type === 'stroke'
            ? (drawing.points.length < 2 && drawing.width < 1)
            : (b.w < 1 && b.h < 1);
          if (!tooSmall) {
            initShape(drawing);
            shapes.push(drawing);
            selected = drawing;
            activeCh = 'x';
            activeKey = null;
            keySel.clear();
            moving = null;
            lastPoint = null;
            drawing = null;
            timeline.buildTimeline();
            render();
            history.commit();
            return;
          }
          drawing = null;
          render();
          history.commit();
        }
      }

      canvas.addEventListener('pointerup', () => {
        if (viewPan) { viewPan = null; applyToolCursor(); return; }
        if (tMode) return;
        if (pathDraw) { pathPointerUp(); return; }
        endRotate();
        endScale();
        endMove();
        endDraw();
        frameDrag = null;
        history.commit();
      });
      canvas.addEventListener('pointercancel', () => {
        if (viewPan) { viewPan = null; applyToolCursor(); return; }
        endRotate();
        endScale();
        endMove();
        endDraw();
        frameDrag = null;
        history.commit();
      });
      canvas.addEventListener('pointerleave', () => {
        if (drawing) endDraw();
        else if (moving) lastPoint = null;
      });
      canvas.addEventListener('dblclick', (e) => {
        if (pathDraw) { finishPath(); return; }
        if (tool !== 'select') return;
        const hit = Geom.hitTest(viewCtrl.toLocal(e));
        if (hit && hit.type === 'text') {
          e.preventDefault();
          selected = hit;
          openTextEditor(null, hit);
        }
      });

      canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

      canvas.addEventListener('wheel', (e) => viewCtrl.wheelZoom(e), { passive: false });

      window.addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
          e.preventDefault();
          if (e.key === 'y' || e.key === 'Y') history.redo();
          else if (e.shiftKey) history.redo();
          else history.undo();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); viewCtrl.reset(); return; }
        if (pathDraw) {
          if (e.key === 'Escape') { e.preventDefault(); cancelPath(); }
          else if (e.key === 'Enter') { e.preventDefault(); finishPath(); }
          else if (e.key === 's' || e.key === 'S') { e.preventDefault(); pbSmooth.click(); }
          return;
        }
        if (tMode) {
          if (e.key === 'x' || e.key === 'X') { e.preventDefault(); tAxis = 'x'; updateT(); return; }
          if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); tAxis = 'y'; updateT(); return; }
          if (e.key === 'Enter') { e.preventDefault(); endT(true); return; }
          if (e.key === 'Escape') { e.preventDefault(); endT(false); return; }
        }
        if (selected) {
          if (e.key === 'g' || e.key === 'G') { e.preventDefault(); startT('grab'); return; }
          if (e.key === 's' || e.key === 'S') { e.preventDefault(); startT('scale'); return; }
        }
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          player.togglePlay();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
          // 复制关键帧：整组偏移到原关键帧之后
          let src;
          if (keySel.size) src = timeline.collectKeySel();
          else if (selected && activeCh && activeKey) src = [{ s: selected, ch: activeCh, k: activeKey }];
          if (src && src.length) {
            e.preventDefault();
            history.record();
            let minT = Infinity, maxT = -Infinity;
            for (const it of src) { minT = Math.min(minT, it.k.t); maxT = Math.max(maxT, it.k.t); }
            const span = maxT - minT;
            const shift = span > 0.05 ? span + 0.5 : 0.5;
            const copies = [];
            for (const it of src) {
              const arr = it.s.ch[it.ch].keys;
              const copy = {
                t: Math.min(it.k.t + shift, duration - KEY_EPS),
                v: it.k.v,
                ease: JSON.parse(JSON.stringify(it.k.ease || LINEAR))
              };
              const dup = findKeyAt(it.s, it.ch, copy.t);
              if (dup) { dup.v = copy.v; copies.push(dup); }
              else { arr.push(copy); arr.sort((a, b) => a.t - b.t); copies.push(copy); }
            }
            keySel = new Set(copies);
            activeKey = copies.length ? copies[0] : null;
            activeCh = src[0] ? src[0].ch : activeCh;
            timeline.buildTimeline();
            player.setTime(currentTime);
            render();
          }
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (tMode) endT(false);
          // 优先删除关键帧：仅当在时间轴中显式选中了关键帧（keySel 由点选/Shift 多选/Ctrl+D 复制产生）
          if (keySel.size) {
            e.preventDefault();
            history.record();
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
          // 否则删除选中的物体
          if (selected) {
            e.preventDefault();
            history.record();
            const i = shapes.indexOf(selected);
            if (i >= 0) shapes.splice(i, 1);
            if (moving === selected) { moving = null; lastPoint = null; }
            if (scaling && scaling.s === selected) scaling = null;
            if (rotating && rotating.s === selected) rotating = null;
            activeKey = null;
            activeCh = null;
            keySel.clear();
            selected = null;
            timeline.buildTimeline();
            render();
          }
        }
      });


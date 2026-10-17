
      class View {
        visible() {
          const W = this.canvasW(), H = this.canvasH();
          return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: W / view.zoom, h: H / view.zoom };
        }

        reset() {
          view.zoom = 1;
          view.x = 0;
          view.y = 0;
          render();
        }

        canvasW() { return canvas.width / dpr; }
        canvasH() { return canvas.height / dpr; }

        toLocal(e) {
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          return { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom };
        }

        wheelZoom(e) {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const z0 = view.zoom;
          const z1 = clampNum(z0 * Math.exp(-e.deltaY * 0.0015), VIEW_MIN, VIEW_MAX);
          if (z1 === z0) return;
          const wx = (sx - view.x) / z0;
          const wy = (sy - view.y) / z0;
          view.zoom = z1;
          view.x = sx - wx * z1;
          view.y = sy - wy * z1;
          render();
        }
      }

      const viewCtrl = new View();

      class Player {
        updatePlayhead() {
          tlPlayhead.style.left = timeline.pct(currentTime) + '%';
        }

        updateTimeLabel() {
          timeLabel.textContent = currentTime.toFixed(2) + 's / ' + duration.toFixed(2) + 's';
        }

        setTime(t) {
          currentTime = Math.max(0, Math.min(duration, t));
          applyAnimation(currentTime);
          this.updatePlayhead();
          this.updateTimeLabel();
          render();
        }

        play() {
          if (currentTime >= duration - 1e-6) this.setTime(0);
          playing = true;
          lastFrame = 0;
          playBtn.textContent = '⏸ 暂停';
          rafId = requestAnimationFrame(this.tick.bind(this));
        }

        pause() {
          if (!playing) return;
          playing = false;
          cancelAnimationFrame(rafId);
          playBtn.textContent = '▶ 播放';
        }

        togglePlay() {
          if (playing) this.pause();
          else this.play();
        }

        tick(now) {
          if (!playing) return;
          if (!lastFrame) lastFrame = now;
          const dt = (now - lastFrame) / 1000;
          lastFrame = now;
          const next = currentTime + dt;
          if (next >= duration) {
            this.setTime(duration);
            this.pause();
            return;
          }
          this.setTime(next);
          rafId = requestAnimationFrame(this.tick.bind(this));
        }

        scrubTo(e) {
          const t = Math.round(clampNum(timeline.tlTimeAt(e.clientX), 0, duration) * 100) / 100;
          this.setTime(t);
        }
      }

      class History {
        docSnapshot() {
          const d = doc.collectDoc();
          d.currentTime = 0; // 播放位置不计入历史，避免误记
          return JSON.stringify(d);
        }

        begin() {
          if (histBusy) return;
          histPending = this.docSnapshot();
        }

        commit() {
          if (histBusy || histPending === null) return;
          const now = this.docSnapshot();
          if (now === histPending) { histPending = null; return; }
          undoStack.push(histPending);
          if (undoStack.length > UNDO_LIMIT) undoStack.shift();
          redoStack.length = 0;
          histPending = null;
        }

        record() {
          if (histBusy) return;
          histPending = null;
          undoStack.push(this.docSnapshot());
          if (undoStack.length > UNDO_LIMIT) undoStack.shift();
          redoStack.length = 0;
        }

        restoreDoc(json) {
          histBusy = true;
          try { doc.loadDoc(JSON.parse(json)); } finally { histBusy = false; }
        }

        undo() {
          if (!undoStack.length || histBusy) return;
          histPending = null;
          const ct = currentTime;
          redoStack.push(this.docSnapshot());
          this.restoreDoc(undoStack.pop());
          player.setTime(clampNum(ct, 0, duration)); // 保持撤销前的播放位置，避免画面跳变
        }

        redo() {
          if (!redoStack.length || histBusy) return;
          histPending = null;
          const ct = currentTime;
          undoStack.push(this.docSnapshot());
          this.restoreDoc(redoStack.pop());
          player.setTime(clampNum(ct, 0, duration));
        }

        clear() {
          undoStack.length = 0;
          redoStack.length = 0;
          histPending = null;
        }
      }

      class Frame {
        clamp() {
          frame.w = Math.max(16, frame.w);
          frame.h = Math.max(16, frame.h);
        }

        applyWant() {
          const v = viewCtrl.visible();
          frame.w = Math.max(16, frameWant.w);
          frame.h = Math.max(16, frameWant.h);
          frame.x = Math.round(v.x + (v.w - frame.w) / 2);
          frame.y = Math.round(v.y + (v.h - frame.h) / 2);
          this.clamp();
        }

        syncInputs() {
          frameWInput.value = Math.round(frame.w);
          frameHInput.value = Math.round(frame.h);
        }

        center() {
          frameWant.w = Math.round(frame.w);
          frameWant.h = Math.round(frame.h);
          framePinned = false;
          this.applyWant();
          this.syncInputs();
          render();
        }

        setSize(w, h) {
          frameWant.w = Math.round(w);
          frameWant.h = Math.round(h);
          framePinned = false;
          this.applyWant();
          this.syncInputs();
          render();
        }

        handlePoints() {
          const x1 = frame.x, y1 = frame.y, x2 = frame.x + frame.w, y2 = frame.y + frame.h;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          return {
            nw: { x: x1, y: y1 }, n: { x: mx, y: y1 }, ne: { x: x2, y: y1 },
            e: { x: x2, y: my }, se: { x: x2, y: y2 }, s: { x: mx, y: y2 },
            sw: { x: x1, y: y2 }, w: { x: x1, y: my }
          };
        }

        handleAt(p) {
          const pts = this.handlePoints();
          const hit = FRAME_HIT / view.zoom;
          for (const k in pts) {
            if (Math.abs(p.x - pts[k].x) <= hit && Math.abs(p.y - pts[k].y) <= hit) return k;
          }
          return null;
        }

        updateDrag(p) {
          const d = frameDrag;
          if (!d) return;
          const dx = p.x - d.x0, dy = p.y - d.y0;
          const o = d.orig;
          if (d.mode === 'move') {
            frame.x = Math.round(o.x + dx);
            frame.y = Math.round(o.y + dy);
          } else {
            let x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
            if (d.mode.indexOf('w') >= 0) x1 = Math.min(o.x + dx, x2 - FRAME_MIN);
            if (d.mode.indexOf('e') >= 0) x2 = Math.max(o.x + o.w + dx, x1 + FRAME_MIN);
            if (d.mode.indexOf('n') >= 0) y1 = Math.min(o.y + dy, y2 - FRAME_MIN);
            if (d.mode.indexOf('s') >= 0) y2 = Math.max(o.y + o.h + dy, y1 + FRAME_MIN);
            frame.x = x1; frame.y = y1; frame.w = x2 - x1; frame.h = y2 - y1;
          }
          this.clamp();
          framePinned = true;
          frameWant.w = Math.round(frame.w);
          frameWant.h = Math.round(frame.h);
          this.syncInputs();
        }

        draw() {
          const z = view.zoom;
          const v = viewCtrl.visible();
          ctx.save();
          ctx.beginPath();
          ctx.rect(v.x, v.y, v.w, v.h);
          ctx.rect(frame.x, frame.y, frame.w, frame.h);
          ctx.fillStyle = 'rgba(255, 255, 255, .66)';
          ctx.fill('evenodd');
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = 'rgba(47, 111, 237, .8)';
          ctx.lineWidth = 1.5 / z;
          ctx.setLineDash([7 / z, 5 / z]);
          const inset = 0.75 / z;
          ctx.strokeRect(frame.x + inset, frame.y + inset, frame.w - inset * 2, frame.h - inset * 2);
          ctx.restore();

          if (tool !== 'frame') return;
          const pts = this.handlePoints();
          const h = 4 / z;
          ctx.save();
          ctx.lineWidth = 1.5 / z;
          ctx.strokeStyle = '#2f6fed';
          for (const k in pts) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(pts[k].x - h, pts[k].y - h, h * 2, h * 2);
            ctx.strokeRect(pts[k].x - h, pts[k].y - h, h * 2, h * 2);
          }
          ctx.restore();
        }
      }

      const player = new Player();
      const history = new History();
      const frameCtrl = new Frame();

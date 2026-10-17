      /* ================= 轨迹运动 ================= */
      const ctxMenuEl = document.getElementById('ctxMenu');
      const pathBarEl = document.getElementById('pathBar');
      const pbHint = document.getElementById('pbHint');
      const pbPoly = document.getElementById('pbPoly');
      const pbCircle = document.getElementById('pbCircle');
      const pbSmooth = document.getElementById('pbSmooth');
      let pathDraw = null;

      function hasPath(s) {
        if (!s || !s.path) return false;
        if (s.path.type === 'poly') return Array.isArray(s.path.pts) && s.path.pts.length >= 2;
        if (s.path.type === 'circle') return s.path.r > 0;
        return false;
      }

      function displayChannels(s) {
        return hasPath(s) ? ['sx', 'sy', 'rot', 'op', PATH_CH] : CHANNELS;
      }

      function shapeChannels(s) {
        return hasPath(s) ? CHANNELS.concat(PATH_CH) : CHANNELS;
      }

      function shapePivotWorld(s) {
        const t = Geom.tfOf(s);
        return { x: s.pivot.x + t.x, y: s.pivot.y + t.y };
      }

      function removePath(s) {
        if (!s || !s.path) return;
        history.record();
        s.path = null;
        delete s.ch[PATH_CH];
        if (activeCh === PATH_CH) activeCh = 'x';
        activeKey = null;
        keySel.clear();
        applyAnimation(currentTime);
        timeline.buildTimeline();
        render();
      }

      function hideCtxMenu() { ctxMenuEl.style.display = 'none'; }

      function addCtxItem(label, fn, danger) {
        const el = document.createElement('div');
        el.className = 'mi' + (danger ? ' danger' : '');
        el.textContent = label;
        el.addEventListener('click', () => { hideCtxMenu(); fn(); });
        ctxMenuEl.appendChild(el);
      }

      function addCtxSep() {
        const sep = document.createElement('div');
        sep.className = 'sep';
        ctxMenuEl.appendChild(sep);
      }

      function showCtxMenu(x, y, shape) {
        ctxMenuEl.innerHTML = '';
        if (!shape) {
          addCtxItem('复位视图（100%）', viewCtrl.reset);
        } else if (!hasPath(shape)) {
          addCtxItem('按轨迹移动 · 折线', () => startPathDraw(shape, 'poly'));
          addCtxItem('按轨迹移动 · 圆形', () => startPathDraw(shape, 'circle'));
          if (shape.path) {
            addCtxSep();
            addCtxItem('删除轨迹', () => removePath(shape), true);
          }
        } else {
          if (shape.path.type === 'poly') {
            addCtxItem(shape.path.smooth ? '轨迹改为折线' : '轨迹改为曲线', () => {
              history.record();
              shape.path.smooth = !shape.path.smooth;
              shape.path._tab = null;
              applyAnimation(currentTime);
              timeline.buildTimeline();
              render();
            });
          }
          addCtxItem('重绘轨迹', () => startPathDraw(shape, shape.path.type === 'circle' ? 'circle' : 'poly'));
          addCtxSep();
          addCtxItem('删除轨迹', () => removePath(shape), true);
        }
        ctxMenuEl.style.display = 'block';
        const r = ctxMenuEl.getBoundingClientRect();
        ctxMenuEl.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 6)) + 'px';
        ctxMenuEl.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 6)) + 'px';
      }

      function updatePathBar() {
        if (!pathDraw) return;
        pbPoly.classList.toggle('active', pathDraw.mode === 'poly');
        pbCircle.classList.toggle('active', pathDraw.mode === 'circle');
        pbSmooth.classList.toggle('active', !!pathDraw.smooth);
        pbSmooth.style.visibility = pathDraw.mode === 'poly' ? 'visible' : 'hidden';
        pbHint.textContent = pathDraw.mode === 'poly'
          ? '绘制轨迹：点击添加锚点'
          : '绘制轨迹：从圆心拖出半径';
      }

      function showPathBar() { pathBarEl.style.display = 'flex'; updatePathBar(); }
      function hidePathBar() { pathBarEl.style.display = 'none'; }

      function startPathDraw(shape, mode) {
        history.begin();
        player.pause();
        hideCtxMenu();
        selected = shape;
        moving = null;
        lastPoint = null;
        scaling = null;
        rotating = null;
        activeKey = null;
        activeCh = null;
        keySel.clear();
        const st = shapePivotWorld(shape);
        pathDraw = {
          shape,
          mode,
          smooth: false,
          pts: mode === 'poly' ? [{ x: st.x, y: st.y }] : [],
          cx: st.x,
          cy: st.y,
          r: 0,
          a0: 0,
          objStart: st,
          hover: null,
          drag: null
        };
        canvas.style.cursor = 'crosshair';
        showPathBar();
        timeline.buildTimeline();
        render();
      }

      function finishPath() {
        const pd = pathDraw;
        if (!pd) return;
        const s = pd.shape;
        let path = null;
        if (pd.mode === 'poly' && pd.pts.length >= 2) {
          path = { type: 'poly', pts: pd.pts.map(q => ({ x: q.x, y: q.y })), smooth: pd.smooth, _tab: null };
        } else if (pd.mode === 'circle' && pd.r > 0) {
          const dx = pd.objStart.x - pd.cx, dy = pd.objStart.y - pd.cy;
          const a0 = (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) ? -Math.PI / 2 : Math.atan2(dy, dx);
          path = { type: 'circle', cx: pd.cx, cy: pd.cy, r: pd.r, a0, _tab: null };
        }
        pathDraw = null;
        hidePathBar();
        setTool(tool);
        if (!path) { render(); return; }
        s.path = path;
        s.expanded = true;
        s.ch[PATH_CH] = {
          keys: [
            { t: 0, v: 0, ease: { ...LINEAR } },
            { t: duration, v: 1, ease: { ...LINEAR } }
          ]
        };
        history.commit();
        activeCh = PATH_CH;
        activeKey = s.ch[PATH_CH].keys[0];
        keySel.clear();
        applyAnimation(currentTime);
        timeline.buildTimeline();
        render();
      }

      function cancelPath() {
        if (!pathDraw) return;
        pathDraw = null;
        hidePathBar();
        setTool(tool);
        history.commit();
        render();
      }

      function pathPointerDown(p) {
        if (pathDraw.mode === 'poly') {
          const last = pathDraw.pts[pathDraw.pts.length - 1];
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 4) pathDraw.pts.push({ x: p.x, y: p.y });
          pathDraw.hover = null;
        } else {
          pathDraw.cx = p.x;
          pathDraw.cy = p.y;
          pathDraw.r = 0;
          pathDraw.drag = true;
        }
        render();
      }

      function pathPointerMove(p) {
        if (pathDraw.mode === 'poly') pathDraw.hover = { x: p.x, y: p.y };
        else if (pathDraw.drag) pathDraw.r = Math.hypot(p.x - pathDraw.cx, p.y - pathDraw.cy);
        render();
      }

      function pathPointerUp() {
        if (!pathDraw || pathDraw.mode !== 'circle' || !pathDraw.drag) return;
        pathDraw.drag = null;
        if (pathDraw.r >= 8) finishPath();
        else { pathDraw.r = 0; render(); }
      }

      function drawPathShape(path) {
        const pts = path.type === 'circle' ? Geom.densePathPts(path) : Geom.pathTable(path).pts;
        if (pts.length < 2) return;
        const z = view.zoom;
        ctx.save();
        ctx.lineWidth = 2 / z;
        ctx.strokeStyle = 'rgba(139, 92, 246, .9)';
        ctx.setLineDash([6 / z, 5 / z]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (path.type === 'poly') {
          ctx.lineWidth = 1.2 / z;
          ctx.strokeStyle = '#fff';
          ctx.fillStyle = '#8b5cf6';
          for (const a of path.pts) {
            ctx.beginPath();
            ctx.arc(a.x, a.y, 3.2 / z, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      function drawPathInProgress() {
        const pd = pathDraw;
        const z = view.zoom;
        ctx.save();
        ctx.strokeStyle = 'rgba(139, 92, 246, .95)';
        ctx.lineWidth = 2 / z;
        ctx.setLineDash([6 / z, 5 / z]);
        if (pd.mode === 'poly') {
          const list = pd.hover ? pd.pts.concat([pd.hover]) : pd.pts;
          if (list.length >= 2) {
            const pts = Geom.densePathPts({ type: 'poly', pts: list, smooth: pd.smooth });
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.lineWidth = 1.2 / z;
          ctx.strokeStyle = '#fff';
          ctx.fillStyle = '#8b5cf6';
          for (const a of pd.pts) {
            ctx.beginPath();
            ctx.arc(a.x, a.y, 3.4 / z, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (pd.r > 0) {
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(pd.cx, pd.cy, pd.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawPathOverlay() {
        if (selected && hasPath(selected)) drawPathShape(selected.path);
        if (pathDraw) drawPathInProgress();
      }

      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (tMode) { endT(false); return; }
        if (pathDraw) { finishPath(); return; }
        const p = viewCtrl.toLocal(e);
        const hit = Geom.hitTest(p);
        if (hit !== selected) {
          selected = hit;
          moving = null;
          lastPoint = null;
          scaling = null;
          rotating = null;
          activeKey = null;
          activeCh = null;
          keySel.clear();
        }
        timeline.buildTimeline();
        render();
        showCtxMenu(e.clientX, e.clientY, hit);
      });

      document.addEventListener('pointerdown', (e) => {
        if (ctxMenuEl.style.display !== 'block') return;
        if (e.target && e.target.closest && e.target.closest('#ctxMenu')) return;
        hideCtxMenu();
      }, true);

      pbPoly.addEventListener('click', () => {
        if (!pathDraw || pathDraw.mode === 'poly') return;
        pathDraw.mode = 'poly';
        if (!pathDraw.pts.length) pathDraw.pts = [{ x: pathDraw.objStart.x, y: pathDraw.objStart.y }];
        updatePathBar();
        render();
      });
      pbCircle.addEventListener('click', () => {
        if (!pathDraw || pathDraw.mode === 'circle') return;
        pathDraw.mode = 'circle';
        pathDraw.r = 0;
        pathDraw.drag = null;
        updatePathBar();
        render();
      });
      pbSmooth.addEventListener('click', () => {
        if (!pathDraw) return;
        pathDraw.smooth = !pathDraw.smooth;
        updatePathBar();
        render();
      });
      document.getElementById('pbDone').addEventListener('click', finishPath);
      document.getElementById('pbCancel').addEventListener('click', cancelPath);


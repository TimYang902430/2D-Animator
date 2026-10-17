      class CurveEditor {
        curveGeom() {
          const w = Math.max(60, curveCv.clientWidth || 160);
          const h = Math.max(60, curveCv.clientHeight || 110);
          const pad = 12;
          const bw = (w - 2 * pad) * curveView.zoom;
          const bh = (h - 2 * pad) * curveView.zoom;
          const ox = pad + curveView.panX;
          const oy = h - pad + curveView.panY;
          return {
            w, h, pad, bw, bh,
            X: v => ox + v * bw,
            Y: v => oy - ((v - CURVE_YMIN) / (CURVE_YMAX - CURVE_YMIN)) * bh
          };
        }

        clampCurveView() {
          const g = this.curveGeom();
          const loX = Math.min(0, g.w - g.bw);
          const hiX = Math.max(0, g.w - g.bw);
          curveView.panX = clampNum(g.pad + curveView.panX, loX, hiX) - g.pad;
          const loY = Math.min(0, g.h - g.bh);
          const hiY = Math.max(0, g.h - g.bh);
          curveView.panY = clampNum(g.h - g.pad + curveView.panY - g.bh, loY, hiY) + g.bh - (g.h - g.pad);
        }

        resetCurveView() {
          curveView.zoom = 1;
          curveView.panX = 0;
          curveView.panY = 0;
          this.drawCurve();
        }

        activeChKeys() {
          if (!selected || !activeCh || !selected.ch || !selected.ch[activeCh]) return null;
          return selected.ch[activeCh].keys;
        }

        activeEase() {
          const keys = this.activeChKeys();
          return activeKey && activeKey.ease && keys && keys.includes(activeKey) ? activeKey.ease : null;
        }

        activeSegment() {
          if (!this.activeEase()) return null;
          const keys = this.activeChKeys();
          const i = keys.indexOf(activeKey);
          if (i < 0 || i >= keys.length - 1) return null;
          return { a: activeKey, b: keys[i + 1], i };
        }

        ensureActiveKey() {
          if (selected && !activeCh) activeCh = hasPath(selected) ? PATH_CH : 'x';
          const keys = this.activeChKeys();
          if (!keys || !keys.length) {
            activeKey = null;
            return null;
          }
          if (this.activeEase()) return activeKey;
          let picked = null;
          for (let i = keys.length - 1; i >= 0; i--) {
            if (keys[i].t <= currentTime + 1e-6) { picked = i; break; }
          }
          if (picked === null) picked = 0;
          if (picked === keys.length - 1 && keys.length > 1) picked -= 1;
          activeKey = keys[picked];
          return activeKey;
        }

        previewSegment() {
          const seg = this.activeSegment();
          if (!seg) return;
          if (currentTime > seg.a.t + 1e-6 && currentTime < seg.b.t - 1e-6) return;
          player.setTime(Math.round(((seg.a.t + seg.b.t) / 2) * 100) / 100);
        }

        resizeCurve() {
          const g = this.curveGeom();
          const ratio = window.devicePixelRatio || 1;
          const pw = Math.round(g.w * ratio);
          const ph = Math.round(g.h * ratio);
          if (curveCv.width !== pw || curveCv.height !== ph) {
            curveCv.width = pw;
            curveCv.height = ph;
          }
          this.clampCurveView();
          this.drawCurve();
        }

        curveSegRange() {
          const seg = this.activeSegment();
          if (seg) return { t0: seg.a.t, t1: seg.b.t };
          return { t0: 0, t1: duration };
        }

        gridStep(steps, pxPerUnit) {
          for (let i = 0; i < steps.length; i++) {
            if (steps[i] * pxPerUnit >= 24) return steps[i];
          }
          return steps[steps.length - 1];
        }

        gridLabel(v) {
          return String(Math.round(v * 1000) / 1000);
        }

        drawGrid(g) {
          const spanX = g.X(1) - g.X(0);
          const spanY = g.Y(CURVE_YMIN) - g.Y(CURVE_YMAX);
          if (!(spanX > 0) || !(spanY > 0)) return;
          const range = CURVE_YMAX - CURVE_YMIN;
          const stepY = this.gridStep(GRID_Y_STEPS, spanY / range);
          const vMax = CURVE_YMIN + ((g.Y(CURVE_YMIN) - 0) / spanY) * range;
          const vMin = CURVE_YMIN + ((g.Y(CURVE_YMIN) - g.h) / spanY) * range;

          curveCtx.save();
          curveCtx.lineWidth = 1;
          curveCtx.font = '9px system-ui, -apple-system, sans-serif';
          curveCtx.textBaseline = 'top';
          curveCtx.textAlign = 'left';

          const rng = this.curveSegRange();
          const segSpan = rng.t1 - rng.t0;
          if (segSpan > 0) {
            const pxPerSec = spanX / segSpan;
            const stepT = this.gridStep(GRID_T_STEPS, pxPerSec);
            const tMin = rng.t0 + ((0 - g.X(0)) / spanX) * segSpan;
            const tMax = rng.t0 + ((g.w - g.X(0)) / spanX) * segSpan;
            const it0 = Math.ceil(tMin / stepT - 1e-9);
            const it1 = Math.floor(tMax / stepT + 1e-9);
            let lastLx = -Infinity;
            for (let i = it0; i <= it1 && i - it0 < 400; i++) {
              const t = i * stepT;
              const x = g.X((t - rng.t0) / segSpan);
              const major = Math.abs(t - Math.round(t)) < 1e-6;
              curveCtx.strokeStyle = major ? '#d9e0e8' : '#f1f4f8';
              curveCtx.beginPath();
              curveCtx.moveTo(x, 0);
              curveCtx.lineTo(x, g.h);
              curveCtx.stroke();
              // 每根网格线都标数字（间距足够才标，避免重叠）
              if (x - lastLx >= 26) {
                lastLx = x;
                curveCtx.fillStyle = '#aab2bd';
                curveCtx.fillText(this.gridLabel(t) + 's', x + 2, g.h - 11);
              }
            }
          }

          const iy0 = Math.ceil(vMin / stepY - 1e-9);
          const iy1 = Math.floor(vMax / stepY + 1e-9);
          let lastLy = -Infinity;
          for (let i = iy0; i <= iy1 && i - iy0 < 400; i++) {
            const v = i * stepY;
            const y = g.Y(v);
            const major = Math.abs(v - Math.round(v)) < 1e-6;
            curveCtx.strokeStyle = major ? '#d9e0e8' : '#f1f4f8';
            curveCtx.beginPath();
            curveCtx.moveTo(0, y);
            curveCtx.lineTo(g.w, y);
            curveCtx.stroke();
            if (Math.abs(y - lastLy) >= 26) {
              lastLy = y;
              curveCtx.fillStyle = '#aab2bd';
              curveCtx.fillText(this.gridLabel(v), 2, y + 1);
            }
          }
          curveCtx.restore();
        }

        drawCurve() {
          const segNow = this.activeSegment();
          if (segNow) {
            if (segNow.a !== lastSegA || segNow.b !== lastSegB) {
              lastSegA = segNow.a;
              lastSegB = segNow.b;
              curveView.zoom = 1;
              curveView.panX = 0;
              curveView.panY = 0;
            }
          } else if (lastSegA !== null || lastSegB !== null) {
            lastSegA = null;
            lastSegB = null;
          }
          const g = this.curveGeom();
          const ratio = window.devicePixelRatio || 1;
          curveCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
          curveCtx.clearRect(0, 0, g.w, g.h);
          this.drawGrid(g);

          const e = this.activeEase();
          this.updatePresetActive(e);
          const keysNow = this.activeChKeys();

          const seg = segNow;
          const rng = this.curveSegRange();
          const segSpan = rng.t1 - rng.t0;
          const XU = (u) => g.X(u);

          curveCtx.setLineDash([3, 3]);
          curveCtx.beginPath();
          curveCtx.moveTo(XU(0), g.Y(0));
          curveCtx.lineTo(XU(1), g.Y(1));
          curveCtx.stroke();
          curveCtx.setLineDash([]);

          if (!selected) {
            curveVals.textContent = tr('先选中图形');
            curveNums.textContent = '';
            return;
          }
          if (!keysNow || !keysNow.length) {
            curveVals.textContent = tr('无通道');
            curveNums.textContent = '';
            return;
          }
          if (keysNow.length < 2) {
            curveVals.textContent = tr('{ch}：只有 1 个关键帧', { ch: tr(CH_LABEL[activeCh]) });
            curveNums.textContent = tr('拖播放头到别处再打 1 帧');
            return;
          }
          if (!e) {
            curveVals.textContent = tr('{ch}：无区段', { ch: tr(CH_LABEL[activeCh]) });
            curveNums.textContent = '';
            return;
          }

          if (seg) {
            curveVals.textContent = tr('{ch} 第 {a}→{b} 段 · {span}s', { ch: tr(CH_LABEL[activeCh]), a: seg.i + 1, b: seg.i + 2, span: segSpan.toFixed(2) });
            if (e.step) {
              curveNums.textContent = tr('阶跃（瞬变）：保持到段末后跳到 {v}', { v: seg.b.v });
            } else {
              const moved = Math.abs(seg.a.v - seg.b.v) > 1e-6;
              curveNums.textContent = moved
                ? seg.a.v.toFixed(3) + ' → ' + seg.b.v.toFixed(3) + '   ' +
                [e.x1, e.y1, e.x2, e.y2].map(n => n.toFixed(2)).join(', ')
                : tr('这两帧数值相同，曲线看不出效果');
            }
          } else {
            curveVals.textContent = tr('{ch}：末尾关键帧', { ch: tr(CH_LABEL[activeCh]) });
            curveNums.textContent = tr('后面没有区段，曲线不生效');
          }

          if (e.step) {
            curveCtx.strokeStyle = '#2f6fed';
            curveCtx.lineWidth = 2;
            curveCtx.beginPath();
            curveCtx.moveTo(XU(0), g.Y(0));
            curveCtx.lineTo(XU(1), g.Y(0));
            curveCtx.lineTo(XU(1), g.Y(1));
            curveCtx.stroke();
            return;
          }

          curveCtx.strokeStyle = '#e0b64a';
          curveCtx.lineWidth = 1;
          curveCtx.beginPath();
          curveCtx.moveTo(XU(0), g.Y(0));
          curveCtx.lineTo(XU(e.x1), g.Y(e.y1));
          curveCtx.moveTo(XU(1), g.Y(1));
          curveCtx.lineTo(XU(e.x2), g.Y(e.y2));
          curveCtx.stroke();

          curveCtx.strokeStyle = '#2f6fed';
          curveCtx.lineWidth = 2;
          curveCtx.beginPath();
          for (let i = 0; i <= 64; i++) {
            const u = i / 64;
            const y = bezierY(e, u);
            if (i === 0) curveCtx.moveTo(XU(u), g.Y(y));
            else curveCtx.lineTo(XU(u), g.Y(y));
          }
          curveCtx.stroke();

          for (const [hx, hy] of [[e.x1, e.y1], [e.x2, e.y2]]) {
            const hp = this.pinCurveHandle(g, hx, hy);
            curveCtx.beginPath();
            if (hp.out) {
              // 拖出窗口时在边缘画箭头，指向手柄真正位置
              const dirY = hp.sy < hp.py ? -1 : 1;
              curveCtx.moveTo(hp.px - 5, hp.py - 5 * dirY);
              curveCtx.lineTo(hp.px + 5, hp.py - 5 * dirY);
              curveCtx.lineTo(hp.px, hp.py + 4 * dirY);
              curveCtx.closePath();
            } else {
              curveCtx.arc(hp.px, hp.py, 4.5, 0, Math.PI * 2);
            }
            curveCtx.fillStyle = '#ff9f1a';
            curveCtx.fill();
            curveCtx.strokeStyle = '#fff';
            curveCtx.lineWidth = 1.5;
            curveCtx.stroke();
          }
        }

        updatePresetActive(e) {
          presetButtons.forEach(btn => {
            const v = btn._v;
            const on = !!e && !e.step && Math.abs(e.x1 - v[0]) < 1e-3 && Math.abs(e.y1 - v[1]) < 1e-3 &&
              Math.abs(e.x2 - v[2]) < 1e-3 && Math.abs(e.y2 - v[3]) < 1e-3;
            btn.classList.toggle('active', on);
          });
        }

        curveLocal(ev) {
          const rect = curveCv.getBoundingClientRect();
          return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        }

        // 曲线编辑目标：多选关键帧时同时作用于所有选中帧，否则作用当前活动帧
        curveEases() {
          if (keySel.size) {
            const out = [];
            for (const it of timeline.collectKeySel()) if (it.k.ease) out.push(it.k.ease);
            return out;
          }
          const e = this.activeEase();
          return e ? [e] : [];
        }

        applyCurveDrag(p, g) {
          if (!curveDrag || curveDrag === 'pan') return;
          const spanX = g.X(1) - g.X(0);
          const vx = spanX > 0 ? clampNum((p.x - g.X(0)) / spanX, 0, 1) : 0;
          const spanY = g.Y(CURVE_YMIN) - g.Y(CURVE_YMAX);
          const raw = spanY > 0 ? (g.Y(CURVE_YMIN) - p.y) / spanY : 0;
          // y 不设边界：手柄可以拖出窗口继续加大/减小数值
          const vy = CURVE_YMIN + raw * (CURVE_YMAX - CURVE_YMIN);
          if (curveDrag !== 'h1' && curveDrag !== 'h2') return;
          const es = this.curveEases();
          if (!es.length) return;
          for (const e of es) {
            e.step = false;
            if (curveDrag === 'h1') { e.x1 = vx; e.y1 = vy; }
            else { e.x2 = vx; e.y2 = vy; }
          }
          this.drawCurve();
          player.setTime(currentTime);
        }

        // 手柄屏幕位置（超出窗口时钉在边缘，供绘制箭头和命中）
        pinCurveHandle(g, x, y) {
          const sx = g.X(x), sy = g.Y(y);
          const px = Math.max(3, Math.min(g.w - 3, sx));
          const py = Math.max(3, Math.min(g.h - 3, sy));
          return { sx, sy, px, py, out: px !== sx || py !== sy };
        }

        curveHandleHit(p, g) {
          const e = this.activeEase();
          if (!e) return null;
          const a = this.pinCurveHandle(g, e.x1, e.y1);
          const b = this.pinCurveHandle(g, e.x2, e.y2);
          const d1 = Math.hypot(p.x - a.px, p.y - a.py);
          const d2 = Math.hypot(p.x - b.px, p.y - b.py);
          if (Math.min(d1, d2) > CURVE_HANDLE_HIT) return null;
          return d1 <= d2 ? 'h1' : 'h2';
        }

        // 抓曲线本体 → 拖动最近的控制柄，避免"看得见摸不着"的死区
        curveBodyHit(p, g) {
          const e = this.activeEase();
          if (!e || e.step) return null;
          const XU = (u) => g.X(u);
          const N = 64;
          let px = XU(0), py = g.Y(0), best = Infinity;
          for (let i = 1; i <= N; i++) {
            const u = i / N;
            const cx = XU(u), cy = g.Y(bezierY(e, u));
            const dx = cx - px, dy = cy - py;
            const L2 = dx * dx + dy * dy;
            let t = L2 > 0 ? ((p.x - px) * dx + (p.y - py) * dy) / L2 : 0;
            t = Math.max(0, Math.min(1, t));
            const d = Math.hypot(p.x - (px + t * dx), p.y - (py + t * dy));
            if (d < best) best = d;
            px = cx; py = cy;
          }
          if (best > CURVE_BODY_HIT) return null;
          const a = this.pinCurveHandle(g, e.x1, e.y1);
          const b = this.pinCurveHandle(g, e.x2, e.y2);
          const d1 = Math.hypot(p.x - a.px, p.y - a.py);
          const d2 = Math.hypot(p.x - b.px, p.y - b.py);
          return d1 <= d2 ? 'h1' : 'h2';
        }

        endCurveDrag() {
          if (curveDrag === 'pan') curveCv.style.cursor = 'grab';
          curveDrag = null;
          curvePanLast = null;
          history.commit();
        }
      }


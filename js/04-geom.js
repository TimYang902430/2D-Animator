      const CHANNELS = ['x', 'y', 'sx', 'sy', 'rot', 'op'];
      const PATH_CH = 'prog';
      const CH_DEF = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1, prog: 0 };
      const CH_LABEL = { x: '移动X', y: '移动Y', sx: '缩放X', sy: '缩放Y', rot: '旋转', op: '显隐', prog: '轨迹' };

      class Geom {
        static textFont(fs) {
          return Math.max(1, fs || 20) + 'px ' + TEXT_FONT;
        }

        static baseBounds(s) {
          const g = s.base || s;
          if (isStrokeLike(s.type)) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of g.points) {
              minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
            }
            if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
          }
          if (s.type === 'rect') {
            return { x: Math.min(g.x, g.x + g.w), y: Math.min(g.y, g.y + g.h), w: Math.abs(g.w), h: Math.abs(g.h) };
          }
          if (s.type === 'text') {
            const fs = g.fontSize || 20;
            ctx.save();
            ctx.font = Geom.textFont(fs);
            const tw = ctx.measureText(g.text || '').width;
            ctx.restore();
            return { x: g.x, y: g.y, w: Math.max(2, tw), h: fs * 1.25 };
          }
          return { x: g.x - g.r, y: g.y - g.r, w: g.r * 2, h: g.r * 2 };
        }

        static tfOf(s) {
          return s.tf || { x: 0, y: 0, sx: 1, sy: 1, rot: 0 };
        }

        static toWorld(s, p) {
          const t = Geom.tfOf(s);
          const dx = (p.x - s.pivot.x) * t.sx;
          const dy = (p.y - s.pivot.y) * t.sy;
          const c = Math.cos(t.rot), sn = Math.sin(t.rot);
          return {
            x: s.pivot.x + t.x + dx * c - dy * sn,
            y: s.pivot.y + t.y + dx * sn + dy * c
          };
        }

        static frameOffset(s, p) {
          const t = Geom.tfOf(s);
          const px = p.x - s.pivot.x - t.x;
          const py = p.y - s.pivot.y - t.y;
          const c = Math.cos(-t.rot), sn = Math.sin(-t.rot);
          return { x: px * c - py * sn, y: px * sn + py * c };
        }

        static shapeLocal(s, p) {
          const t = Geom.tfOf(s);
          const q = Geom.frameOffset(s, p);
          return {
            x: s.pivot.x + (t.sx !== 0 ? q.x / t.sx : 0),
            y: s.pivot.y + (t.sy !== 0 ? q.y / t.sy : 0)
          };
        }

        static drawBase(type, g, color, width, c, filled) {
          c = c || ctx;
          c.save();
          c.strokeStyle = color;
          c.fillStyle = color;
          c.lineWidth = Math.max(0.5, width);
          c.lineCap = 'round';
          c.lineJoin = 'round';
          if (isStrokeLike(type)) {
            if (g.points.length < 2) {
              c.beginPath();
              c.arc(g.points[0].x, g.points[0].y, Math.max(width, 0.5) / 2, 0, Math.PI * 2);
              c.fill();
            } else {
              c.beginPath();
              c.moveTo(g.points[0].x, g.points[0].y);
              for (let i = 1; i < g.points.length; i++) c.lineTo(g.points[i].x, g.points[i].y);
              c.stroke();
            }
          } else if (type === 'rect') {
            c.beginPath();
            c.rect(g.x, g.y, g.w, g.h);
            if (filled) c.fill(); else c.stroke();
          } else if (type === 'circle') {
            c.beginPath();
            c.arc(g.x, g.y, Math.max(g.r, 0.5), 0, Math.PI * 2);
            if (filled) c.fill(); else c.stroke();
          } else if (type === 'text') {
            c.font = Geom.textFont(g.fontSize);
            c.textBaseline = 'top';
            c.textAlign = 'left';
            c.fillText(g.text || '', g.x, g.y);
          }
          c.restore();
        }

        static drawShape(s, c) {
          c = c || ctx;
          const t = Geom.tfOf(s);
          // 取较大轴做补偿：非等比压缩时，未压缩轴的笔画与光晕不会被放大
          const sc = Math.max(Math.abs(t.sx), Math.abs(t.sy)) || 1;
          const alpha = clampNum(t.op == null ? 1 : t.op, 0, 1);
          if (alpha <= 0.001) return;
          c.save();
          c.globalAlpha = alpha;
          // 辉光常驻：所有物体始终带同色光晕
          c.shadowColor = s.color || '#ffffff';
          c.shadowBlur = 30 / Math.max(sc, 0.01);
          c.translate(s.pivot.x + t.x, s.pivot.y + t.y);
          c.rotate(t.rot);
          c.scale(t.sx, t.sy);
          c.translate(-s.pivot.x, -s.pivot.y);
          Geom.drawBase(s.type, s.base, s.color, s.width / sc, c, s.filled);
          c.restore();
        }

        // 洋葱皮幽灵轮廓：半透明描边，不使用填充与辉光
        static drawGhost(s, color, alpha, c) {
          c = c || ctx;
          const t = Geom.tfOf(s);
          if (t.op != null && t.op <= 0.001) return;
          const sc = Math.max(Math.abs(t.sx), Math.abs(t.sy)) || 1;
          c.save();
          c.globalAlpha = alpha;
          c.translate(s.pivot.x + t.x, s.pivot.y + t.y);
          c.rotate(t.rot);
          c.scale(t.sx, t.sy);
          c.translate(-s.pivot.x, -s.pivot.y);
          Geom.drawBase(s.type, s.base, color, Math.max(0.5, s.width / sc), c, false);
          c.restore();
        }

        static baseHandlePoints(s) {
          const b = Geom.baseBounds(s);
          return {
            nw: { x: b.x, y: b.y },
            n: { x: b.x + b.w / 2, y: b.y },
            ne: { x: b.x + b.w, y: b.y },
            e: { x: b.x + b.w, y: b.y + b.h / 2 },
            se: { x: b.x + b.w, y: b.y + b.h },
            s: { x: b.x + b.w / 2, y: b.y + b.h },
            sw: { x: b.x, y: b.y + b.h },
            w: { x: b.x, y: b.y + b.h / 2 }
          };
        }

        static worldHandlePoints(s) {
          const bp = Geom.baseHandlePoints(s);
          const out = {};
          for (const k in bp) out[k] = Geom.toWorld(s, bp[k]);
          return out;
        }

        static rotHandlePos(s) {
          const b = Geom.baseBounds(s);
          const t = Geom.tfOf(s);
          const top = Geom.toWorld(s, { x: b.x + b.w / 2, y: b.y });
          const d = ROT_DIST / view.zoom;
          return { x: top.x + Math.sin(t.rot) * d, y: top.y - Math.cos(t.rot) * d };
        }

        static handleAt(p, s) {
          if (!s) return null;
          const z = view.zoom;
          const rp = Geom.rotHandlePos(s);
          if (Math.hypot(p.x - rp.x, p.y - rp.y) <= ROT_HIT / z) return 'rot';
          const pts = Geom.worldHandlePoints(s);
          let best = null;
          let bestD = HANDLE_HIT / z;
          for (const k in pts) {
            const d = Math.hypot(p.x - pts[k].x, p.y - pts[k].y);
            if (d <= bestD) { bestD = d; best = k; }
          }
          return best;
        }

        static drawSquare(p, fill) {
          const h = HANDLE / view.zoom;
          ctx.beginPath();
          ctx.rect(p.x - h, p.y - h, h * 2, h * 2);
          ctx.fillStyle = fill || '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#ff9f1a';
          ctx.stroke();
        }

        static drawSelection(s) {
          const t = Geom.tfOf(s);
          const b = Geom.baseBounds(s);
          const z = view.zoom;
          const sc = Math.max(Math.abs(t.sx), Math.abs(t.sy)) || 1;
          ctx.save();
          ctx.translate(s.pivot.x + t.x, s.pivot.y + t.y);
          ctx.rotate(t.rot);
          ctx.scale(t.sx, t.sy);
          ctx.translate(-s.pivot.x, -s.pivot.y);
          ctx.strokeStyle = '#ff9f1a';
          ctx.lineWidth = (moving ? 2 : 1) / sc / z;
          ctx.setLineDash((moving ? [] : [5, 4]).map(v => v / sc / z));
          const pad = 4 / sc / z;
          ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
          ctx.restore();

          if (tool !== 'select') return;
          const pts = Geom.worldHandlePoints(s);
          const rp = Geom.rotHandlePos(s);
          const top = Geom.toWorld(s, { x: b.x + b.w / 2, y: b.y });
          ctx.save();
          ctx.setLineDash([]);
          ctx.lineWidth = 1 / z;
          ctx.strokeStyle = '#ff9f1a';
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(rp.x, rp.y);
          ctx.stroke();
          for (const k in pts) Geom.drawSquare(pts[k]);
          Geom.drawSquare(rp, '#ffd9a0');
          ctx.restore();
        }

        static catmullRom(p0, p1, p2, p3, t) {
          const t2 = t * t, t3 = t2 * t;
          return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
          };
        }

        static densePathPts(path) {
          const out = [];
          if (path.type === 'circle') {
            const N = 180;
            for (let i = 0; i <= N; i++) {
              const a = (path.a0 || 0) + (i / N) * Math.PI * 2;
              out.push({ x: path.cx + Math.cos(a) * path.r, y: path.cy + Math.sin(a) * path.r });
            }
            return out;
          }
          const pts = path.pts;
          if (!pts || !pts.length) return out;
          if (pts.length === 1) return [{ x: pts[0].x, y: pts[0].y }];
          if (!path.smooth || pts.length === 2) return pts.map(p => ({ x: p.x, y: p.y }));
          const at = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
          const SEG = 16;
          for (let i = 0; i < pts.length - 1; i++) {
            for (let s = 0; s < SEG; s++) out.push(Geom.catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), s / SEG));
          }
          out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
          return out;
        }

        static pathTable(path) {
          if (path._tab) return path._tab;
          const pts = Geom.densePathPts(path);
          const cum = [0];
          let total = 0;
          for (let i = 1; i < pts.length; i++) {
            total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            cum.push(total);
          }
          path._tab = { pts, cum, total };
          return path._tab;
        }

        static pathPointAt(path, prog) {
          const tab = Geom.pathTable(path);
          if (!tab.pts.length) return { x: 0, y: 0 };
          if (tab.total <= 0 || tab.pts.length === 1) return { x: tab.pts[0].x, y: tab.pts[0].y };
          const d = Math.max(0, Math.min(1, prog)) * tab.total;
          let lo = 0, hi = tab.cum.length - 1;
          while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (tab.cum[mid] <= d) lo = mid;
            else hi = mid;
          }
          const seg = tab.cum[hi] - tab.cum[lo];
          const f = seg > 0 ? (d - tab.cum[lo]) / seg : 0;
          return {
            x: tab.pts[lo].x + (tab.pts[hi].x - tab.pts[lo].x) * f,
            y: tab.pts[lo].y + (tab.pts[hi].y - tab.pts[lo].y) * f
          };
        }

        static translatePath(path, dx, dy) {
          if (path.type === 'circle') {
            path.cx += dx;
            path.cy += dy;
          } else {
            for (const p of path.pts) { p.x += dx; p.y += dy; }
          }
          path._tab = null;
        }

        static boundsOf(s) {
          const b = Geom.baseBounds(s);
          if (!s.tf) return b;
          const corners = [
            { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
            { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h }
          ];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const c of corners) {
            const w = Geom.toWorld(s, c);
            minX = Math.min(minX, w.x); minY = Math.min(minY, w.y);
            maxX = Math.max(maxX, w.x); maxY = Math.max(maxY, w.y);
          }
          return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }

        static distToSegment(p, a, b) {
          const dx = b.x - a.x, dy = b.y - a.y;
          const len2 = dx * dx + dy * dy;
          let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          const px = a.x + t * dx, py = a.y + t * dy;
          return Math.hypot(p.x - px, p.y - py);
        }

        static hitTest(p) {
          for (let i = shapes.length - 1; i >= 0; i--) {
            const s = shapes[i];
            const t = Geom.tfOf(s);
            const sc = Math.sqrt(Math.abs(t.sx * t.sy)) || 1;
            const tol = Math.max(s.width / 2 + 4 / view.zoom, 6 / view.zoom) / sc;
            const lp = Geom.shapeLocal(s, p);
            const g = s.base;
            if (isStrokeLike(s.type)) {
              for (let j = 1; j < g.points.length; j++) {
                if (Geom.distToSegment(lp, g.points[j - 1], g.points[j]) <= tol) return s;
              }
              if (g.points.length === 1 && Math.hypot(lp.x - g.points[0].x, lp.y - g.points[0].y) <= tol) return s;
            } else if (s.type === 'rect') {
              const b = Geom.baseBounds(s);
              if (lp.x >= b.x - tol && lp.x <= b.x + b.w + tol && lp.y >= b.y - tol && lp.y <= b.y + b.h + tol) return s;
            } else if (s.type === 'text') {
              const b = Geom.baseBounds(s);
              if (lp.x >= b.x - tol && lp.x <= b.x + b.w + tol && lp.y >= b.y - tol && lp.y <= b.y + b.h + tol) return s;
            } else if (Math.hypot(lp.x - g.x, lp.y - g.y) <= g.r + tol) {
              return s;
            }
          }
          return null;
        }

        // 移动吸附：物体边缘/中心对齐画布中线和其它物体的 x/y 轴
        static snapMove(s, dx, dy) {
          if (!snapEnabled) return { dx, dy, gx: null, gy: null };
          const SNAP = 3 / view.zoom;
          const b0 = Geom.boundsOf(s);
          const b = { x: b0.x + dx, y: b0.y + dy, w: b0.w, h: b0.h };
          const xs = [(viewCtrl.canvasW() / 2 - view.x) / view.zoom];
          const ys = [(viewCtrl.canvasH() / 2 - view.y) / view.zoom];
          for (const o of shapes) {
            if (o === s) continue;
            const ob = Geom.boundsOf(o);
            if (!(ob.w > 0.001 && ob.h > 0.001)) continue;
            xs.push(ob.x, ob.x + ob.w / 2, ob.x + ob.w);
            ys.push(ob.y, ob.y + ob.h / 2, ob.y + ob.h);
          }
          const sx = [b.x, b.x + b.w / 2, b.x + b.w];
          const sy = [b.y, b.y + b.h / 2, b.y + b.h];
          let bxBest = SNAP, byBest = SNAP, bestDx = 0, bestDy = 0;
          let gx = null, gy = null, snappedX = false, snappedY = false;
          for (const a of sx) for (const q of xs) {
            const d = Math.abs(q - a);
            if (d < bxBest) { bxBest = d; bestDx = q - a; gx = q; snappedX = true; }
          }
          for (const a of sy) for (const q of ys) {
            const d = Math.abs(q - a);
            if (d < byBest) { byBest = d; bestDy = q - a; gy = q; snappedY = true; }
          }
          return { dx: dx + bestDx, dy: dy + bestDy, gx: snappedX ? gx : null, gy: snappedY ? gy : null };
        }
      }

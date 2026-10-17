      let saveFileHandle = null; // 已另存为的文件句柄（此后"保存"直接覆盖更新）

      class Doc {
        stamp() {
          const d = new Date();
          const p = (n) => String(n).padStart(2, '0');
          return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
        }

        collectDoc() {
          for (const s of shapes) if (s.path) s.path._tab = null;
          return {
            app: 'drawing-board',
            version: 1,
            duration,
            currentTime,
            bg: bgColorInput.value,
            nextId,
            typeCount: { ...typeCount },
            frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
            frameWant: { w: frameWant.w, h: frameWant.h },
            framePinned,
            shapes
          };
        }

        async saveDoc(forceAs) {
          if (forceAs) saveFileHandle = null;
          const blob = new Blob([JSON.stringify(this.collectDoc())], { type: 'application/json' });
          if (window.showSaveFilePicker) {
            try {
              if (!saveFileHandle) {
                saveFileHandle = await window.showSaveFilePicker({
                  suggestedName: 'drawing-' + this.stamp() + '.json',
                  types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
                });
              }
              const w = await saveFileHandle.createWritable();
              await w.write(blob);
              await w.close();
              return;
            } catch (err) {
              // 用户取消选择或写入失败：回退为普通下载
              saveFileHandle = null;
            }
          }
          downloadBlob(blob, 'drawing-' + this.stamp() + '.json');
        }

        normalizeShape(s) {
          if (!s || typeof s !== 'object' || !typeNames[s.type]) return null;
          s.base = s.base || captureBase(s);
          if (!s.tf) s.tf = {};
          for (const ch of CHANNELS) {
            if (typeof s.tf[ch] !== 'number' || !isFinite(s.tf[ch])) s.tf[ch] = CH_DEF[ch];
          }
          if (!s.ch || typeof s.ch !== 'object') s.ch = {};
          for (const ch of CHANNELS) {
            const track = s.ch[ch];
            if (!track || !Array.isArray(track.keys) || !track.keys.length) {
              s.ch[ch] = { keys: [{ t: 0, v: CH_DEF[ch], ease: { ...LINEAR } }] };
            } else {
              for (const k of track.keys) {
                if (typeof k.t !== 'number' || !isFinite(k.t)) k.t = 0;
                if (typeof k.v !== 'number' || !isFinite(k.v)) k.v = CH_DEF[ch];
                if (!k.ease || typeof k.ease !== 'object') k.ease = { ...LINEAR };
              }
              track.keys.sort((a, b) => a.t - b.t);
            }
          }
          if (s.path && typeof s.path === 'object' && (s.path.type === 'poly' || s.path.type === 'circle')) {
            s.path._tab = null;
            if (s.path.type === 'poly') {
              const pts = Array.isArray(s.path.pts) ? s.path.pts : [];
              s.path.pts = pts.filter(p => p && isFinite(p.x) && isFinite(p.y)).map(p => ({ x: p.x, y: p.y }));
              s.path.smooth = !!s.path.smooth;
              if (s.path.pts.length < 2) s.path = null;
            } else {
              s.path.cx = Number(s.path.cx) || 0;
              s.path.cy = Number(s.path.cy) || 0;
              s.path.r = Math.max(0, Number(s.path.r) || 0);
              s.path.a0 = Number(s.path.a0) || 0;
              if (!(s.path.r > 0)) s.path = null;
            }
          } else {
            s.path = null;
          }
          if (s.path) {
            const track = s.ch[PATH_CH];
            if (!track || !Array.isArray(track.keys) || !track.keys.length) {
              s.ch[PATH_CH] = {
                keys: [
                  { t: 0, v: 0, ease: { ...LINEAR } },
                  { t: duration, v: 1, ease: { ...LINEAR } }
                ]
              };
            } else {
              for (const k of track.keys) {
                if (typeof k.t !== 'number' || !isFinite(k.t)) k.t = 0;
                if (typeof k.v !== 'number' || !isFinite(k.v)) k.v = 0;
                if (!k.ease || typeof k.ease !== 'object') k.ease = { ...LINEAR };
              }
              track.keys.sort((a, b) => a.t - b.t);
            }
          } else {
            delete s.ch[PATH_CH];
          }
          if (typeof s.id !== 'number') s.id = nextId++;
          if (!s.name) s.name = typeNames[s.type];
          if (!s.pivot || typeof s.pivot.x !== 'number' || typeof s.pivot.y !== 'number') {
            const b = Geom.baseBounds(s);
            s.pivot = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
          }
          if (typeof s.width !== 'number' || !isFinite(s.width)) s.width = 4;
          if (typeof s.color !== 'string') s.color = '#2f6fed';
          s.filled = !!s.filled;
          s.expanded = s.expanded !== false;
          return s;
        }

        loadDoc(obj) {
          if (!obj || !Array.isArray(obj.shapes)) throw new Error(tr('不是有效的作品文件'));
          player.pause();
          hideTextEditor();
          if (pathDraw) { pathDraw = null; hidePathBar(); }
          selected = null;
          moving = null;
          lastPoint = null;
          scaling = null;
          rotating = null;
          activeKey = null;
          activeCh = null;
          keySel.clear();
          drawing = null;

          duration = clampNum(Number(obj.duration) || 5, 1, 60);
          durInput.value = duration;
          if (typeof obj.bg === 'string') bgColorInput.value = obj.bg;

          shapes.length = 0;
          let maxId = 0;
          const counts = { stroke: 0, line: 0, rect: 0, circle: 0, text: 0 };
          for (const raw of obj.shapes) {
            const s = this.normalizeShape(raw);
            if (!s) continue;
            shapes.push(s);
            maxId = Math.max(maxId, s.id);
            counts[s.type] = (counts[s.type] || 0) + 1;
          }
          const fileNext = Number(obj.nextId);
          nextId = Math.max(maxId + 1, isFinite(fileNext) && fileNext > 0 ? Math.round(fileNext) : 1, 1);
          typeCount = { ...counts };
          if (obj.typeCount && typeof obj.typeCount === 'object') {
            for (const k in typeCount) {
              const v = Number(obj.typeCount[k]);
              if (isFinite(v) && v >= 0) typeCount[k] = Math.max(typeCount[k], Math.round(v));
            }
          }

          if (obj.frame && typeof obj.frame === 'object') {
            frame.x = Number(obj.frame.x) || 0;
            frame.y = Number(obj.frame.y) || 0;
            if (Number(obj.frame.w) > 0) frame.w = Number(obj.frame.w);
            if (Number(obj.frame.h) > 0) frame.h = Number(obj.frame.h);
          }
          if (obj.frameWant && typeof obj.frameWant === 'object') {
            if (Number(obj.frameWant.w) > 0) frameWant.w = Number(obj.frameWant.w);
            if (Number(obj.frameWant.h) > 0) frameWant.h = Number(obj.frameWant.h);
          }
          framePinned = obj.framePinned !== false;
          frameReady = true;
          frameCtrl.clamp();
          frameCtrl.syncInputs();

          tlView.t0 = 0;
          tlView.t1 = duration;
          tlView.rowY = 0;
          timeline.clampTlH();
          timeline.buildTimeline();
          player.setTime(clampNum(Number(obj.currentTime) || 0, 0, duration));
        }
      }


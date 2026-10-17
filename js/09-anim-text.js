      function bezierY(e, x) {
        if (!e) return x;
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const x1 = Math.min(Math.max(e.x1, 0), 1);
        const x2 = Math.min(Math.max(e.x2, 0), 1);
        const y1 = e.y1;
        const y2 = e.y2;
        const cx = 3 * x1;
        const bx = 3 * (x2 - x1) - cx;
        const ax = 1 - cx - bx;
        const cy = 3 * y1;
        const by = 3 * (y2 - y1) - cy;
        const ay = 1 - cy - by;
        const fx = t => ((ax * t + bx) * t + cx) * t;
        const fy = t => ((ay * t + by) * t + cy) * t;
        const dfx = t => (3 * ax * t + 2 * bx) * t + cx;
        let t = x;
        for (let i = 0; i < 8; i++) {
          const d = fx(t) - x;
          if (Math.abs(d) < 1e-5) return fy(t);
          const dd = dfx(t);
          if (Math.abs(dd) < 1e-6 || t < 0 || t > 1) break;
          t -= d / dd;
        }
        let lo = 0;
        let hi = 1;
        t = x;
        for (let i = 0; i < 40; i++) {
          const v = fx(t);
          if (Math.abs(v - x) < 1e-5) break;
          if (v < x) lo = t;
          else hi = t;
          t = (lo + hi) / 2;
        }
        return fy(t);
      }

      function easeAt(key, x) {
        const e = key.ease;
        if (!e) return x;
        if (e.step) return x >= 1 ? 1 : 0;
        if (e.x1 === 0 && e.y1 === 0 && e.x2 === 1 && e.y2 === 1) return x;
        return bezierY(e, x);
      }

      function sampleChannel(keys, t, def) {
        if (!keys || !keys.length) return def;
        if (t <= keys[0].t) return keys[0].v;
        const last = keys[keys.length - 1];
        if (t >= last.t) return last.v;
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i];
          const b = keys[i + 1];
          if (t >= a.t && t <= b.t) {
            const span = b.t - a.t;
            const raw = span > 0 ? (t - a.t) / span : 0;
            return a.v + (b.v - a.v) * easeAt(a, raw);
          }
        }
        return last.v;
      }

      function applyAnimation(t) {
        for (const s of shapes) {
          for (const ch of CHANNELS) s.tf[ch] = sampleChannel(s.ch[ch].keys, t, CH_DEF[ch]);
          if (hasPath(s)) {
            const p = Geom.pathPointAt(s.path, sampleChannel(s.ch[PATH_CH].keys, t, 0));
            s.tf.x = p.x - s.pivot.x;
            s.tf.y = p.y - s.pivot.y;
          }
        }
      }

      function initShape(s) {
        s.id = nextId++;
        s.name = typeNames[s.type] + ' ' + (++typeCount[s.type]);
        s.base = captureBase(s);
        const b = Geom.baseBounds(s);
        s.pivot = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        s.tf = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1 };
        s.ch = {};
        for (const ch of CHANNELS) s.ch[ch] = { keys: [{ t: currentTime, v: CH_DEF[ch], ease: { ...LINEAR } }] };
        s.filled = !!fillMode;
        s.expanded = true;
        return s;
      }

      function findKeyAt(s, ch, t) {
        const keys = s.ch[ch].keys;
        return keys.find(k => Math.abs(k.t - t) < KEY_EPS) || null;
      }

      function addKeyVal(s, ch, t, v) {
        const exist = findKeyAt(s, ch, t);
        if (exist) { exist.v = v; return exist; }
        const key = { t, v, ease: { ...LINEAR } };
        s.ch[ch].keys.push(key);
        s.ch[ch].keys.sort((a, b) => a.t - b.t);
        return key;
      }

      function addKeyAt(s, ch, t) {
        return addKeyVal(s, ch, t, s.tf[ch]);
      }

      function refreshKey(s, ch, t) {
        if (!s || !s.ch || !s.ch[ch]) return;
        const key = findKeyAt(s, ch, t);
        if (key) key.v = s.tf[ch];
      }

      function removeKeyAt(s, ch, t) {
        const keys = s.ch[ch].keys;
        const i = keys.findIndex(k => Math.abs(k.t - t) < KEY_EPS);
        if (i < 0) return false;
        keys.splice(i, 1);
        return true;
      }

      const TEXT_PAD_X = 7;
      const TEXT_PAD_Y = 3;

      function textFontSize() {
        return Math.max(14, Math.round(Number(sizeInput.value) * 6));
      }

      function hideTextEditor() {
        textEdit = null;
        textInput.style.display = 'none';
        textInput.value = '';
      }

      function openTextEditor(p, shape) {
        const z = view.zoom;
        if (shape) {
          const b = Geom.boundsOf(shape);
          textEdit = { mode: 'edit', shape };
          textInput.value = shape.base.text || '';
          textInput.style.left = Math.round(b.x * z + view.x) + 'px';
          textInput.style.top = Math.round(b.y * z + view.y) + 'px';
          textInput.style.fontSize = (shape.base.fontSize || 20) * z + 'px';
          textInput.style.color = shape.color || colorInput.value;
        } else {
          textEdit = { mode: 'new', x: p.x, y: p.y };
          textInput.value = '';
          textInput.style.left = Math.round(p.x * z + view.x - TEXT_PAD_X) + 'px';
          textInput.style.top = Math.round(p.y * z + view.y - TEXT_PAD_Y) + 'px';
          textInput.style.fontSize = textFontSize() * z + 'px';
          textInput.style.color = colorInput.value;
        }
        textInput.style.display = 'block';
        textInput.focus();
        textInput.select();
      }

      function commitTextEditor() {
        const ed = textEdit;
        if (!ed) return;
        const val = textInput.value.replace(/\s+$/, '');
        hideTextEditor();
        if (ed.mode === 'edit') {
          if (val && ed.shape.base.text !== val) {
            ed.shape.base.text = val;
            timeline.buildTimeline();
          }
          history.commit();
          render();
          return;
        }
        if (!val) { history.commit(); render(); return; }
        const s = {
          type: 'text',
          x: ed.x, y: ed.y,
          text: val,
          fontSize: textFontSize(),
          color: colorInput.value,
          width: Number(sizeInput.value)
        };
        initShape(s);
        shapes.push(s);
        history.commit();
        selected = s;
        activeCh = 'x';
        activeKey = null;
        keySel.clear();
        moving = null;
        lastPoint = null;
        scaling = null;
        rotating = null;
        timeline.buildTimeline();
        render();
      }

      function cancelTextEditor() {
        if (!textEdit) return;
        hideTextEditor();
        history.commit();
        render();
      }

      textInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); commitTextEditor(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelTextEditor(); }
      });
      textInput.addEventListener('blur', () => { if (textEdit) commitTextEditor(); });


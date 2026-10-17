      class Timeline {
        constructor() {
          this._kdMove = (e) => this.onKeyDragMove(e);
          this._kdEnd = (e) => this.onKeyDragEnd(e);
        }
        tlSpan() {
          return Math.max(1e-6, tlView.t1 - tlView.t0);
        }

        pct(t) {
          return ((t - tlView.t0) / this.tlSpan()) * 100;
        }

        tlTimeAt(clientX) {
          const rect = tlTracks.getBoundingClientRect();
          const f = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
          return tlView.t0 + f * this.tlSpan();
        }

        tlRowH() {
          // 行高下限须保证名称文字可读，避免滚动缩放后文字被裁切消失
          return Math.max(21, 24 * tlView.vscale);
        }

        tlBodyHeight() {
          return Math.max(0, tlTracks.clientHeight - tlRuler.clientHeight);
        }

        clampTlH() {
          const minSpan = Math.min(0.05, duration);
          let span = tlView.t1 - tlView.t0;
          if (!(span > 0)) { tlView.t0 = 0; tlView.t1 = duration; return; }
          span = clampNum(span, minSpan, duration);
          if (tlView.t0 > duration - span) tlView.t0 = duration - span;
          if (tlView.t0 < 0) tlView.t0 = 0;
          tlView.t1 = tlView.t0 + span;
        }

        tlRowCount() {
          let n = 0;
          for (const s of shapes) n += 1 + (s.expanded ? displayChannels(s).length : 0);
          return n;
        }

        clampTlV() {
          const maxY = Math.max(0, this.tlRowCount() * this.tlRowH() - this.tlBodyHeight());
          tlView.rowY = clampNum(tlView.rowY, 0, maxY);
        }

        applyTlScroll() {
          const ty = 'translateY(' + (-tlView.rowY) + 'px)';
          tlRows.style.transform = ty;
          tlNamesInner.style.transform = ty;
        }

        buildRuler() {
          tlRuler.innerHTML = '';
          const w = Math.max(80, tlTracks.clientWidth || 300);
          const span = this.tlSpan();
          const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10];
          let step = steps[steps.length - 1];
          for (const s of steps) { if ((s / span) * w >= 40) { step = s; break; } }
          let labelStep = steps[steps.length - 1];
          for (const s of steps) { if ((s / span) * w >= 84) { labelStep = s; break; } }
          const start = Math.ceil(tlView.t0 / step - 1e-9) * step;
          for (let v = start; v <= tlView.t1 + 1e-6; v += step) {
            const t = Math.round(v * 1000) / 1000;
            const p = this.pct(t);
            const labelOn = Math.abs(t / labelStep - Math.round(t / labelStep)) < 1e-6;
            const tick = document.createElement('div');
            tick.className = 'tl-tick' + (labelOn ? ' major' : '');
            tick.style.left = p + '%';
            tlRuler.appendChild(tick);
            if (labelOn) {
              const label = document.createElement('div');
              label.className = 'tl-tick-label';
              label.textContent = t + 's';
              label.style.left = p + '%';
              if (p > 92) label.style.transform = 'translateX(calc(-100% - 2px))';
              tlRuler.appendChild(label);
            }
          }
        }

        collectKeySel() {
          const out = [];
          for (const s of shapes) {
            for (const ch of shapeChannels(s)) {
              for (const k of s.ch[ch].keys) if (keySel.has(k)) out.push({ s, ch, k });
            }
          }
          return out;
        }

        pruneKeySel() {
          if (!keySel.size) return;
          const alive = new Set();
          for (const s of shapes) {
            for (const ch of shapeChannels(s)) {
              for (const k of s.ch[ch].keys) if (keySel.has(k)) alive.add(k);
            }
          }
          if (alive.size !== keySel.size) {
            keySel = alive;
            if (activeKey && !alive.has(activeKey)) activeKey = null;
          }
        }

        keyDragDeltaRange(items) {
          const gap = 0.01;
          let lo = -Infinity;
          let hi = Infinity;
          const groups = new Map();
          for (const it of items) {
            lo = Math.max(lo, -it.k.t);
            hi = Math.min(hi, duration - it.k.t);
            const arr = it.s.ch[it.ch].keys;
            if (!groups.has(arr)) groups.set(arr, new Set());
            groups.get(arr).add(it.k);
          }
          for (const [arr, sel] of groups) {
            for (const k of sel) {
              let lower = -Infinity;
              let upper = Infinity;
              for (const other of arr) {
                if (sel.has(other)) continue;
                if (other.t <= k.t) lower = Math.max(lower, other.t);
                else upper = Math.min(upper, other.t);
              }
              if (lower > -Infinity) lo = Math.max(lo, lower + gap - k.t);
              if (upper < Infinity) hi = Math.min(hi, upper - gap - k.t);
            }
          }
          if (lo > hi) { const mid = (lo + hi) / 2; return { lo: mid, hi: mid }; }
          return { lo, hi };
        }

        onKeyDragMove(e) {
          if (!kfDrag) return;
          if (!kfDrag.moved && Math.abs(e.clientX - kfDrag.x0) < 3) return;
          kfDrag.moved = true;
          const range = this.keyDragDeltaRange(kfDrag.items);
          const d = clampNum(this.tlTimeAt(e.clientX) - kfDrag.anchorBase, range.lo, range.hi);
          for (let i = 0; i < kfDrag.items.length; i++) {
            kfDrag.items[i].k.t = Math.round((kfDrag.base[i] + d) * 100) / 100;
          }
          for (const arr of kfDrag.arrays) arr.sort((a, b) => a.t - b.t);
          player.setTime(kfDrag.anchor.t);
          this.buildTimeline();
        }

        onKeyDragEnd() {
          window.removeEventListener('pointermove', this._kdMove);
          window.removeEventListener('pointerup', this._kdEnd);
          window.removeEventListener('pointercancel', this._kdEnd);
          document.body.style.cursor = '';
          kfDrag = null;
          history.commit();
          this.buildTimeline();
        }

        startKeyDrag(s, ch, k, e) {
          history.begin();
          let items = this.collectKeySel();
          if (!items.length) items = [{ s, ch, k }];
          const arrays = [];
          for (const it of items) {
            const arr = it.s.ch[it.ch].keys;
            if (arrays.indexOf(arr) < 0) arrays.push(arr);
          }
          const ai = items.findIndex(it => it.k === k);
          kfDrag = {
            items,
            arrays,
            set: new Set(items.map(it => it.k)),
            base: items.map(it => it.k.t),
            anchor: k,
            anchorBase: items[ai >= 0 ? ai : 0].k.t,
            x0: e.clientX,
            moved: false
          };
          window.addEventListener('pointermove', this._kdMove);
          window.addEventListener('pointerup', this._kdEnd);
          window.addEventListener('pointercancel', this._kdEnd);
          document.body.style.cursor = 'ew-resize';
        }

        buildTimeline() {
          curveEditor.ensureActiveKey();
          this.pruneKeySel();
          this.buildRuler();
          this.clampTlV();
          tlNamesInner.innerHTML = '';
          tlRows.innerHTML = '';
          const rowH = this.tlRowH();

          // 统一的行描述列表：左列名称与右列轨道都由此表逐一生成，任何情况都保证 1:1 对齐、无错位、无遮挡
          const rows = [];
          for (const s of shapes) {
            rows.push({ s, group: true });
            if (s.expanded) {
              for (const ch of displayChannels(s)) rows.push({ s, ch });
            }
          }

          const namesFrag = document.createDocumentFragment();
          const rowsFrag = document.createDocumentFragment();

          for (const r of rows) {
            const s = r.s;
            const height = rowH + 'px';

            if (r.group) {
              const groupActive = s === selected;
              const nameEl = document.createElement('div');
              nameEl.className = 'tl-name tl-group' + (groupActive ? ' active' : '');
              nameEl.style.height = height;
              nameEl.title = s.name + '（点击选择图形）';
              const caret = document.createElement('span');
              caret.className = 'tl-caret';
              caret.textContent = s.expanded ? '▾' : '▸';
              caret.title = s.expanded ? '收起通道' : '展开通道';
              caret.addEventListener('click', (ev) => {
                ev.stopPropagation();
                s.expanded = !s.expanded;
                this.buildTimeline();
              });
              const label = document.createElement('span');
              label.className = 'tl-group-label';
              label.textContent = s.name;
              nameEl.appendChild(caret);
              nameEl.appendChild(label);
              nameEl.addEventListener('click', () => {
                if (s !== selected) { activeKey = null; activeCh = null; }
                keySel.clear(); // 选中物体即退出关键帧选择，确保 Del 删除物体
                selected = s;
                moving = null;
                lastPoint = null;
                scaling = null;
                rotating = null;
                this.buildTimeline();
                render();
              });
              namesFrag.appendChild(nameEl);

              const groupRow = document.createElement('div');
              groupRow.className = 'tl-row tl-group' + (groupActive ? ' active' : '');
              groupRow.style.height = height;
              rowsFrag.appendChild(groupRow);
              continue;
            }

            const ch = r.ch;
            const chActive = s === selected && activeCh === ch;

            const cName = document.createElement('div');
            cName.className = 'tl-name tl-ch' + (chActive ? ' active' : '');
            cName.style.height = height;
            cName.textContent = CH_LABEL[ch];
            cName.title = CH_LABEL[ch];
            cName.addEventListener('click', () => {
              selected = s;
              activeCh = ch;
              activeKey = null;
              keySel.clear();
              moving = null;
              lastPoint = null;
              scaling = null;
              rotating = null;
              this.buildTimeline();
              render();
            });
            namesFrag.appendChild(cName);

            const row = document.createElement('div');
            row.className = 'tl-row' + (chActive ? ' active' : '');
            row.style.height = height;
            const keys = s.ch[ch].keys;
            if (chActive && activeKey) {
              const i = keys.indexOf(activeKey);
              if (i >= 0 && i < keys.length - 1) {
                const next = keys[i + 1];
                const segEl = document.createElement('div');
                segEl.className = 'tl-seg';
                segEl.style.left = this.pct(activeKey.t) + '%';
                segEl.style.width = (this.pct(next.t) - this.pct(activeKey.t)) + '%';
                segEl.title = '这段受速度曲线控制';
                row.appendChild(segEl);
              }
            }
            for (const k of keys) {
              const kf = document.createElement('div');
              kf.className = 'tl-key'
                + (chActive && k === activeKey ? ' active' : '')
                + (keySel.has(k) ? ' multi' : '')
                + (kfDrag && kfDrag.set && kfDrag.set.has(k) ? ' dragging' : '');
              kf.style.left = this.pct(k.t) + '%';
              kf.title = CH_LABEL[ch] + ' @ ' + k.t.toFixed(2) + 's = ' + (Math.round(k.v * 1000) / 1000) + '（Shift 多选 · 按住拖动改时间）';
              kf.addEventListener('pointerdown', (ev) => {
                ev.stopPropagation();
                if (ev.button !== 0) return;
                ev.preventDefault();
                selected = s;
                activeCh = ch;
                moving = null;
                lastPoint = null;
                scaling = null;
                rotating = null;
                player.pause();
                if (ev.shiftKey) {
                  if (keySel.has(k)) {
                    keySel.delete(k);
                    activeKey = null;
                    this.buildTimeline();
                    render();
                    return;
                  }
                  keySel.add(k);
                } else {
                  if (!keySel.has(k)) keySel.clear();
                  keySel.add(k);
                }
                activeKey = k;
                player.setTime(k.t);
                this.startKeyDrag(s, ch, k, ev);
                this.buildTimeline();
                render();
              });
              row.appendChild(kf);
            }
            rowsFrag.appendChild(row);
          }

          tlNamesInner.appendChild(namesFrag);
          tlRows.appendChild(rowsFrag);

          this.applyTlScroll();
          player.updatePlayhead();
          curveEditor.resizeCurve();
        }
      }


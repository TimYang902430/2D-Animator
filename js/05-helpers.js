
      function captureBase(s) {
        if (isStrokeLike(s.type)) return { points: s.points.map(p => ({ x: p.x, y: p.y })) };
        if (s.type === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
        if (s.type === 'text') return { x: s.x, y: s.y, text: s.text, fontSize: s.fontSize };
        return { x: s.x, y: s.y, r: s.r };
      }

      const HANDLE = 3.5;
      const HANDLE_HIT = 9;
      const ROT_DIST = 26;
      const ROT_HIT = 12;
      const HANDLE_CURSOR = {
        nw: 'nwse-resize', se: 'nwse-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize',
        e: 'ew-resize', w: 'ew-resize'
      };

      const FRAME_HIT = 10;
      const FRAME_MIN = 24;

      const FRAME_CURSOR = {
        nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize'
      };

      function downloadBlob(blob, filename) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      function pickVideoMime() {
        if (!window.MediaRecorder) return '';
        const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        for (const c of cands) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
        }
        return '';
      }

      function exportVideo() {
        if (recording) return;
        if (typeof canvas.captureStream !== 'function') { alert('当前浏览器不支持画布录制'); return; }
        const mime = pickVideoMime();
        if (!mime) { alert('当前浏览器不支持视频录制'); return; }

        player.pause();
        const s = dpr;
        const ow = Math.max(2, Math.round(frame.w * s)), oh = Math.max(2, Math.round(frame.h * s));
        const off = document.createElement('canvas');
        off.width = ow;
        off.height = oh;
        const octx = off.getContext('2d');

        videoTap = { octx, scale: s, fx: frame.x, fy: frame.y, fw: frame.w, fh: frame.h, ow, oh };
        suppressOverlay = true;
        player.setTime(0);

        const stream = off.captureStream(60);
        const chunks = [];
        let rec = null;
        try {
          rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
        } catch (err) {
          videoTap = null;
          suppressOverlay = false;
          render();
          alert('视频录制启动失败：' + err.message);
          return;
        }

        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          videoTap = null;
          suppressOverlay = false;
          recording = false;
          videoBtn.disabled = false;
          videoBtn.textContent = '导出视频';
          render();
          const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
          downloadBlob(new Blob(chunks, { type: mime.split(';')[0] }), 'drawing-' + ow + 'x' + oh + '.' + ext);
        };

        recording = true;
        videoBtn.disabled = true;
        videoBtn.textContent = '录制中…';
        rec.start();
        render();

        const waitEnd = () => {
          if (playing) { requestAnimationFrame(waitEnd); return; }
          setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 150);
        };
        setTimeout(() => { player.play(); requestAnimationFrame(waitEnd); }, 120);
      }


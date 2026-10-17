      bgColorInput.addEventListener('input', render);

      // 选中图形时，颜色选择器调整其颜色（拖动一次只记一步撤销）
      let colorDirty = false;
      colorInput.addEventListener('input', () => {
        if (!selected) return;
        if (!colorDirty) { history.begin(); colorDirty = true; }
        selected.color = colorInput.value;
        render();
      });
      colorInput.addEventListener('change', () => {
        if (colorDirty) { colorDirty = false; history.commit(); }
      });

      frameWInput.addEventListener('change', () => frameCtrl.setSize(Number(frameWInput.value) || frame.w, frame.h));
      frameHInput.addEventListener('change', () => frameCtrl.setSize(frame.w, Number(frameHInput.value) || frame.h));
      videoBtn.addEventListener('click', exportVideo);
      centerFrameBtn.addEventListener('click', () => frameCtrl.center());

      saveBtn.addEventListener('click', () => doc.saveDoc(false));
      saveAsBtn.addEventListener('click', () => doc.saveDoc(true));
      const applyOpenJson = (text, handle) => {
        try {
          doc.loadDoc(JSON.parse(text));
          history.clear();
          saveFileHandle = handle || null; // 记录文件句柄，"保存"直接覆盖写回打开/另存为的文件
        } catch (err) {
          alert(tr('打开失败：') + err.message);
        }
      };
      openBtn.addEventListener('click', async () => {
        if (window.showOpenFilePicker) {
          try {
            const [h] = await window.showOpenFilePicker({
              types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const file = await h.getFile();
            applyOpenJson(String(await file.text()), h);
            return;
          } catch (err) {
            if (err && err.name === 'AbortError') return; // 用户取消
          }
        }
        openFile.click();
      });
      openFile.addEventListener('change', () => {
        const f = openFile.files && openFile.files[0];
        openFile.value = '';
        if (!f) return;
        const fr = new FileReader();
        fr.onload = () => applyOpenJson(String(fr.result), null);
        fr.onerror = () => alert(tr('读取文件失败'));
        fr.readAsText(f);
      });


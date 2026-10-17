// ---- 界面语言（中文 / English） ----
// 以中文原文作为字典键：找不到英文时自动回退中文，便于逐步补全、不会出现空白文案。
const I18N_EN = {
  // 标题与分组
  '图形画板': 'Shape Board',
  '创建图形': 'Create',

  // 工具
  '笔画': 'Stroke',
  '直线': 'Line',
  '拖动画直线（按住 Shift 吸附 45°）': 'Drag to draw a line (hold Shift to snap to 45°)',
  '方块': 'Rect',
  '圆形': 'Circle',
  '文字': 'Text',
  '选择 / 移动': 'Select / Move',
  '构图框': 'Frame',
  '构图框（导出区域）：拖动移动，拖四角缩放': 'Export frame: drag to move, drag corners to resize',
  '宽': 'W',
  '高': 'H',
  '居中': 'Center',
  '把构图框居中到画布': 'Center the frame on the canvas',
  '导出视频': 'Export video',
  '按构图框录制导出视频（播放一遍后自动下载）': 'Record the frame area (plays once, then downloads)',
  '颜色': 'Color',
  '粗细': 'Width',
  '实心': 'Fill',
  '实心填充（新图形生效；有选中图形时切换它的填充）': 'Solid fill (applies to new shapes; toggles the selected shape)',
  '吸附': 'Snap',
  '开启/关闭移动吸附': 'Toggle move snapping',
  '洋葱皮': 'Onion skin',
  '开': 'On',
  '关': 'Off',
  '开启/关闭洋葱皮（显示前后帧的幽灵轮廓）': 'Toggle onion skin (ghost outlines of nearby frames)',
  '当前帧之前显示的幽灵帧数': 'Ghost frames before the current frame',
  '当前帧之后显示的幽灵帧数': 'Ghost frames after the current frame',
  '相邻幽灵帧的时间间隔（秒）': 'Time step between ghost frames (seconds)',
  '背景': 'Background',
  '清空': 'Clear',
  '⛶ 全屏': '⛶ Fullscreen',
  '⛶ 退出全屏': '⛶ Exit fullscreen',
  '保存': 'Save',
  '首次点按选择保存位置（等同另存为），之后点按直接覆盖更新同一文件': 'First click picks a location (same as Save As), later clicks overwrite that file',
  '另存为': 'Save as',
  '另存为：重新选择保存位置': 'Save as: pick a new location',
  '打开': 'Open',
  '打开之前保存的 JSON 文件': 'Open a previously saved JSON file',

  // 轨迹绘制条
  '折线': 'Polyline',
  '曲线': 'Curve',
  '完成': 'Done',
  '取消': 'Cancel',
  '绘制轨迹：点击添加锚点': 'Draw path: click to add anchors',
  '绘制轨迹：从圆心拖出半径': 'Draw path: drag from the center to set the radius',

  // 面板拖动与停靠
  '拖动调整画布与时间线的高度': 'Drag to resize the canvas / timeline height',
  '按住拖动，可停靠到顶部或底部': 'Drag to dock at the top or bottom',
  '按住拖动，可停靠到左侧或右侧': 'Drag to dock at the left or right',
  '拖动调整轨道列表宽度': 'Drag to resize the track list width',
  '拖动调整曲线面板宽度': 'Drag to resize the curve panel width',

  // 时间线
  '▶ 播放': '▶ Play',
  '⏸ 暂停': '⏸ Pause',
  '打关键帧': 'Add keyframe',
  '选择「打关键帧」要写入的通道（可多选）': 'Channels written by “Add keyframe” (multi-select)',
  '位移': 'Move',
  '缩放': 'Scale',
  '旋转': 'Rotate',
  '删除关键帧': 'Delete keyframe',
  '放置「显隐」关键帧：出现/消失=瞬间突变，淡入/淡出=渐变': 'Visibility keyframes: Show/Hide = instant, Fade in/out = gradual',
  '出现': 'Show',
  '此刻瞬间出现（阶跃）': 'Appear instantly (step)',
  '消失': 'Hide',
  '此刻瞬间消失（阶跃）': 'Disappear instantly (step)',
  '淡入': 'Fade in',
  '从上一帧渐变到不透明': 'Fade in from the previous keyframe',
  '淡出': 'Fade out',
  '从上一帧渐变到透明': 'Fade out to transparent from the previous keyframe',
  '时长': 'Duration',
  '秒': 's',
  '（点击选择图形）': ' (click to select this shape)',
  '收起通道': 'Collapse channels',
  '展开通道': 'Expand channels',
  '这段受速度曲线控制': 'This segment is driven by the speed curve',
  '{ch} @ {t}s = {v}（Shift 多选 · 按住拖动改时间）': '{ch} @ {t}s = {v} (Shift: multi-select · drag to change time)',

  // 通道名
  '移动X': 'Move X',
  '移动Y': 'Move Y',
  '缩放X': 'Scale X',
  '缩放Y': 'Scale Y',
  '显隐': 'Visibility',
  '轨迹': 'Path',

  // 右键菜单
  '复位视图（100%）': 'Reset view (100%)',
  '按轨迹移动 · 折线': 'Move along path · polyline',
  '按轨迹移动 · 圆形': 'Move along path · circle',
  '删除轨迹': 'Delete path',
  '轨迹改为折线': 'Path → polyline',
  '轨迹改为曲线': 'Path → curve',
  '重绘轨迹': 'Redraw path',

  // 速度曲线面板
  '速度曲线': 'Speed curve',
  '先选中图形': 'Select a shape first',
  '无通道': 'No channel',
  '复位': 'Reset',
  '恢复曲线视野（也可双击曲线面板）': 'Reset the curve view (or double-click the curve panel)',
  '滚轮 缩放视角 · 拖空白处平移 · 拖曲线或圆点调曲线 · 双击复位': 'Wheel: zoom · drag empty space: pan · drag curve or dots: edit · double-click: reset',
  '{ch}：只有 1 个关键帧': '{ch}: only 1 keyframe',
  '拖播放头到别处再打 1 帧': 'Move the playhead elsewhere and add another keyframe',
  '{ch}：无区段': '{ch}: no segment',
  '{ch} 第 {a}→{b} 段 · {span}s': '{ch} segment {a}→{b} · {span}s',
  '阶跃（瞬变）：保持到段末后跳到 {v}': 'Step (instant): holds to the end of the segment, then jumps to {v}',
  '这两帧数值相同，曲线看不出效果': 'Both keyframes hold the same value, so the curve has no visible effect',
  '{ch}：末尾关键帧': '{ch}: last keyframe',
  '后面没有区段，曲线不生效': 'No segment follows, so the curve has no effect',

  // 缓动预设
  '线性': 'Linear',
  '缓入': 'Ease in',
  '缓出': 'Ease out',
  '缓入缓出': 'Ease in-out',
  '回弹': 'Back',

  // 提示与报错
  '当前浏览器不支持画布录制': 'This browser does not support canvas recording',
  '当前浏览器不支持视频录制': 'This browser does not support video recording',
  '视频录制启动失败：': 'Failed to start recording: ',
  '录制中…': 'Recording…',
  '打开失败：': 'Open failed: ',
  '读取文件失败': 'Failed to read the file',
  '不是有效的作品文件': 'Not a valid project file'
};

let LANG = (() => {
  try {
    const saved = localStorage.getItem('uiLang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch (e) { }
  const nav = String(navigator.language || navigator.userLanguage || '').toLowerCase();
  return nav.indexOf('zh') === 0 ? 'zh' : 'en';
})();

// 取当前语言的文案；vars 用于填充 {name} 占位符
function tr(s, vars) {
  let out = LANG === 'en' && Object.prototype.hasOwnProperty.call(I18N_EN, s) ? I18N_EN[s] : s;
  if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
  return out;
}

// 自动生成的图形名（如「方块 1」）按当前语言显示，不改动存档里的数据
function shapeLabel(s) {
  const m = /^(.+?)(\s+\d+)$/.exec(s.name || '');
  return m ? tr(m[1]) + m[2] : (s.name || '');
}

const langBtn = document.getElementById('langBtn');

function applyI18n() {
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  document.title = tr('图形画板');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
  langBtn.textContent = LANG === 'en' ? '中' : 'EN';
  langBtn.title = LANG === 'en' ? '切换到中文' : 'Switch to English';
}

// 切换语言后刷新所有动态文案（依赖后续脚本里的全局，故只在加载完成后调用）
function refreshLang() {
  applyI18n();
  playBtn.textContent = playing ? tr('⏸ 暂停') : tr('▶ 播放');
  updateFsBtn();
  onionBtn.textContent = onionOn ? tr('开') : tr('关');
  if (!recording) videoBtn.textContent = tr('导出视频');
  if (pathDraw) updatePathBar();
  timeline.buildTimeline();
  curveEditor.drawCurve();
  render();
}

langBtn.addEventListener('click', () => {
  LANG = LANG === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('uiLang', LANG); } catch (e) { }
  refreshLang();
});

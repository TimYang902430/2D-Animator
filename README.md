# 图形画板 / Shape Board

一个零依赖、纯前端的二维图形动画画板：画图形、打关键帧、调速度曲线、导出视频，双击 `index.html` 即可使用。

A dependency-free, pure front-end 2D shape animation board: draw shapes, set keyframes, tune easing curves and export video. Just open `index.html`.

---

## 中文

### 快速开始

双击 `index.html`，或拖入浏览器打开（`file://` 协议即可，无需服务器、无需构建）。

### 功能

- **绘制**：笔画、直线、方块、圆形、文字（文字双击可再编辑）
- **构图框**：导出区域，可拖动/缩放/居中，可设宽高
- **动画**：时间轴 + 关键帧，通道包括 移动X / 移动Y / 缩放X / 缩放Y / 旋转 / 显隐 / 轨迹
- **速度曲线**：拖动三次贝塞尔控制点，或一键套用 线性 / 缓入 / 缓出 / 缓入缓出 / 回弹
- **轨迹运动**：右键图形 → 按轨迹移动（折线 / 圆形），轨迹可切换折线⇄曲线、重绘、删除
- **显隐关键帧**：出现 / 消失（瞬间阶跃）、淡入 / 淡出（渐变）
- **洋葱皮**：显示前后帧的幽灵轮廓（之前帧偏红、之后帧偏蓝），可调帧数与时间间隔
- **吸附**：移动时按 3px 阈值吸附到其他图形/构图框并显示蓝色参考线，可开关
- **导出视频**：按构图框区域录制一遍播放过程并自动下载
- **存取**：保存 / 另存为 / 打开 JSON 作品文件
- **撤销重做**：上限 50 步
- **界面语言**：工具栏右侧 `中 / EN` 按钮切换，默认跟随浏览器语言，选择会记住

### 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+0` | 复位视图（100%） |
| `空格` | 播放 / 暂停 |
| `G` | 移动选中图形（Blender 式） |
| `S` | 缩放选中图形（Blender 式） |
| `X` / `Y` | 变换中约束到水平 / 垂直轴 |
| `Enter` / 鼠标左键 | 确认变换 |
| `Esc` / 鼠标右键 | 取消变换（不产生撤销记录） |
| `Del` / `Backspace` | 删除选中图形；若已在时间轴选中关键帧，则删除关键帧 |
| `Ctrl+D` | 复制选中关键帧（单帧偏移 0.5s；多帧整组顺延到原组之后） |

### 鼠标操作

- **画布**：滚轮缩放视图；中键拖拽平移
- **选择工具**：拖动物体移动；拖四角手柄缩放；拖上方手柄旋转
- **直线工具**：按住 `Shift` 吸附 45°
- **时间线**：拖关键帧改时间（有吸附与边界限制）；`Shift` 多选；`Ctrl+滚轮` 缩放时间轴；滚轮缩放行高；中键拖拽平移
- **曲线面板**：滚轮缩放视角；拖空白处平移；拖曲线或圆点调曲线；双击复位
- **右键**：画布空白处或图形上弹出右键菜单（复位视图 / 轨迹相关操作）
- **分隔条 / 抓手 ⠿**：拖动调整面板大小；抓手可把时间线停靠到顶部或底部、把曲线面板停靠到左侧或右侧

### 保存与打开

- **保存**：直接覆盖当前绑定的文件（首次点按等同「另存为」）
- **另存为**：重新选择保存位置
- **打开**：打开之前保存的 JSON，之后「保存」直接覆盖该文件
- 浏览器不支持 File System Access API 或用户取消时，自动回退为下载 JSON 文件

### 作品文件格式

JSON 文本，主要字段：

```jsonc
{
  "app": "drawing-board",
  "version": 1,
  "duration": 5,              // 时长（秒）
  "currentTime": 0,           // 上次的播放位置
  "bg": "#ffffff",            // 背景色
  "nextId": 3,                // 自增 id
  "typeCount": { "rect": 2 }, // 各类型自动命名计数
  "frame":     { "x": 0, "y": 0, "w": 640, "h": 360 },  // 构图框
  "frameWant": { "w": 640, "h": 360 },
  "framePinned": true,
  "shapes": [
    {
      "id": 1,
      "name": "方块 1",
      "type": "rect",                  // stroke | line | rect | circle | text
      "base": { "x": 0, "y": 0, "w": 100, "h": 60 },
      "pivot": { "x": 50, "y": 30 },   // 变换中心
      "tf": { "x": 0, "y": 0, "sx": 1, "sy": 1, "rot": 0, "op": 1 },
      "ch": {                          // 通道关键帧，t=时间(秒)，v=值，ease=该帧到下一帧的缓动
        "x": { "keys": [{ "t": 0, "v": 0, "ease": { "x1": 0, "y1": 0, "x2": 1, "y2": 1 } }] }
      },
      "path": { "type": "poly", "pts": [], "smooth": false }, // 可选：轨迹
      "color": "#2f6fed",
      "width": 4,
      "filled": false,
      "expanded": true                 // 时间轴中通道行是否展开
    }
  ]
}
```

### 项目结构

```
index.html        页面结构、静态文案（data-i18n 标记）与脚本加载顺序
style.css         全部样式
js/00-i18n.js     界面语言：中英文字典、tr()、applyI18n()、refreshLang()
js/01-state.js    全局状态与 DOM 引用
js/02-core.js     View / Player / History / Frame
js/03-ui.js       布局、面板拖动与停靠、工具切换、洋葱皮
js/04-geom.js     通道常量与几何工具 Geom
js/05-helpers.js  手柄常量与视频导出
js/06-path.js     轨迹绘制与右键菜单
js/07-doc.js      作品存取 Doc
js/08-render-transform.js  撤销栈、渲染、Blender 式变换
js/09-anim-text.js 缓动采样、关键帧读写、文字编辑
js/10-input.js    指针 / 键盘输入与绘制流程
js/11-io-color.js 颜色输入与保存/打开按钮
js/12-timeline.js 时间线渲染与关键帧拖动
js/13-curve.js    速度曲线面板
js/14-app.js      实例化、曲线面板交互、快捷键、初始化
```

均为经典 `<script src>` 顺序脚本（非 ES modules），因此 `file://` 双击打开即可运行；加载顺序即依赖顺序。

### 浏览器兼容

- 推荐 Chrome / Edge：支持直接覆盖保存（File System Access API）与视频导出（MediaRecorder）
- 其他浏览器：保存回退为下载 JSON；部分浏览器不支持视频导出
- 修改代码后若看到旧效果，按 `Ctrl+F5` 强制刷新

---

## English

### Quick start

Double-click `index.html` or drag it into a browser — works over `file://`, no server or build step required.

### Features

- **Drawing**: stroke, line, rect, circle, text (double-click text to edit again)
- **Frame**: the export area — move, resize, center, or type exact width/height
- **Animation**: timeline with keyframes on channels — Move X / Move Y / Scale X / Scale Y / Rotate / Visibility / Path
- **Speed curve**: drag the cubic-bezier control points, or apply Linear / Ease in / Ease out / Ease in-out / Back
- **Path motion**: right-click a shape → Move along path (polyline / circle); paths can be switched polyline⇄curve, redrawn or deleted
- **Visibility keyframes**: Show / Hide (instant step), Fade in / Fade out (gradual)
- **Onion skin**: ghost outlines of neighbouring frames (earlier frames red, later frames blue), with configurable count and time step
- **Snapping**: 3 px threshold while moving, with blue guide lines; can be toggled
- **Video export**: records the frame area over one playback and downloads automatically
- **Files**: save / save as / open JSON project files
- **Undo/redo**: up to 50 steps
- **UI language**: the `中 / EN` button in the toolbar; defaults to the browser language and remembers your choice

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+0` | Reset view (100%) |
| `Space` | Play / pause |
| `G` | Move the selected shape (Blender-style) |
| `S` | Scale the selected shape (Blender-style) |
| `X` / `Y` | Constrain the transform to the horizontal / vertical axis |
| `Enter` / left click | Confirm the transform |
| `Esc` / right click | Cancel the transform (no undo record) |
| `Del` / `Backspace` | Delete the selected shape; deletes keyframes instead when keyframes are selected in the timeline |
| `Ctrl+D` | Duplicate selected keyframes (single: +0.5 s; a multi-selection is offset as a group after the original) |

### Mouse

- **Canvas**: wheel to zoom; middle-drag to pan
- **Select tool**: drag a shape to move it; drag corner handles to scale; drag the handle above to rotate
- **Line tool**: hold `Shift` to snap to 45°
- **Timeline**: drag a keyframe to change its time (with snapping and bounds); `Shift` to multi-select; `Ctrl+wheel` zooms time; wheel scales row height; middle-drag to pan
- **Curve panel**: wheel to zoom, drag empty space to pan, drag the curve or dots to edit, double-click to reset
- **Right click**: context menu on empty canvas or on a shape (reset view / path actions)
- **Gutters and ⠿ grips**: drag to resize panels; grips dock the timeline to the top/bottom and the curve panel to the left/right

### Saving and opening

- **Save**: overwrites the currently bound file (the first click behaves like “Save as”)
- **Save as**: pick a new location
- **Open**: loads a previously saved JSON file; later “Save” overwrites that file
- When the File System Access API is unavailable or the dialog is cancelled, it falls back to downloading a JSON file

### Project file format

Plain JSON. Main fields:

```jsonc
{
  "app": "drawing-board",
  "version": 1,
  "duration": 5,              // seconds
  "currentTime": 0,           // last playhead position
  "bg": "#ffffff",            // background color
  "nextId": 3,
  "typeCount": { "rect": 2 }, // per-type auto-naming counters
  "frame":     { "x": 0, "y": 0, "w": 640, "h": 360 },
  "frameWant": { "w": 640, "h": 360 },
  "framePinned": true,
  "shapes": [
    {
      "id": 1,
      "name": "Rect 1",
      "type": "rect",                  // stroke | line | rect | circle | text
      "base": { "x": 0, "y": 0, "w": 100, "h": 60 },
      "pivot": { "x": 50, "y": 30 },
      "tf": { "x": 0, "y": 0, "sx": 1, "sy": 1, "rot": 0, "op": 1 },
      "ch": {                          // keyframes: t = time (s), v = value, ease = easing to the next key
        "x": { "keys": [{ "t": 0, "v": 0, "ease": { "x1": 0, "y1": 0, "x2": 1, "y2": 1 } }] }
      },
      "path": { "type": "poly", "pts": [], "smooth": false },
      "color": "#2f6fed",
      "width": 4,
      "filled": false,
      "expanded": true
    }
  ]
}
```

### Project layout

```
index.html        markup, static copy (data-i18n) and script order
style.css         all styles
js/00-i18n.js     UI language: dictionaries, tr(), applyI18n(), refreshLang()
js/01-state.js    global state and DOM references
js/02-core.js     View / Player / History / Frame
js/03-ui.js       layout, panel resize & docking, tool switching, onion skin
js/04-geom.js     channel constants and the Geom geometry helpers
js/05-helpers.js  handle constants and video export
js/06-path.js     path drawing and the context menu
js/07-doc.js      Doc: save / open project files
js/08-render-transform.js  undo stack, rendering, Blender-style transform
js/09-anim-text.js easing sampling, keyframe read/write, text editing
js/10-input.js    pointer / keyboard input and the draw flow
js/11-io-color.js color inputs and the save/open buttons
js/12-timeline.js timeline rendering and keyframe dragging
js/13-curve.js    speed curve panel
js/14-app.js      instantiation, curve panel interaction, shortcuts, init
```

All files are classic ordered `<script src>` scripts (not ES modules), so the app runs straight from `file://`; load order is dependency order.

### Browser support

- Chrome / Edge recommended: direct overwrite saving (File System Access API) and video export (MediaRecorder)
- Other browsers: saving falls back to downloading JSON; video export may be unavailable
- If you changed the code and still see old behaviour, hard-reload with `Ctrl+F5`

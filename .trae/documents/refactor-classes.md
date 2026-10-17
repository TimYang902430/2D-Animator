# 把相近功能归类成类（精简版）

## 目标
`e:\homemadeapps\physics\index.html`（约 3570 行单文件 IIFE）中相近的函数归成类，只重组代码，行为不变，仍保持单文件。

## 核心做法
类定义写在 IIFE 内部，类方法可以直接引用顶层变量（JS 闭包机制，已核验），所以共享状态（shapes/selected/currentTime/view 等）留在顶层不动，只需把函数装进类、调用处加类名前缀。无状态迁移、无逻辑改动，风险低。

## 拆 8 个类（都是搬运函数+改调用点）
1. **Geom**（静态类）— 图形几何/绘制/命中：baseBounds、tfOf、drawShape、hitTest、handleAt、snapMove、路径计算等约 25 个纯函数
2. **View** — 画布视图：canvasW/H、visible、reset、toLocal、滚轮缩放
3. **Frame** — 构图框：clamp、applyWant、center、setSize、handleAt、updateDrag、draw
4. **Doc** — 存取：collectDoc、normalizeShape、loadDoc、saveDoc
5. **Player** — 播放：setTime、play、pause、tick、scrubTo
6. **History** — 撤销：begin、commit、record、undo、redo、clear（栈状态移入 this）
7. **Timeline** — 时间线：buildTimeline、buildRuler、标尺/滚动/关键帧拖拽等
8. **CurveEditor** — 速度曲线：drawCurve、手柄命中、预设、缩放平移等

## 执行
按 Geom → View → Player → Frame → History → Doc → Timeline → CurveEditor 顺序，每改完一个类跑一次语法检查：
```powershell
node -e "const vm=require('vm');const s=require('fs').readFileSync('e:/homemadeapps/physics/index.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new vm.Script(m[1]);console.log('syntax OK')"
```
全部完成后在浏览器手测主要功能（绘制/撤销/播放/曲线/保存打开）。

## 注意
- 作为事件监听器直接传方法会丢 this，一律箭头函数包装
- collectDoc 原样保留（撤销靠它判断快照是否变化）
- 顶层 view/frame 对象保持唯一，类方法闭包引用，不重建

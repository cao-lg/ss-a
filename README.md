# 学练测一体化平台（框架 Demo）

基于《需求补充规格 v0.2》搭出的可运行框架：把任意教材拆成「课程 → 章节 → 单元」，
每个单元跑通 **单元前测（诊断）→ 学习 + 交互检查点（高密度反馈）→ 探索 & 挑战（梯度·趣味）
→ 单元后测（测掌握度）→ 学习增益** 的自适应闭环。

## 技术栈

- 前端：Vite + React 18 + React Router 6 + react-markdown（GFM 表格 / 代码高亮）
- 存储：IndexedDB（idb-keyval）本地持久化，等价于后端 D1 的 `assessment_records` / `checkpoint_records` / `progress` 三张表
- 代码执行：可插拔 Pyodide（浏览器端 Python），离线时优雅降级
- 说明：本 Demo 为本地自包含版，**无需 Cloudflare 账号**；后端 API（`/api/assessment` 等）
  由 `src/lib/api.js` 模拟，后续可替换为真实 Cloudflare Workers + D1。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
# 或 npm run build && npm run preview
```

## 目录

```
src/
  lib/        storage(IndexedDB) · api(模拟后端) · judge(判题) · mdParser(指令解析) · codeRunner(Pyodide)
  components/ Layout · CourseList · CourseDetail · LearnUnit · Checkpoint · Explore · Challenge · AssessmentModal · Profile
public/data/
  courses/    manifest.json + [course].json + [unit].md   （课程内容）
  assessments/ [unit].json                                （单元前/后测）
```

## 单元正文指令（Markdown 扩展）

```
:::checkpoint{type="fill|multiple_choice|predict" question="..." options=["A","B"] answer="B" feedback="..."}
:::explore{title="动手试" body="..."}
:::challenge{id="u_xx_c1" type="fill|multiple_choice|output" title="进阶挑战" instruction="..." answer="..."}
```

## 已内置内容

- `sample-course`：温度换算（通用模板示例，含 1 挑战）
- `sales-project4`：销售交易数据分析（来自《项目四》），其中 `u41 指标体系` 为完整拆解范本，
  `u44 水平序列预测` 含一个 **Python 代码挑战**（演示可插拔执行器），其余单元为框架占位内容，可继续充实。

## 下一步

- 用 `curriculum-decomposer` 技能把更多教材拆进 `public/data/`；
- 接入真实 Cloudflare Workers + D1（迁移脚本见《需求补充规格 v0.2》）；
- 视情况把 CodeMirror 6 换入 `Challenge` 的代码编辑区。

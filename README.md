# 🎓 LearnForExam (期末速通)

<div align="center">

**专为期末突击复习打造的智能考点提炼与刷题客户端**  
*将杂乱冗长的期末笔记，一键结构化重构为「考点通关地图」与「交互式自测题库」*

[![macOS](https://img.shields.io/badge/Platform-macOS%20%7C%20Web-blue.svg?logo=apple)]()
[![Tauri 2.0](https://img.shields.io/badge/Desktop-Tauri%202.0%20(Rust)-orange.svg?logo=tauri)]()
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-blue.svg?logo=react)]()
[![KaTeX](https://img.shields.io/badge/Math-KaTeX%20LaTeX-brightgreen.svg)]()
[![TailwindCSS](https://img.shields.io/badge/Styles-TailwindCSS%20v4-38B2AC.svg?logo=tailwind-css)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

[English](#-english-summary) · [功能特性](#-核心功能特性) · [快速上手](#-本地运行与开发) · [技术架构](#-技术栈与架构设计)

</div>

---

## 💡 为什么做这个项目？

在期末考前冲刺阶段，很多同学往往面临这样的真实困境：
- 面对自己记得**满满当当、杂乱无章的课堂笔记**，脑子里依然是一团浆糊；
- 传统的笔记工具（Notion、Obsidian 等）只能**存笔记**，却无法将笔记转化为**能背的卡片**和**能练的考题**；
- 漫长的 Anki 间隔重复算法并不适合期末 **“考前 3~5 天速通”** 的高压节奏。

**LearnForExam** 专为期末突击设计：只需将笔记直接粘贴或导入，AI 即可在本地将笔记**结构化聚类为核心考点模块**，并生成**带原文出处锚定的复习闪卡与客观试题**。

---

## ✨ 核心功能特性

### 1. 🧩 智能主题聚类与考点通关地图 (Topic Clusters & Roadmap)
- 自动分析并归纳整篇笔记，聚类提炼出 3~6 个核心考点模块（如：基础定义、核心定理、典型考法）；
- 模块化通关设计，清晰呈现各考点掌握进度百分比，建立考前掌控感。

### 2. ⚡ 3D 翻转考点闪卡 (Flashcards with KaTeX)
- 原生支持 **$\LaTeX$ 数学/理科公式** 高清排版（支持行内 `$...$`、`\(...\)` 与多行 `$$...$$`、`\begin{aligned}`）；
- 3D 翻折卡片交互，提供主动回忆（Active Recall）与「没记住 / 模糊 / 牢记」三档评分机制。

### 3. 🎯 客观自测试题与实时判分 (Single Choice & Cloze Quizzes)
- **单项选择题**：自动生成具有合理迷惑性的选项与考点深度解析；
- **挖空填空题**：精准挖出核心定理公式与专业名词，支持模糊智能判定；
- 通关答对触发粒子彩带（Confetti）正反馈。

### 4. 📖 原生 Markdown 分栏对照与精准溯源 (Split-Screen Note Viewer)
- **零幻觉信任保障**：每道题与闪卡均严格锚定原笔记出处段落；
- 点击题目下方的 **「在右侧分栏高亮原笔记出处 ➔」**，右侧分栏自动展开、平滑滚动并将对应原句用金色发光高亮（Animated Highlight Mark）标注出来。

### 5. 📕 考前高频错题收敛池 (Error Notebook)
- 所有自测中做错的题目自动归入错题池；
- 支持考前 15 分钟错题快速复盘与「标记攻克」清除机制。

### 6. 🔒 纯本地化隐私与全大模型兼容 (BYOK)
- **零隐私泄露**：笔记与生成题库全部保存在 Mac 本地（Local Storage），不上云；
- **真实流式输出（SSE Streaming）**：实时终端逐字展示大模型思考与生成过程；
- 支持 **DeepSeek-V3 / DeepSeek-R1**、OpenAI、OneAPI 等任意兼容接口，且默认内置 Demo 模式无需 Key 即可即开即用。

---

## 🛠️ 技术栈与架构设计

- **桌面端容器**：[Tauri 2.0](https://tauri.app/) (Rust 后端，轻量仅占用几十兆内存，原生系统级代理彻底避开 CORS 跨域)
- **前端框架**：[React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **公式排版**：[KaTeX](https://katex.org/) (极速数学公式与矩阵渲染)
- **Markdown 引擎**：[React-Markdown](https://github.com/remarkjs/react-markdown) + GFM + Rehype/Remark
- **UI 风格**：[TailwindCSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) (Dark macOS 原生沉浸质感)

---

## 🚀 本地运行与开发

### 环境准备
- [Node.js](https://nodejs.org/) (v18+) 或 [Bun](https://bun.sh/)
- [Rust & Cargo](https://www.rust-lang.org/) (用于 Tauri 桌面端编译)

### 快速开始

```bash
# 1. 克隆本仓库
git clone https://github.com/your-username/LearnForExam.git
cd LearnForExam

# 2. 安装依赖 (推荐使用 bun，也可使用 npm / pnpm)
bun install

# 3. 启动桌面端开发调试窗口 (Tauri + React)
bun run tauri dev

# 4. 或者启动纯浏览器端开发模式
bun run dev
```

### 构建打包 (macOS .dmg / .app)

```bash
bun run tauri build
```
打包产物位于 `src-tauri/target/release/bundle/dmg/` 目录下。

---

## 📸 应用预览界面

| 考点通关地图与闪卡 | 客观题自测与原笔记左右分栏 |
| :---: | :---: |
| *结构化模块与 3D 翻转公式闪卡* | *单选/挖空自测与右侧 Markdown 金色出处高亮* |

---

## 🌐 English Summary

**LearnForExam** is a lightweight, privacy-first desktop application built with **Tauri 2.0 (Rust), React 19, TailwindCSS, and KaTeX**. It transforms disorganized, messy lecture notes into structured **Topic Clusters**, **LaTeX-rendered Flashcards**, and **Objective Self-Assessment Quizzes** tailored specifically for cramming and final exam review. It features side-by-side note referencing with bidirectional quote anchoring, an error notebook, and zero-cloud local storage.

---

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。欢迎提交 Issue 或 Pull Request！

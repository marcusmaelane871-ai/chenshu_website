# 陈树个人网站 — AI 聊天 Agent 主页

基于 Next.js 16 的个人网站，首页以 AI 聊天 Agent 为核心展示，用户通过对话了解主人的技能、项目和专业能力。

## 项目结构

```
blog/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页 — 全屏聊天界面
│   │   ├── layout.tsx            # 根布局 (Nav + Footer)
│   │   ├── globals.css           # 全局样式 + thinking-dot 动画
│   │   ├── api/chat/route.ts     # 聊天 API — RAG Pipeline + LLM 流式输出
│   │   ├── projects/page.tsx     # 项目详情页
│   │   ├── skills/page.tsx       # 技能详情页
│   │   └── contact/page.tsx      # 联系页
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-widget.tsx   # 聊天主组件 (全屏, SSE 流式, 多轮对话)
│   │   │   └── chat-message.tsx  # 消息气泡 (AI头像 + Markdown渲染)
│   │   ├── nav.tsx               # 顶部导航
│   │   └── footer.tsx            # 底部
│   ├── lib/
│   │   ├── wiki/
│   │   │   ├── types.ts          # 类型定义 (WikiPage, SearchResult, FusedSearchResult 等)
│   │   │   ├── search.ts         # Token 关键词检索
│   │   │   ├── vector-search.ts  # 向量检索 (DashScope embedding) + RRF 融合
│   │   │   ├── graph.ts          # 图谱扩展 (邻接关系 + 相关性评分)
│   │   │   ├── context-budget.ts # 上下文预算分配 (5% index, 50% pages, 15% reserve)
│   │   │   └── greeting.ts       # 问候检测
│   │   └── data.ts               # 项目/技能静态数据
│   └── data/
│       └── wiki-index.json       # 预构建的 Wiki 索引 (页面 + 图谱 + 全文)
├── data/
│   └── wiki-embeddings.json      # 预构建的向量数据 (DashScope text-embedding-v4)
├── scripts/
│   ├── build-wiki-index.ts       # 从 self_knowledgev1/wiki/ 生成 wiki-index.json
│   └── embed-wiki.mjs            # 增量生成 wiki-embeddings.json
├── self_knowledgev1/             # 知识库源文件 (gitignore, 不提交到 Vercel)
│   ├── wiki/                     # LLM 生成的 Wiki 页面 (构建索引的来源)
│   └── raw/                      # 原始文件 (PDF, 代码等, 不参与检索)
└── .env.local                    # API Keys (不提交)
```

## 聊天 RAG Pipeline

用户发问 → Token 检索 + 向量检索 → RRF 融合排序 → 图谱扩展 → 上下文组装 → LLM 流式回答

```
用户提问
  │
  ├─→ Token Search (关键词匹配, 加权评分)
  │
  ├─→ Vector Search (DashScope text-embedding-v4, 余弦相似度)
  │
  └─→ RRF Fusion (K=60, 融合两路排序)
        │
        └─→ Graph Expansion (邻接扩展 + 相关性评分, 取 top 相关节点)
              │
              └─→ Context Assembly (预算控制: 最多25页, index 5% + pages 50% + reserve 15%)
                    │
                    └─→ DeepSeek V4 Flash (流式输出, 多轮对话)
```

所有步骤通过 LangSmith `traceable` 追踪，一条会话集中在同一 trace 下，支持 thread_id 分组。

## 环境变量

在 `.env.local` 中配置：

```env
DEEPSEEK_API_KEY=sk-xxx          # LLM 调用 (必需)
DASHSCOPE_API_KEY=sk-xxx         # 向量 embedding (构建时 + 运行时查询)
LANGSMITH_API_KEY=lsv2_xxx      # LangSmith 追踪 (可选)
LANGSMITH_PROJECT=chenshu-blog   # LangSmith 项目名 (可选)
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

首次开发时，`src/data/wiki-index.json` 和 `data/wiki-embeddings.json` 已在 git 仓库中，无需额外构建步骤。

## 更新知识库

当 `self_knowledgev1/wiki/` 下新增或修改了 Markdown 文件后：

```bash
# 方式一：完整构建（推荐）
npm run build

# 方式二：分步执行
npx tsx scripts/build-wiki-index.ts   # 1. 重建 wiki-index.json (全量)
node scripts/embed-wiki.mjs           # 2. 增量更新 wiki-embeddings.json (只处理新增/变更页面)
```

构建完成后，提交更新后的数据文件：

```bash
git add src/data/wiki-index.json data/wiki-embeddings.json
git commit -m "update: wiki data"
git push
```

## Vercel 部署

Vercel 构建流程：`npx tsx scripts/build-wiki-index.ts && node scripts/embed-wiki.mjs && next build`

- `self_knowledgev1/` 不在 git 仓库中 → `build-wiki-index.ts` 优雅跳过
- Vercel 上通常不配 `DASHSCOPE_API_KEY` → `embed-wiki.mjs` 优雅跳过
- 直接使用 git 中已有的 `wiki-index.json` + `wiki-embeddings.json` 运行 `next build`

**所以每次更新知识库内容，必须本地先跑一次构建，把数据文件提交后再推到 Vercel。**

## 知识库说明

Wiki 页面来自 `self_knowledgev1/wiki/`，由 llm_wiki 项目通过两阶段 LLM 流程（分析 → 生成）从原始文件生成。页面类型：

| 类型 | 说明 | 参与检索 |
|------|------|----------|
| entity | 实体页 (人物、产品等) | 是 |
| concept | 概念页 (方法论、架构等) | 是 |
| source | 源文件摘要 (LLM 提炼，非原始代码) | 是 |
| synthesis | 综合页 | 是 |
| query | 常见问题页 | 是 |
| index/overview/log/purpose/schema | 结构性页面 | 否 (EXCLUDED_IDS) |

原始文件 (`self_knowledgev1/raw/`) 不参与检索，仅作为 LLM 生成 wiki 摘要的输入。

// ============================================================
// 全站数据中心 — 所有内容集中管理
// ============================================================

// ---------- 导航 ----------
export const navItems = [
  { label: "首页", href: "/" },
  { label: "项目", href: "/projects" },
  { label: "技能", href: "/skills" },
  { label: "联系", href: "/contact" },
];

// ---------- 个人信息 ----------
export const profile = {
  name: "陈树",
  title: "AI系统设计型产品经理",
  tagline: "设计并落地AI系统，不是调API",
  bio: "从0到1落地3个不同类型的AI系统：即时探需系统（客户画像驱动差异化回复）、售后插件化架构（MCP多能力编排）、跟进策略推荐系统（可控决策引擎）。擅长将业务建模→Agent架构设计→A/B验证构建为可迭代的闭环，而非一次性交付。",
  email: "980499184@qq.com",
  phone: "(+86) 17376580885",
};

// ---------- 信任信号 ----------
export const stats = [
  { value: "20万+", label: "客户数据管理规模" },
  { value: "200人", label: "服务销售团队" },
  { value: "3个", label: "AI系统从0到1落地" },
  { value: "10-15%", label: "销售业绩提升" },
];

// ---------- 三大核心能力（含证据锚点） ----------
export const capabilities = [
  {
    title: "AI即时探需系统设计",
    description:
      "客户画像驱动的即时销售回复系统。用户画像Agent构建客户分层+偏好画像，AI销售回复Agent按客户类型差异化探需，探需完成自动转人工。",
    evidence: [
      { label: "客户画像", value: "分层+偏好画像" },
      { label: "业绩提升", value: "10-15%" },
      { label: "转化率", value: "A→S提升100%" },
      { label: "培训周期", value: "缩短60%" },
    ],
    anchor: "项目一",
  },
  {
    title: "插件化服务架构设计",
    description:
      "基于MCP协议设计多能力插件化编排架构，将复杂服务流程（跑腿/接送机/机票）拆解为独立插件，实现自动化编排与动态调度，大幅降低人工协调成本。",
    evidence: [
      { label: "插件架构", value: "MCP多能力编排" },
      { label: "团队降本", value: "17→10人" },
      { label: "响应速度", value: "5-10分钟→1分钟" },
      { label: "满意度", value: "50%→80%" },
    ],
    anchor: "项目二",
  },
  {
    title: "AI跟进策略推荐系统设计",
    description:
      "非即时的销售跟进策略推荐系统。两阶段混合架构：LLM负责意图识别与内容生成，Python路由层把控关键决策。通过18宫格矩阵、安全约束、多维评测体系，确保核心逻辑100%可控。",
    evidence: [
      { label: "决策架构", value: "LLM+Python路由层" },
      { label: "路由矩阵", value: "18宫格" },
      { label: "评测准确率", value: "90-95%" },
      { label: "销售采纳率", value: "30%→80%" },
    ],
    anchor: "项目三",
  },
];

// ---------- 项目（首页预览 + 详情页共用） ----------
export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  mainLine: string;
  role: string;
  sections: {
    heading: string;
    body: string;
    highlights?: string[];
  }[];
  results: { label: string; value: string }[];
  chart?: string;
  featured: boolean;
}

export const projects: Project[] = [
  {
    slug: "ai-instant-probing",
    title: "AI即时探需系统",
    subtitle: "客户画像驱动 → 差异化探需 → 转人工",
    mainLine: "用户画像Agent构建客户分层+偏好画像，AI销售回复Agent按客户类型差异化探需，只处理探需节点，完成后转人工",
    role: "AI产品经理 + Agent工程师",
    featured: false,
    sections: [
      {
        heading: "业务建模",
        body: "基于20万+历史聊天数据，深度访谈20+一线销售，构建完整的客户画像体系。客户画像包含两个维度：SABCD五级客户分层（基于消费能力与意向等级自动分级）+用户偏好画像（手机款式偏好、是否自用、购买用途等），形成精准的客户理解。将销冠经验沉淀为标准化销售SOP，嵌入Agent Prompt。",
        highlights: [
          "客户画像：SABCD分层 + 偏好画像（款式/用途等）",
          "关键词+意向语句自动分级",
          "销冠经验→标准化销售SOP",
        ],
      },
      {
        heading: "AI落地",
        body: "双Agent即时回复架构：用户画像Agent实时构建客户分层与偏好画像，AI销售回复Agent根据客户类型匹配差异化探需策略——单品配件客户侧重配件关联推荐、单品手机客户侧重场景化探需、多手机高价值客户侧重尊享体验与增值服务。系统只处理探需节点，探需完成或触发关键节点自动转人工销售。",
        highlights: [
          "双Agent架构：用户画像Agent + AI销售回复Agent",
          "三类客户差异化探需策略",
          "只做探需，完成/关键节点→转人工",
        ],
      },
      {
        heading: "系统设计",
        body: "设计完整A/B测试框架与数据飞轮：分层抽样分析「成交 vs 流失」客户数据，归因分析结果反哺Prompt优化。形成「数据采集→洞察分析→模型迭代→A/B验证」的完整闭环。转人工边界机制：探需完成信号检测+关键节点触发规则，确保AI在合适时机退出。",
        highlights: [
          "A/B测试框架（实验组/对照组各300样本）",
          "数据飞轮：采集→洞察→Prompt→验证",
          "转人工边界机制：探需完成检测+关键节点触发",
        ],
      },
    ],
    results: [
      { label: "销售业绩", value: "提升10-15%" },
      { label: "A→S转化率", value: "提升100%（20% vs 10%）" },
      { label: "新人培训周期", value: "缩短约60%" },
      { label: "服务规模", value: "200人团队 / 20万+客户" },
    ],
    chart: `flowchart TD
    A["客户消息"] --> B["用户画像Agent<br/>SABCD分层 + 偏好画像（款式/用途等）"]
    B --> C["AI销售回复Agent · 差异化探需"]
    C --> D1["单品配件客户 → 配件关联推荐"]
    C --> D2["单品手机客户 → 场景化探需"]
    C --> D3["多手机高价值客户 → 尊享体验+增值服务"]
    D1 --> E["探需完成/关键节点 → 转人工销售"]
    D2 --> E
    D3 --> E`,
  },
  {
    slug: "plugin-service-architecture",
    title: "基于MCP的插件化服务架构",
    subtitle: "从服务拆解 → MCP插件化 → 自动化编排",
    mainLine: "将复杂人工服务流程重构为可编排的AI插件体系",
    role: "AI产品经理 + 架构设计",
    featured: false,
    sections: [
      {
        heading: "业务建模",
        body: "深入客服场景，拆解跑腿、接送机、机票预订等复杂服务流程，定义自动化边界与权益引擎。根据客户等级智能匹配对应服务权益，确保高净值客户的差异化体验。质检Agent自动检查AI客服回答准确度，持续保障服务质量。",
        highlights: [
          "复杂服务流程拆解与自动化边界定义",
          "分层权益引擎：按客户等级匹配服务",
          "质检Agent：自动保障回答质量",
        ],
      },
      {
        heading: "AI落地",
        body: "自研MCP架构，将跑腿、接送机、机票查询分别封装为独立MCP插件，实现多能力解耦与动态编排。集成RAG系统与长文本压缩，确保复杂上下文下的响应质量。多模型策略（GPT、Gemini等）按场景智能调度。",
        highlights: [
          "自研MCP插件：跑腿/接送机/机票查询",
          "多能力解耦+动态编排",
          "RAG+长文本压缩上下文优化",
        ],
      },
      {
        heading: "系统设计",
        body: "设计MCP多能力提供者架构，各插件独立开发、独立部署、独立迭代。上下文工程优化（RAG检索增强 + 长文本压缩）确保复杂场景下LLM输入质量。质检Agent形成服务质量监控闭环，保障AI客服回答准确性。",
        highlights: [
          "MCP插件独立开发/部署/迭代",
          "上下文工程：RAG+压缩保证输入质量",
          "质检Agent服务质量监控闭环",
        ],
      },
    ],
    results: [
      { label: "团队规模", value: "17→10人" },
      { label: "年省成本", value: "约40万+" },
      { label: "响应速度", value: "5-10分钟→1分钟" },
      { label: "客户满意度", value: "50%→80%" },
    ],
    chart: `flowchart TD
    A["客户服务请求"] --> B["意图识别 · 服务类型判定"]
    B --> C["权益引擎 · 客户等级匹配"]
    C --> D["MCP插件编排层"]
    D --> E1["跑腿MCP"]
    D --> E2["接送机MCP"]
    D --> E3["机票查询MCP"]
    E1 --> F["AI客服响应"]
    E2 --> F
    E3 --> F
    F --> G["质检Agent · 质量监控"]`,
  },
  {
    slug: "ai-followup-strategy",
    title: "AI跟进策略推荐系统",
    subtitle: "非即时跟进建议 → 三维评分 → 18宫格路由 → 评测闭环",
    mainLine:
      "非即时的销售跟进策略推荐系统，两阶段混合架构：LLM负责生成、Python路由层把控决策，确保核心逻辑100%可控",
    role: "AI产品经理 + Agent工程师 + 全栈开发",
    featured: true,
    sections: [
      {
        heading: "业务建模",
        body: "非即时的销售跟进策略推荐系统——为销售提供下一步跟进建议，而非直接回复客户。设计V/T/O三维客户评分模型：消费能力（Value）、购机意向（Tendency）、下单意向（Order），量化客户价值等级。定义S1-S6六种会话状态与C1-C3三种销售阶段的18宫格路由决策矩阵，每种组合对应差异化跟进策略。设计「七剑」销售策略体系（探需/增信/逼单/塑品/种草/挖需），每策略含独立Prompt工程设计。",
        highlights: [
          "V/T/O三维评分模型量化客户价值",
          "18宫格路由决策矩阵（S1-S6 × C1-C3）",
          "七剑策略体系：探需/增信/逼单/塑品/种草/挖需",
        ],
      },
      {
        heading: "AI落地",
        body: "两阶段混合架构：Stage 1 LLM判别会话状态与销售阶段，Stage 2 LLM生成跟进话术序列，中间由Python路由层把控关键决策，确保核心逻辑100%可控。多层级安全策略：低分客户自动过滤避免无效骚扰、高分才开放逼单策略防止过度推销、库存不足自动降级转探需。",
        highlights: [
          "两阶段LLM架构：意图识别→任务生成",
          "Python路由层：关键决策100%可控",
          "多层级安全策略：过滤+安全锁+降级",
        ],
      },
      {
        heading: "系统设计",
        body: "后处理管线：任务互斥去重、过量塑品自动转增信、触达时段智能分配。自研评测体系：评测师人工多维评分（6维度：逻辑正确性/业务贴合度/内容质量/多轮一致性/共情度/功能完整度）+能力树自动化评测（JSON标准答案对比）。触达闭环：短期序列（3-5次密集触达）→长期培育池（SCRM季度触达），覆盖客户全生命周期。",
        highlights: [
          "后处理管线：去重+平衡+时段分配",
          "评测体系：人工6维评分+自动化能力树评测",
          "触达闭环：短期序列→长期培育池",
        ],
      },
    ],
    results: [
      { label: "评测准确率", value: "90-95%" },
      { label: "销售采纳率", value: "30%→80%" },
      { label: "评测维度", value: "人工6维+自动化" },
      { label: "触达策略", value: "短期序列+长期培育" },
    ],
    chart: `flowchart TD
    A["用户输入"] --> B["Stage 1 · LLM意图识别<br/>判别会话状态+销售阶段"]
    B --> C["Python路由层 · 控制决策<br/>18宫格矩阵匹配策略"]
    C --> D["策略模块 · 七剑体系<br/>探需/增信/逼单/塑品/种草/挖需"]
    D --> E["Stage 2 · LLM任务生成<br/>输出个性化跟进话术"]
    E --> F["安全策略过滤<br/>低分过滤/逼单安全锁/库存降级"]
    F --> G["后处理管线<br/>去重/平衡/时段分配"]
    G --> H["输出任务序列"]`,
  },
];

// ---------- 技能分类 ----------
export const skillCategories = [
  {
    title: "AI / Agent能力",
    skills: [
      { name: "LangGraph 工作流编排", level: "独立设计多节点Agent架构" },
      { name: "Prompt Engineering", level: "策略级Prompt分层设计" },
      { name: "RAG 系统设计", level: "检索增强+上下文压缩优化" },
      { name: "MCP 协议 / 插件化架构", level: "多插件解耦+动态编排" },
      { name: "数据飞轮设计", level: "采集→洞察→Prompt→A/B验证闭环" },
      { name: "LLM 评测体系设计", level: "人工多维评分+自动化能力树评测" },
    ],
  },
  {
    title: "产品能力",
    skills: [
      { name: "AI产品0→1全流程", level: "需求挖掘→设计→开发→上线→迭代" },
      { name: "A/B 测试框架", level: "实验设计+统计分析+结论驱动迭代" },
      { name: "用户研究", level: "深度访谈+行为分析+痛点挖掘" },
      { name: "竞品调研", level: "深度拆解+架构分析+设计决策落地" },
      { name: "数据驱动决策", level: "转化漏斗+归因分析+ROI量化" },
      { name: "Roadmap 规划", level: "优先级排序+里程碑管理+资源协调" },
    ],
  },
  {
    title: "技术实现",
    skills: [
      { name: "Python", level: "数据处理+Agent开发+API服务" },
      { name: "LangChain / LangGraph", level: "Agent工作流开发" },
      { name: "FastAPI", level: "API服务构建+全栈产品化" },
      { name: "Vue 3 / TypeScript", level: "管理后台Demo独立开发" },
      { name: "LLM 多模型集成", level: "GPT / Gemini / GLM / DeepSeek" },
      { name: "Git / Docker", level: "版本管理+容器化部署" },
    ],
  },
];

// ---------- GitHub 项目 ----------
export const githubRepos = [
  {
    name: "crypto_trader",
    url: "https://github.com/phoenix1028/crypto_trader",
    description: "AI驱动的加密货币量化交易系统",
    tech: "Python · LangChain Agent · DeepSeek · Binance API",
  },
  {
    name: "dada-mcp-server",
    url: "https://github.com/phoenix1028/dada-mcp-server",
    description: "MCP Server — 达达跑腿服务插件化实现",
    tech: "Python · MCP协议 · 4工具(创建/取消/查询/原因)",
  },
];

// ---------- 社交媒体 ----------
export const social = {
  github: "https://github.com/phoenix1028",
};

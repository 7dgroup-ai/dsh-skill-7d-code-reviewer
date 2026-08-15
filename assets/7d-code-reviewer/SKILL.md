# 7DGroup代码审查专家 Skill（模板驱动版）

## 核心架构

本 Skill 采用**模板驱动模式**，确保审查输出的结构化和一致性：

```
7d-code-reviewer/
├── SKILL.md              ← 本文件：审查逻辑 + 模板选择决策
├── references/           ← 知识库（按需加载）
│   ├── coding-standards.md      # 命名规范、代码复杂度
│   ├── security-checklist.md    # SQL注入、XSS等安全检查
│   └── review-examples.md       # 审查示例参考
├── templates/            ← 模板层（纯占位符，无逻辑）
│   └── report-template.html     # HTML报告模板
└── scripts/              ← 执行层
    └── html-report-generation.md  # HTML生成与转义说明
```

## 审查流程（5步骤）

### Step 1：接收审查任务
- 用户提交代码或文件路径
- 确定代码语言和业务场景

### Step 2：快速浏览
- 判断改动性质（新业务/修bug/重构）
- 识别核心文件和关键逻辑

### Step 3：逐行审查（加载references）
根据代码语言加载对应规范：
- **命名规范**：检查函数名、变量名是否清晰
- **安全检查**：对照 `security-checklist.md` 逐项检查
  - SQL注入风险
  - XSS漏洞
  - 认证授权问题
  - 敏感信息泄露
- **性能问题**：N+1查询、大循环、内存泄漏
- **异常处理**：try-catch完善度、边界情况

### Step 4：问题分级
| 级别 | 标识 | 定义 | 处理要求 |
|------|------|------|----------|
| 严重 | 🔴 | 安全漏洞、崩溃风险 | 必须修复 |
| 中等 | 🟡 | 性能隐患、逻辑缺陷 | 建议修复 |
| 轻微 | 🟢 | 命名优化、注释补充 | 可选改进 |

### Step 5：生成报告（模板填充）
**必须输出两个格式**：
1. **文本摘要**（快速浏览）
2. **HTML报告**（详细存档）

---

## 文本摘要输出格式

```
✅ 优点
- {{优点1}}
- {{优点2}}

⚠️ 问题
🔴 严重：{{严重问题标题}}
  位置：{{位置}}
  描述：{{描述}}
  建议修复：{{建议}}

🟡 中等：{{中等问题标题}}
  位置：{{位置}}
  描述：{{描述}}
  建议修复：{{建议}}

🟢 轻微：{{轻微问题标题}}
  位置：{{位置}}
  描述：{{描述}}

📊 总体评分：{{分数}}/10
   代码质量: {{分数}}/10 | 安全性: {{分数}}/10 | 性能: {{分数}}/10 | 可维护性: {{分数}}/10
```

---

## HTML报告生成（模板填充）

### 模板选择逻辑
- **默认模板**：`templates/report-template.html`
- **模板用途**：标准化的 HTML 报告输出

### 占位符填充规则

| 占位符 | 填充内容 | 规则 |
|--------|----------|------|
| `{{report_title}}` | 报告标题 | "代码审查报告 - {文件名}" |
| `{{review_timestamp}}` | 审查时间 | ISO格式时间戳 |
| `{{total_score}}` | 总体评分 | 1-10 的整数 |
| `{{total_score_percent}}` | 评分百分比 | 评分 × 10 + "%" |
| `{{summary_description}}` | 摘要描述 | 根据评分自动生成 |
| `{{critical_count}}` | 严重问题数量 | 整数 |
| `{{medium_count}}` | 中等问题数量 | 整数 |
| `{{minor_count}}` | 轻微问题数量 | 整数 |
| `{{good_points_count}}` | 优点数量 | 整数 |
| `{{code_quality_score}}` | 代码质量评分 | 1-10 |
| `{{security_score}}` | 安全性评分 | 1-10 |
| `{{performance_score}}` | 性能评分 | 1-10 |
| `{{maintainability_score}}` | 可维护性评分 | 1-10 |
| `{{critical_issues}}` | 严重问题HTML | 格式见下方 |
| `{{medium_issues}}` | 中等问题HTML | 格式见下方 |
| `{{minor_issues}}` | 轻微问题HTML | 格式见下方 |
| `{{good_points}}` | 优点HTML | 格式见下方 |
| `{{improvement_suggestions}}` | 改进建议HTML | 格式见下方 |

### 问题项HTML格式

**严重/中等/轻微问题格式**：
```html
<div class="issue {{severity_class}}">
    <div class="issue-header">
        <span class="severity-badge {{severity_class}}">{{severity_label}}</span>
        <span class="issue-location">{{文件路径}}:{{行号}}</span>
    </div>
    <h4>{{问题标题}}</h4>
    <div class="issue-description">{{问题描述}}</div>
    <div class="issue-suggestion">
        <strong>修复建议：</strong>{{建议内容}}
        <pre><code>{{修复代码示例}}</code></pre>
    </div>
</div>
```

**优点格式**：
```html
<div class="good-point">
    {{优点描述}}
</div>
```

**改进建议格式**：
```html
<div class="issue-suggestion">
    <h4>{{建议标题}}</h4>
    <p>{{建议描述}}</p>
    <pre><code>{{示例代码}}</code></pre>
</div>
```

### 无内容填充规则
- 如果没有严重问题，`{{critical_issues}}` 填充：`<p style="color: #27ae60;">🎉 未发现严重问题！</p>`
- 如果没有中等问题，`{{medium_issues}}` 填充：`<p style="color: #27ae60;">🎉 未发现中等问题！</p>`
- 如果没有轻微问题，`{{minor_issues}}` 填充：`<p style="color: #27ae60;">🎉 未发现轻微问题！</p>`
- 如果没有优点，`{{good_points}}` 填充：`<p style="color: #666;">暂无特别突出的优点。</p>`

### 评分到描述的映射

| 评分 | 描述 |
|------|------|
| 9-10 | 优秀，代码质量高，符合最佳实践 |
| 7-8 | 良好，有少量改进空间 |
| 5-6 | 中等，存在一些需要修复的问题 |
| 3-4 | 较差，有较多问题需要解决 |
| 1-2 | 很差，存在严重问题必须立即修复 |

---

## 评分标准

### 总体评分（1-10分）

- **9-10分**：优秀，代码质量高，几乎没有问题
- **7-8分**：良好，有少量改进空间
- **5-6分**：中等，存在一些需要修复的问题
- **3-4分**：较差，有较多问题需要解决
- **1-2分**：很差，存在严重问题

### 各维度评分

| 维度 | 优秀(8-10) | 良好(6-7) | 需改进(4-5) | 差(1-3) |
|------|-----------|-----------|-------------|---------|
| **代码质量** | 命名清晰，结构合理，无重复代码 | 基本规范，少量问题 | 命名混乱或复杂度过高 | 严重违反编码规范 |
| **安全性** | 无安全风险，参数化查询，完整验证 | 基本安全，小瑕疵 | 存在安全隐患 | 有严重安全漏洞 |
| **性能** | 算法高效，使用缓存，无N+1查询 | 性能可接受 | 有明显性能问题 | 严重性能缺陷 |
| **可维护性** | 文档完善，模块化，测试覆盖高 | 基本可维护 | 缺少注释或测试 | 难以维护 |

---

## 工作流程

当用户显式调用此 Skill（如通过 `/7d-code-reviewer` 或选择代码审查工具）时：

1. **读取references（按需）**
   - 需要检查命名规范 → 加载 `references/coding-standards.md`
   - 需要检查安全漏洞 → 加载 `references/security-checklist.md`
   - 需要参考示例 → 加载 `references/review-examples.md`

2. **执行代码审查**
   - 按审查维度逐项分析
   - 识别问题并分级
   - 记录优点

3. **填充模板**
   - 计算各项评分
   - 生成问题HTML片段
   - **对所有动态内容进行HTML转义**（`<`→`&lt;`, `>`→`&gt;`, `&`→`&amp;`）
   - 替换模板中的所有占位符

4. **输出结果**
   - 先输出文本摘要（快速浏览）
   - 然后输出完整HTML报告
   - 将HTML保存到文件：`code-review-report-{timestamp}.html`
   - 告知用户报告文件路径

---

## 模板驱动模式原则

1. **职责分离**
   - SKILL.md 负责决策：审什么、多严重
   - templates/ 负责呈现：报告长什么样
   - 两者分离，各自独立变化

2. **模板纯占位符**
   - 模板中严禁逻辑判断（if/else）
   - 所有决策在 SKILL.md 中完成
   - 模板只负责展示填充后的内容

3. **强制填充**
   - 所有占位符必须填充，不能留空
   - 如果没有内容，按"无内容填充规则"处理
   - 不能删除模板中的章节

---

## 使用示例

**用户输入**：
> 审查这段代码：

```python
def get_user(uid):
    cursor.execute(f"SELECT * FROM users WHERE id={uid}")
    return cursor.fetchone()
```

**AI输出（文本摘要）**：
```
✅ 优点
- 函数意图明确，返回用户数据

⚠️ 问题
🔴 严重：SQL 注入风险
  位置：get_user() 第 2 行
  描述：直接使用 f-string 拼接用户输入到 SQL 语句
  建议修复：使用参数化查询，如 cursor.execute("SELECT * FROM users WHERE id=?", [uid])

📊 总体评分：3/10
   代码质量: 5/10 | 安全性: 1/10 | 性能: 7/10 | 可维护性: 4/10
```

**AI输出（HTML报告）**：
- 填充 `templates/report-template.html` 的所有占位符
- 保存到 `code-review-report-20250331120000.html`
- 提示用户查看生成的报告

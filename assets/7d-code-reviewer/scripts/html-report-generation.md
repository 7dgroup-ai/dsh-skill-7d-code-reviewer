# HTML 报告生成说明

## 模板填充流程

本 Skill 使用模板驱动模式生成 HTML 报告。AI 直接填充模板，无需外部脚本执行。

### 填充流程

1. 读取 `templates/report-template.html`
2. 根据审查结果计算各占位符值
3. 对所有动态内容进行 **HTML 转义**
4. 替换所有占位符
5. 保存到 `code-review-report-{timestamp}.html`

### HTML 转义要求

**必须对以下内容进行 HTML 转义**，防止 XSS 和结构损坏：

| 原始字符 | 转义后 |
|---------|--------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

### 转义示例

```python
def escape_html(text: str) -> str:
    """对文本进行 HTML 转义"""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )

# 示例：问题描述可能包含代码，需要转义
issue_description = "使用了 <script>alert('xss')</script>"
escaped = escape_html(issue_description)
# 结果: "使用了 &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
```

### 代码示例的特殊处理

代码示例放在 `<pre><code>` 标签内，**仍需转义**：

```html
<div class="issue-suggestion">
    <strong>修复建议：</strong>使用参数化查询
    <pre><code>{{escaped_code_example}}</code></pre>
</div>
```

**注意**：即使代码示例原本就是代码，也可能包含 HTML 字符（如泛型 `<T>`、比较运算符等），必须转义。

### 占位符值处理

所有填入模板的值都必须经过转义：

- `{{report_title}}` - 文件名中的特殊字符需转义
- `{{summary_description}}` - 描述文本需转义
- `{{critical_issues}}` 等 - 生成的 HTML 片段内部已转义
- 代码示例 - 必须转义

### 安全提示

不转义的后果：
1. 被审查代码中的 `<script>` 可能在报告打开时执行
2. `</div>` 等标签可能破坏报告结构
3. HTML 实体（如 `&nbsp;`）可能被错误解析

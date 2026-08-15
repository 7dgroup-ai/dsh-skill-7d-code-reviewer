---
name: security-checklist
description: 安全审查检查清单 - SQL注入、XSS、认证授权等安全风险识别
type: reference
---

# 安全检查清单

## 1. SQL 注入风险

### 1.1 危险模式
- [ ] 字符串拼接 SQL 语句
- [ ] 用户输入直接嵌入查询
- [ ] 动态构建 WHERE 条件

### 1.2 安全示例
```python
# ❌ SQL 注入风险 - 危险！
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)

# ✅ 使用参数化查询
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))
```

### 1.3 ORM 安全
```python
# ❌ 危险：使用 format 或 f-string
User.objects.raw(f"SELECT * FROM users WHERE name = '{name}'")

# ✅ 安全的 ORM 使用
User.objects.filter(name=name)  # Django 自动转义
User.objects.raw("SELECT * FROM users WHERE name = %s", [name])
```

## 2. XSS（跨站脚本攻击）

### 2.1 危险模式
- [ ] 用户输入直接输出到 HTML
- [ ] 使用 `innerHTML` 设置用户内容
- [ ] URL 参数未过滤直接显示

### 2.2 安全示例
```javascript
// ❌ XSS 风险 - 危险！
element.innerHTML = userInput;

// ✅ 安全的 DOM 操作
element.textContent = userInput;
// 或使用转义库
const safeHtml = DOMPurify.sanitize(userInput);
element.innerHTML = safeHtml;
```

### 2.3 模板引擎安全
```html
<!-- ❌ 危险的模板语法（不转义） -->
<p>{{{ user_content }}}</p>  <!-- Handlebars 三括号不转义 -->

<!-- ✅ 安全的模板语法（自动转义） -->
<p>{{ user_content }}</p>    <!-- 自动 HTML 实体编码 -->
```

## 3. 认证与授权

### 3.1 身份验证
- [ ] 密码是否安全存储（bcrypt/Argon2）
- [ ] 是否使用 HTTPS 传输凭证
- [ ] 登录失败是否有速率限制
- [ ] Token 是否有过期时间

### 3.2 权限控制
- [ ] 敏感操作是否验证权限
- [ ] 水平越权检查（用户 A 能否访问用户 B 的数据）
- [ ] 垂直越权检查（普通用户能否访问管理员功能）

```python
# ❌ 缺少权限检查
def delete_user(user_id):
    User.objects.get(id=user_id).delete()

# ✅ 权限验证
def delete_user(request, user_id):
    if not request.user.is_staff:
        raise PermissionDenied("需要管理员权限")
    if request.user.id == int(user_id):
        raise ValidationError("不能删除自己")
    User.objects.get(id=user_id).delete()
```

## 4. 敏感信息泄露

### 4.1 危险模式
- [ ] 日志中打印密码、Token
- [ ] 错误信息暴露内部路径或 SQL
- [ ] 配置文件包含密钥硬编码
- [ ] 响应中返回完整对象（包含敏感字段）

### 4.2 安全示例
```python
# ❌ 敏感信息泄露
logger.info(f"User login: {username}, password: {password}")

# ✅ 安全的日志记录
logger.info(f"User login attempt: {username}")

# ❌ 错误信息暴露过多信息
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except Exception as e:
        return {"error": str(e)}  # 可能暴露 SQL 或路径

# ✅ 安全的错误处理
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"error": "用户不存在"}
    except Exception:
        logger.exception("获取用户失败")
        return {"error": "系统错误"}
```

## 5. 路径遍历攻击

### 5.1 危险模式
- [ ] 使用用户输入拼接文件路径
- [ ] 未验证文件是否在允许目录内

### 5.2 安全示例
```python
import os
from pathlib import Path

# ❌ 路径遍历风险
BASE_DIR = "/app/files/"
file_path = BASE_DIR + user_input  # user_input = "../../../etc/passwd"

# ✅ 安全的路径处理
def safe_read_file(base_dir: str, filename: str) -> str:
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()

    # 确保目标路径在 base_dir 内（使用 relative_to 正确判断）
    try:
        target.relative_to(base)
    except ValueError:
        raise ValueError("非法的文件路径")

    return target.read_text()
```

## 6. 反序列化安全

### 6.1 危险模式
- [ ] 使用 `pickle`/`yaml.load` 反序列化不可信数据
- [ ] 未验证的 JSON Schema

### 6.2 安全示例
```python
import json

# ❌ 危险的反序列化
import pickle
data = pickle.loads(user_input)  # 可执行任意代码

# ❌ YAML 危险加载
import yaml
data = yaml.load(user_input, Loader=yaml.Loader)

# ✅ 安全的 JSON 处理
data = json.loads(user_input)

# ✅ 安全的 YAML 处理
data = yaml.safe_load(user_input)
```

## 7. 命令注入

### 7.1 危险模式
- [ ] 用户输入直接拼接到系统命令
- [ ] 使用 `eval()`/`exec()` 执行用户输入

### 7.2 安全示例
```python
import os
import subprocess

# ❌ 命令注入风险 - 危险！
result = os.system(f"ping {user_input}")  # user_input = "; rm -rf /"

# ✅ 安全的命令执行
result = subprocess.run(
    ["ping", "-c", "4", user_input],
    capture_output=True,
    text=True
)
```

## 8. SSRF（服务器端请求伪造）

### 8.1 危险模式
- [ ] 直接使用用户输入的 URL 发起请求
- [ ] 未限制内网地址访问

### 8.2 安全示例
```python
import requests
import ipaddress
import socket
from urllib.parse import urlparse

# ❌ SSRF 风险
response = requests.get(user_url)  # user_url = "http://localhost:3306"

# ✅ 安全的请求处理
def safe_request(url: str) -> requests.Response:
    parsed = urlparse(url)

    # 禁止访问内网和回环地址
    def is_private_host(hostname: str) -> bool:
        """检查主机名是否为私网或回环地址"""
        try:
            ip = ipaddress.ip_address(hostname)
            return ip.is_private or ip.is_loopback
        except ValueError:
            # 如果是域名，解析后检查
            try:
                resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))
                return resolved_ip.is_private or resolved_ip.is_loopback
            except (socket.gaierror, ValueError):
                # 解析失败，保守起见视为不安全
                return True

    if is_private_host(parsed.hostname):
        raise ValueError(f"禁止访问内网地址: {parsed.hostname}")

    # 禁止访问敏感端口
    blocked_ports = {22, 23, 25, 3306, 5432, 6379, 9200}
    if parsed.port in blocked_ports:
        raise ValueError(f"禁止访问该端口: {parsed.port}")

    return requests.get(url, timeout=10)
```

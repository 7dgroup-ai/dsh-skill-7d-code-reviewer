---
name: coding-standards
description: 7DGroup代码规范 - 命名约定、风格指南和最佳实践
type: reference
---

# 编码规范参考

> 本规范按编程语言区分。审查时根据目标代码语言选择对应规范。

## 语言对照表

| 语言 | 类/结构体 | 方法/函数 | 变量 | 常量 | 私有成员 |
|------|----------|----------|------|------|----------|
| **Python** | PascalCase | snake_case | snake_case | SCREAMING_SNAKE_CASE | _snake_case |
| **JavaScript/TypeScript** | PascalCase | camelCase | camelCase | SCREAMING_SNAKE_CASE | _camelCase |
| **Java/C#** | PascalCase | camelCase | camelCase | SCREAMING_SNAKE_CASE | _camelCase |
| **Go** | PascalCase | PascalCase/camelCase | camelCase | camelCase | _camelCase |
| **Rust** | PascalCase | snake_case | snake_case | SCREAMING_SNAKE_CASE | _snake_case |

---

## Python 规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService`, `OrderRepository` |
| 方法名 | **snake_case** | `get_user_by_id()`, `calculate_total_price()` |
| 变量名 | **snake_case** | `user_list`, `is_active` |
| 常量名 | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| 私有属性 | _snake_case | `_private_var`, `_internal_state` |
| 布尔变量 | is/has/should + 名词 | `is_valid`, `has_permission` |

### 命名示例
```python
# ❌ 不好的命名
def getUserById(uid):
    return db.query(uid)

class userManager:
    def processData(self):
        userData = fetchData()

# ✅ 好的命名（Python 风格）
def get_user_by_id(user_id: int) -> User:
    """根据ID获取用户"""
    return database.query(user_id)

class UserManager:
    def process_data(self) -> None:
        user_data = fetch_data()
```

---

## JavaScript/TypeScript 规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService`, `OrderRepository` |
| 方法名 | **camelCase** | `getUserById()`, `calculateTotalPrice()` |
| 变量名 | **camelCase** | `userList`, `isActive` |
| 常量名 | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 私有属性 | #camelCase 或 _camelCase | `#privateVar`, `_internalState` |
| 布尔变量 | is/has/should + 名词 | `isValid`, `hasPermission` |

### 命名示例
```javascript
// ❌ 不好的命名
function get_user_by_id(uid) {
    return db.query(uid);
}

class user_manager {
    process_data() {
        let user_data = fetchData();
    }
}

// ✅ 好的命名（JS/TS 风格）
function getUserById(userId) {
    return database.query(userId);
}

class UserManager {
    processData() {
        const userData = fetchData();
    }
}
```

---

## 通用原则（所有语言）

### 1. 命名清晰性
- **清晰性**：名称应该清晰表达意图，避免缩写（除非是业界通用如 HTTP、URL）
- **一致性**：同一项目中使用统一的命名风格
- **可读性**：名称应该能被快速理解，不需要猜测

### 2. 函数命名

## 2. 代码复杂度

### 2.1 函数长度
- **单一职责**：一个函数只做一件事
- **长度限制**：函数体不超过 50 行（不含注释和空行）
- **参数数量**：不超过 4 个参数，超过时考虑使用对象封装

### 2.2 嵌套深度
- **最大嵌套**：不超过 3 层
- **提前返回**：使用卫语句减少嵌套

```python
# ❌ 嵌套过深
def process_order(order):
    if order:
        if order.is_valid:
            if order.items:
                for item in order.items:
                    if item.price > 0:
                        process_item(item)

# ✅ 提前返回
def process_order(order):
    if not order:
        return
    if not order.is_valid:
        return
    if not order.items:
        return

    for item in order.items:
        if item.price <= 0:
            continue
        process_item(item)
```

## 3. 重复代码

### 3.1 DRY 原则
- **提取函数**：相同逻辑提取为独立函数
- **抽象类/接口**：相似逻辑使用模板方法模式

### 3.2 重复代码识别
- 3 行以上相同代码
- 相似逻辑仅参数不同
- 复制粘贴的代码块

## 4. 注释规范

### 4.1 需要注释的场景
- 复杂算法或业务逻辑
- 非显而易见的代码
- 临时解决方案（标注 TODO/FIXME）

### 4.2 不需要注释的场景
- 代码本身能说明的
- 过时的注释
- 代码变更后未更新的注释

```python
# ❌ 冗余注释
# 增加 1
i += 1

# ✅ 有价值的注释
# 使用滑动窗口算法，时间复杂度 O(n)，空间复杂度 O(1)
def find_substring(s: str, pattern: str) -> int:
    # 实现细节...
```

## 5. 模块化设计

### 5.1 导入规范
- **顺序**：标准库 → 第三方库 → 本地模块
- **格式**：每组之间空一行
- **避免**：循环导入、通配符导入

```python
# ✅ 规范的导入
import os
import sys
from datetime import datetime

import requests
from sqlalchemy import create_engine

from myapp.models import User
from myapp.utils import helper
```

### 5.2 文件组织
- **单一职责**：一个文件一个主要类/功能
- **行数限制**：不超过 500 行

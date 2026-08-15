---
name: review-examples
description: 优秀代码审查示例 - 给AI审查参考的正面和反面案例
type: reference
---

# 审查示例参考

## 1. 命名规范审查示例

### 示例 1：函数命名改进

**审查前代码：**
```python
def calc(a, b):
    return a * b

def get_data(id):
    # 100 行代码...
    pass
```

**审查意见：**
```
⚠️ 命名问题

位置：calc() 第 1 行
严重程度：🟡 中等
问题描述：函数名过于简短，无法表达函数用途
建议：根据实际功能改为 calculate_area() 或 compute_total()

位置：get_data() 第 4 行
严重程度：🟡 中等
问题描述：函数名过于宽泛，且包含过多逻辑
建议：拆分为多个小函数，如 fetch_user_profile(), validate_user_data() 等
```

**修复后代码：**
```python
def calculate_rectangle_area(width: float, height: float) -> float:
    """计算矩形面积"""
    return width * height

def fetch_user_profile(user_id: int) -> dict:
    """获取用户档案"""
    # 精简的逻辑...
    pass

def validate_user_data(data: dict) -> bool:
    """验证用户数据有效性"""
    # 验证逻辑...
    pass
```

---

## 2. 安全性审查示例

### 示例 2：SQL 注入修复

**审查前代码：**
```python
def get_user(request):
    user_id = request.GET.get('id')
    cursor = connection.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
    return cursor.fetchone()
```

**审查意见：**

**🔴 严重安全漏洞：SQL 注入**

- **位置：** get_user() 第 4 行
- **严重程度：** 🔴 严重
- **风险描述：** 直接拼接用户输入到 SQL 语句，攻击者可执行任意 SQL 命令
- **攻击示例：** `id=1 OR 1=1; DROP TABLE users;--`
- **修复建议：** 使用参数化查询

**修复代码示例：**
```python
def get_user(request):
    user_id = request.GET.get('id')
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
    return cursor.fetchone()
```

---

## 3. 性能审查示例

### 示例 3：N+1 查询问题

**审查前代码：**
```python
def get_order_details():
    orders = Order.objects.all()
    result = []
    for order in orders:
        result.append({
            'order_id': order.id,
            'user_name': order.user.name,  # 每次循环都查数据库
            'items': [item.name for item in order.items.all()]  # 又触发一次查询
        })
    return result
```

**审查意见：**

**🟡 性能问题：N+1 查询**

- **位置：** get_order_details() 第 6-7 行
- **严重程度：** 🟡 中等
- **问题描述：** 循环中访问关联对象，导致每订单额外 2 次查询
- **影响：** 假设 100 个订单，将产生 1 + 100*2 = 201 次查询

**修复建议：** 使用 select_related 和 prefetch_related 预加载

```python
def get_order_details():
    orders = Order.objects.select_related('user').prefetch_related('items').all()
    result = []
    for order in orders:
        result.append({
            'order_id': order.id,
            'user_name': order.user.name,  # 已预加载，无额外查询
            'items': [item.name for item in order.items.all()]  # 已预加载
        })
    return result
# 总查询次数：固定 2 次（无论订单数量）
```

---

## 4. 异常处理审查示例

### 示例 4：完善异常处理

**审查前代码：**
```python
def process_payment(order_id, amount):
    order = Order.objects.get(id=order_id)
    result = payment_gateway.charge(order.user.card_token, amount)
    order.status = 'paid'
    order.save()
    return result
```

**审查意见：**

**🟡 异常处理不完善**

- **位置：** process_payment() 全函数
- **严重程度：** 🟡 中等

**问题列表：**
1. 第 2 行：Order.DoesNotExist 未捕获
2. 第 3 行：支付网关异常未捕获
3. 第 4-5 行：支付失败但状态已更改（无事务）

**修复建议：**

```python
from django.db import transaction

def process_payment(order_id: int, amount: float) -> dict:
    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)

            if order.status != 'pending':
                raise ValueError(f"订单状态不正确: {order.status}")

            try:
                result = payment_gateway.charge(
                    order.user.card_token,
                    amount
                )
            except PaymentError as e:
                logger.error(f"支付失败: order_id={order_id}, error={e}")
                order.status = 'payment_failed'
                order.save()
                raise

            order.status = 'paid'
            order.paid_at = timezone.now()
            order.save()
            return result

    except Order.DoesNotExist:
        logger.error(f"订单不存在: {order_id}")
        raise ValueError("订单不存在")
    except Exception as e:
        logger.exception(f"处理支付时发生错误: {order_id}")
        raise
```

---

## 5. 完整审查报告示例

### 示例 5：Python 类审查

**代码：**
```python
class userManager:
    def __init__(self):
        self.db = Database()

    def getUser(self, id):
        return self.db.query(f"SELECT * FROM users WHERE id={id}")

    def create_user(self, data):
        self.db.insert("users", data)
        return True
```

**审查报告：**

```
✅ 优点
1. 使用类封装数据库操作，结构清晰
2. create_user 方法命名使用 snake_case，符合 Python 规范

⚠️ 问题

🔴 严重（1个）
1. SQL 注入风险
   位置：getUser() 第 5 行
   描述：直接拼接 id 到 SQL 语句
   修复：使用参数化查询，如 self.db.query("SELECT * FROM users WHERE id=?", [id])

🟡 中等（2个）
1. 类名不符合规范
   位置：userManager 第 1 行
   描述：类名应使用 PascalCase
   修复：改为 UserManager

2. 方法名混合风格
   位置：getUser() 第 4 行
   描述：Python 方法应统一使用 snake_case
   修复：改为 get_user()

🟢 轻微（1个）
1. create_user 缺少返回值处理
   位置：create_user() 第 7-9 行
   描述：固定返回 True，无法判断实际是否成功
   修复：返回插入结果或异常处理

📊 总体评分：4/10
   代码质量: 5/10 | 安全性: 2/10 | 性能: 7/10 | 可维护性: 4/10
```

---

## 6. 边界情况审查示例

### 示例 6：空值和边界检查

**审查前代码：**
```python
def divide(a, b):
    return a / b

def get_first_item(items):
    return items[0]
```

**审查意见：**

**🟡 边界情况处理缺失**

**位置：divide() 第 1 行**
- **严重程度：** 🟡 中等
- **问题：** 未处理 b 为 0 的情况

**修复：**
```python
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("除数不能为零")
    return a / b
```

**位置：get_first_item() 第 4 行**
- **严重程度：** 🟡 中等
- **问题：** 未处理空列表情况

**修复：**
```python
from typing import Optional, Any

def get_first_item(items: list) -> Optional[Any]:
    if not items:
        return None
    return items[0]
    # 或抛出更有意义的异常
```

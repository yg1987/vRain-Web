# 文本编辑标记工具栏计划

> 在文本 tab 的编辑区上方添加一行标记按钮，选中文字点击按钮自动包裹/插入标记符，替代手动输入特殊字符。

---

## 一、目标

编辑文本时，选中一段文字 → 点击标记按钮 → 自动在文字前后添加对应标记符；无选中时 → 插入单字符标记（如 `T`、`%`）。

| 操作 | 有选中 | 无选中（仅光标） |
|------|--------|-----------------|
| 夹批 【】 | 选中文字 → `【选中文字】` | 光标处插入 `【】`，光标停在中间 |
| 书名线 《》 | `《选中文字》` | 同夹批 |
| 圆角框 〔〕 | `〔选中文字〕` | 同夹批 |
| 圆圈 〈〉 | `〈选中文字〉` | 同夹批 |
| 放大 （） | `（选中文字）` | 同夹批 |
| 圈注 ｛｝ | `｛选中文字｝` | 同夹批 |
| 顿点注 ＜＞ | `＜选中文字＞` | 同夹批 |
| 行注 ［］ | `［选中文字］` | 同夹批 |
| 换页 % | — | 光标处插入 `%` |
| 半页跳 $ | — | 光标处插入 `$` |
| 末列跳 & | — | 光标处插入 `&` |
| 空格 @ | — | 光标处插入 `@` |
| 缩进 T | — | 光标处插入 `T` |
| 多栏跳 ^ | — | 光标处插入 `^` |

---

## 二、UI 设计

### 位置

textarea 上方，标题输入框下方，一行按钮栏。

### 按钮分组

```
┌──────────────────────────────────────────────────┐
│ 装饰标记 【】 《》 〔〕 〈〉 （） ｛｝ ＜＞ ［］  │  ← 包裹类，选中生效
│ 排版控制  %  $  &  @  T  ^                      │  ← 插入类，光标生效
└──────────────────────────────────────────────────┘
```

或单行紧凑排列：

```
【夹批】|《书名》|〔框〕|〈圈〉|（大）|｛注｝|＜点＞|［行］ | %换页 | $半页 | &末列 | @空格 | T缩进 | ^多栏
```

### 交互

- 按钮始终可见，无需展开
- 若当前无选中文字，包裹类按钮仍然可用：插入空白标记对 `【】`，光标停在中间方便输入
- 按钮点击后自动聚焦回 textarea
- 不额外弹出对话框，纯文本操作

---

## 三、技术方案

### 实现位置

`frontend/src/components/TextEditor.tsx`

### 核心函数

```typescript
/**
 * 在 textarea 中插入或包裹文字
 * @param before  左标记符（包裹时）或要插入的字符（插入时）
 * @param after   右标记符，null 表示仅插入单字符
 */
function insertMark(textarea: HTMLTextAreaElement, before: string, after: string | null) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end);

    let newText: string;
    let cursorPos: number;

    if (after !== null) {
        // 包裹模式：用 before/after 包裹选中文字
        if (selected.length > 0) {
            newText = text.slice(0, start) + before + selected + after + text.slice(end);
            cursorPos = start + before.length + selected.length + after.length;
        } else {
            // 无选中，插入空标记对，光标停在中间
            newText = text.slice(0, start) + before + after + text.slice(end);
            cursorPos = start + before.length;
        }
    } else {
        // 插入模式：直接插入单字符
        newText = text.slice(0, start) + before + text.slice(end);
        cursorPos = start + before.length;
    }

    // 更新 localContent
    setLocalContent(newText);

    // 恢复光标位置（在下一帧，等 React 更新 DOM 后）
    requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
    });
}
```

### 改动范围

| 文件 | 改动 |
|------|------|
| `TextEditor.tsx` | 新增 `insertMark` 函数 + 按钮栏 JSX + 按钮样式 |

不需要动任何其他文件。

---

## 四、按钮文案建议

为节省空间，按钮用简短中文+符号：

| 按钮 | 调用 |
|------|------|
| `【夹批】` | `insertMark(ref, "【", "】")` |
| `《书名》` | `insertMark(ref, "《", "》")` |
| `〔框〕` | `insertMark(ref, "〔", "〕")` |
| `〈圈〉` | `insertMark(ref, "〈", "〉")` |
| `（大）` | `insertMark(ref, "（", "）")` |
| `｛注｝` | `insertMark(ref, "｛", "｝")` |
| `＜点＞` | `insertMark(ref, "＜", "＞")` |
| `［行］` | `insertMark(ref, "［", "］")` |
| `% 换页` | `insertMark(ref, "%", null)` |
| `$ 半页` | `insertMark(ref, "$", null)` |
| `& 末列` | `insertMark(ref, "&", null)` |
| `@ 空格` | `insertMark(ref, "@", null)` |
| `T 缩进` | `insertMark(ref, "T", null)` |
| `^ 多栏` | `insertMark(ref, "^", null)` |

---

## 五、影响评估

- **向下兼容**：不影响任何现有文本、配置、预览、导出逻辑
- **标记语法参考**：可保留或移除（按钮本身已是最直观的参考）
- **保存逻辑**：不变，`localContent` 变更后仍需点击保存才提交
- **测试**：布局引擎的测试不受影响（标记符处理逻辑不变）

---

## 六、预估工作量

- 核心函数 `insertMark`：~20 行
- 按钮栏 JSX：~30 行
- 样式微调：~10 行
- **总计约 60 行代码**，改动限定在一个文件内

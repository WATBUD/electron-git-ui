# Color Scheme

## 統一深色主題配色方案

整個應用採用一致的深色主題，靈感來自現代開發工具（VSCode、GitHub Dark）。

## 主要顏色

### 背景色
```css
--bg-primary: #1e1e2d;      /* 主背景 - 深藍灰 */
--bg-secondary: #16162a;    /* 次要背景 - 更深 */
--bg-tertiary: #1a1a2e;     /* 第三背景 - 內容區 */
--bg-darker: #0f0f1a;       /* 最深背景 - 內容區外層 */
```

### 主色調
```css
--primary: #4f46e5;         /* 靛藍色 - 主要操作 */
--primary-hover: #4338ca;   /* 靛藍色 hover */
--primary-light: rgba(79, 70, 229, 0.1);  /* 靛藍色淡化 */
--primary-shadow: rgba(79, 70, 229, 0.3); /* 靛藍色陰影 */
```

### 文字顏色
```css
--text-primary: #e2e8f0;    /* 主要文字 - 淺灰 */
--text-secondary: #a0aec0;  /* 次要文字 - 中灰 */
--text-tertiary: #718096;   /* 第三文字 - 深灰 */
--text-white: #ffffff;      /* 純白 - 強調 */
```

### 邊框顏色
```css
--border-primary: #2d3748;  /* 主要邊框 */
--border-secondary: #4a5568;/* 次要邊框 */
```

### 狀態顏色
```css
--success: #48bb78;         /* 成功 - 綠色 */
--warning: #ed8936;         /* 警告 - 橙色 */
--error: #f56565;           /* 錯誤 - 紅色 */
--error-bg: rgba(220, 38, 38, 0.15);  /* 錯誤背景 */
--error-border: rgba(220, 38, 38, 0.3); /* 錯誤邊框 */
```

## 組件配色

### LeftSideBar
- 背景：`#1e1e2d`
- 文字：`#e2e8f0`
- Hover：`rgba(255, 255, 255, 0.05)`
- Active：`rgba(79, 70, 229, 0.2)`
- 邊框：`#2d3748`

### AppToolbar
- 背景：`#1e1e2d`
- 文字：`#e2e8f0`
- Hover：`#2a2d2e`
- 邊框：`#2d3748`

### Main Content
- 外層背景：`#0f0f1a`
- 內容背景：`#1a1a2e`
- 文字：`#e2e8f0`

### FooterArea
- 背景：`#1e1e2d`
- Tab 背景：`#16162a`
- 文字：`#e2e8f0`
- Active Tab 下劃線：`#4f46e5`
- Hover：`rgba(79, 70, 229, 0.1)`
- 邊框：`#2d3748`

### Buttons
- Primary：`#4f46e5`
- Primary Hover：`#4338ca`
- Disabled：`#4a5568` (opacity: 0.5)
- Shadow：`0 2px 8px rgba(79, 70, 229, 0.3)`

### Code/Monospace
- 背景：`#2d3748`
- 文字：`#e2e8f0`
- 邊框：`#4a5568`

## 使用指南

### 按鈕樣式
```css
.primary-button {
  background-color: #4f46e5;
  color: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.primary-button:hover {
  background-color: #4338ca;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}
```

### Hover 效果
```css
.interactive-item:hover {
  background-color: rgba(79, 70, 229, 0.1);
  color: #e2e8f0;
}
```

### 邊框
```css
.bordered-element {
  border: 1px solid #2d3748;
}
```

## 設計原則

1. **一致性**：所有組件使用相同的色彩變量
2. **對比度**：確保文字在背景上清晰可讀
3. **層次感**：使用不同深度的背景色區分層級
4. **強調色**：靛藍色 (#4f46e5) 用於主要操作和活動狀態
5. **柔和過渡**：使用 rgba 和透明度創建柔和的 hover 效果

## 可訪問性

- 所有文字顏色符合 WCAG AA 標準
- 主要文字 (#e2e8f0) 在深色背景上對比度 > 7:1
- 按鈕和互動元素有明確的 hover 和 active 狀態

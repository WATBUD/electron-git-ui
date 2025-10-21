# Layout Structure

## VSCode 風格的佈局

專案現在採用類似 VSCode 的佈局結構，FooterArea 固定在底部並佔據整個寬度。

## 佈局層級

```
git-ui (100vh)
├── AppToolbar (固定高度 48px)
├── main-layout (flex: 1)
│   ├── content-area (flex: 1)
│   │   ├── LeftSideBar (固定寬度)
│   │   └── main-content (flex: 1, 可滾動)
│   │       ├── repository-selector
│   │       ├── Toolbar
│   │       └── BranchList / GitGraph / FileStatus
│   └── FooterArea (可調整高度, 固定在底部)
│       ├── resize-handle (拖動調整高度)
│       ├── command-tabs
│       └── command-list / terminal
└── LoadingModal / ErrorModal (全局 modal)
```

## 關鍵特性

### 1. 固定底部面板
- FooterArea 不再是 `position: fixed`
- 而是在 `main-layout` 的 flex 佈局中
- 佔據整個寬度，不受側邊欄影響

### 2. 可調整高度
- 拖動 resize-handle 可以調整 FooterArea 高度
- 使用 `flex-shrink: 0` 確保不會被壓縮
- 最小高度 100px，最大高度 window.innerHeight - 100px

### 3. VSCode 深色主題
- 背景色：`#1e1e1e`
- 邊框色：`#2d2d30`
- 文字色：`#d4d4d4`
- 強調色：`#007acc`

### 4. 響應式內容區
- content-area 使用 flexbox 水平佈局
- main-content 可獨立滾動
- FooterArea 固定在底部，不隨內容滾動

## CSS 類別說明

### `.git-ui`
- 最外層容器
- `height: 100vh` 佔滿整個視窗
- `display: flex; flex-direction: column`

### `.main-layout`
- 主佈局容器
- `flex: 1` 佔據 AppToolbar 之外的所有空間
- `flex-direction: column` 垂直排列內容區和底部面板

### `.content-area`
- 內容區域容器
- `flex: 1` 自動填充剩餘空間
- `display: flex` 水平排列側邊欄和主內容

### `.footer-area`
- 底部面板
- `flex-shrink: 0` 不會被壓縮
- `width: 100%` 佔據整個寬度

## 使用方式

```jsx
<div className="git-ui">
  <AppToolbar />
  
  <div className="main-layout">
    <div className="content-area">
      <LeftSideBar />
      <div className="main-content">
        {/* 主要內容 */}
      </div>
    </div>
    
    {showFooter && <FooterArea />}
  </div>
</div>
```

## 優點

1. **類似 VSCode**：用戶熟悉的佈局模式
2. **固定底部**：不隨內容滾動，始終可見
3. **可調整高度**：用戶可以自定義面板大小
4. **響應式**：適應不同視窗大小
5. **清晰分離**：內容區和工具區職責明確

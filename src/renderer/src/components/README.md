# Components Structure

本專案採用業界標準的組件分類結構，按功能和用途組織。

## 資料夾結構

```
components/
├── layout/          # 佈局組件
│   ├── AppToolbar/  # 頂部工具列
│   ├── LeftSideBar/ # 左側導航欄
│   └── FooterArea/  # 底部區域
├── git/             # Git 核心功能組件
│   ├── BranchList/  # 分支列表
│   ├── GitGraph/    # Git 圖表視圖
│   ├── FileStatus/  # 文件狀態
│   ├── Toolbar/     # Git 操作工具列
│   └── GitUI/       # Git UI 主容器
└── ui/              # 通用 UI 組件
    ├── LoadingModal/   # 載入中模態框
    ├── ErrorModal/     # 錯誤模態框
    ├── RefreshButton/  # 刷新按鈕
    ├── ModalPortal/    # 模態框傳送門
    └── Versions/       # 版本信息
```

## 組件命名規範

- 每個組件都有自己的資料夾
- 主文件命名為 `index.jsx`
- CSS 文件命名為 `[ComponentName].css`
- 從外部 import 時使用資料夾路徑：`import { GitUI } from '@/components/git/GitUI'`

## Import 路徑示例

```javascript
// 從 GitUI 引入其他組件
import { LoadingModal } from '../../ui/LoadingModal';
import { AppToolbar } from '../../layout/AppToolbar';
import { BranchList } from '../BranchList';

// 從 App.jsx 引入
import { GitUI } from './components/git/GitUI';
import Versions from './components/ui/Versions';
```

## 優點

1. **清晰的職責分離**：layout、git、ui 各司其職
2. **易於擴展**：新增組件時知道該放哪裡
3. **Import 路徑更語義化**：一眼就知道組件的用途
4. **團隊協作友好**：不同開發者可以負責不同模組
5. **符合業界標準**：與 React 大型專案的最佳實踐一致

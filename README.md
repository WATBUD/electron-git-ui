
# Git UI

An Electron application built with React and Redux Toolkit for Git repository management.

## 🚀 Features

- Git repository management
- Branch management
- Commit history visualization
- File status tracking
- Staging and committing changes
- Remote repository operations

## 🏗️ Project Structure

```
src/renderer/src/
├── modules/                    # Feature modules
│   └── git/                   # Git module
│       ├── components/        # Git-specific components
│       ├── layout/            # Layout components for Git module
│       ├── store/             # Redux store configuration
│       └── index.js           # Module exports
│
├── shared/                    # Shared resources
│   ├── components/            # Reusable UI components
│   │   ├── ErrorModal/        # Error display modal
│   │   ├── LoadingModal/      # Loading indicator
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
│
├── App.jsx                    # Root component
└── main.jsx                   # Application entry point
```

## 🛠️ Development

### Prerequisites

- Node.js 16+
- npm or yarn
- Git

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📝 License

MIT
│   ├── BranchList/      # 分支列表
│   ├── GitGraph/        # Git 圖表視圖
│   ├── FileStatus/      # 文件狀態
│   ├── Toolbar/         # Git 操作工具列
│   └── GitMainPage/     # Git UI 主容器
└── ui/              # 通用 UI 組件
    ├── LoadingModal/    # 載入中模態框
    ├── ErrorModal/      # 錯誤模態框
    ├── RefreshButton/   # 刷新按鈕
    ├── ModalPortal/     # 模態框傳送門
    └── Versions/        # 版本信息
```

### 組件命名規範

* 每個組件一個資料夾
* 主文件：`index.jsx`
* CSS 文件：`[ComponentName].css`
* Import 使用資料夾路徑，例如：

```javascript
import { GitMainPage } from '@/components/git/GitMainPage';
import Versions from '@/components/ui/Versions';
```

### Import 範例

```javascript
// GitMainPage 內引入
import { LoadingModal } from '../../ui/LoadingModal';
import { AppToolbar } from '../../layout/AppToolbar';
import { BranchList } from '../BranchList';

// App.jsx 引入
import { GitMainPage } from './components/git/GitMainPage';
import Versions from './components/ui/Versions';
```

### 優點

1. **清晰職責分離**：layout、git、ui 各司其職
2. **易於擴展**：新增組件時一目了然
3. **語義化 Import**：路徑直接反映組件用途
4. **團隊協作友好**：模組明確，各人負責不同部分
5. **業界標準**：與大型 React 專案最佳實踐一致

---

## ⚙️ Recommended IDE Setup

* **VSCode** + **ESLint** + **Prettier**
  [VSCode](https://code.visualstudio.com/)
  [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## 🚀 Project Setup

### Install

```bash
yarn
```

### Development

```bash
yarn dev
```

### Build

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux
```

---

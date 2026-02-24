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

### Import 範例

```javascript
// MainPageGit 內引入
import { LoadingModal } from '../../ui/LoadingModal'
import { AppToolbar } from '../../layout/AppToolbar'
import { BranchList } from '../BranchList'

// App.jsx 引入
import { MainPageGit } from './components/git/MainPageGit'
import Versions from './components/ui/Versions'
```

---

## ⚙️ Recommended IDE Setup

- **VSCode** + **ESLint** + **Prettier**

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

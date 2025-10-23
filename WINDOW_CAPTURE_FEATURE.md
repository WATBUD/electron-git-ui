# Window Capture Feature - 視窗抓取功能

## 功能說明 (Feature Description)

已成功實作視窗抓取功能，允許使用者：
1. 獲取可用視窗列表
2. 從列表中選擇目標視窗
3. 將選定的視窗用於巨集錄製和播放

## 實作細節 (Implementation Details)

### 1. 主進程處理器 (Main Process Handler)
**檔案**: `src/main/macroIpcHandlers.js`

- 新增 `get-window-list` IPC handler
- 使用 **AppleScript** 獲取 macOS 上實際運行的應用程式
- 返回 Electron 視窗和真實的系統應用程式列表
- 包含視窗 ID、標題、類型和邊界資訊
- 自動過濾掉背景應用程式，只顯示有視窗的應用程式

### 2. Preload 腳本 (Preload Script)
**檔案**: `src/preload/macroPreload.js`

- 暴露 `getWindowList()` API 給渲染進程
- 使用 `ipcRenderer.invoke()` 進行異步通信

### 3. 使用者介面 (User Interface)
**檔案**: `src/renderer/src/modules/macro-recorder/pages/main-page/main-page-macro.jsx`

新增功能：
- **刷新按鈕**: 點擊獲取最新視窗列表
- **視窗選擇器**: 下拉選單顯示可用視窗
- **搜尋功能**: 可以搜尋視窗名稱快速定位
- **視窗圖示**: 使用 WindowsOutlined 圖示標識視窗
- **類型標籤**: 
  - 🟢 綠色標籤顯示 macOS 應用程式
  - 🔵 藍色標籤顯示 Electron 視窗
- **狀態管理**: 追蹤選定的視窗 ID 和可用視窗列表

## 使用方法 (How to Use)

1. **刷新視窗列表**
   - 點擊 Target Window 旁的刷新按鈕 (🔄)
   - 系統會顯示找到的視窗數量

2. **選擇目標視窗**
   - 從下拉選單中選擇要控制的視窗
   - 選定後會顯示確認訊息

3. **手動輸入**
   - 如果沒有刷新視窗列表，可以手動輸入視窗標題

## 技術架構 (Technical Architecture)

```
Renderer Process (React)
    ↓ (window.macroAPI.getWindowList())
Preload Script
    ↓ (ipcRenderer.invoke('get-window-list'))
Main Process
    ↓ (BrowserWindow.getAllWindows())
Window List
```

## macOS AppleScript 實作 (macOS AppleScript Implementation)

使用 AppleScript 透過 System Events 獲取運行中的應用程式：

```applescript
tell application "System Events"
  set appList to name of every application process whose background only is false
end tell
```

這個方法的優點：
- ✅ 不需要額外安裝套件
- ✅ 原生支援 macOS
- ✅ 只顯示有視窗的應用程式（過濾背景程式）
- ✅ 執行速度快

## 未來改進 (Future Improvements)

1. **視窗預覽**
   - 顯示視窗縮圖
   - 實時更新視窗狀態

3. **視窗過濾**
   - 按應用程式類型過濾
   - 搜索功能

4. **視窗焦點控制**
   - 自動聚焦目標視窗
   - 視窗置頂功能

## 相關檔案 (Related Files)

- `src/main/macroIpcHandlers.js` - 主進程 IPC 處理器
- `src/preload/macroPreload.js` - Preload 腳本
- `src/renderer/src/modules/macro-recorder/pages/main-page/main-page-macro.jsx` - UI 組件
- `package.json` - 依賴項 (包含 robotjs)

## 注意事項 (Notes)

- 目前視窗列表包含 Electron 視窗和預設的常見應用程式
- 要獲取實際系統視窗，需要安裝額外的原生模組
- 功能在錄製或播放時會被禁用以防止衝突

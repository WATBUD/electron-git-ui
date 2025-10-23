# 測試視窗抓取功能 (Test Window Capture)

## 測試步驟

### 1. 重新啟動應用程式
```bash
npm run dev
```

### 2. 開啟多個應用程式
在測試前，請開啟一些應用程式，例如：
- Safari 或 Chrome 瀏覽器
- Visual Studio Code
- Finder
- Terminal
- 任何其他應用程式（例如 MapleStory）

### 3. 測試視窗列表功能

1. **點擊刷新按鈕** (🔄)
   - 應該會看到訊息：`Found X window(s)` 
   - X 應該是你開啟的應用程式數量

2. **檢查下拉選單**
   - 點開 "Select a window" 下拉選單
   - 應該看到所有運行中的應用程式
   - 每個應用程式旁邊應該有標籤：
     - 🟢 綠色 "macOS" 標籤 = macOS 系統應用程式
     - 🔵 藍色 "Electron" 標籤 = Electron 視窗

3. **測試搜尋功能**
   - 在下拉選單中輸入應用程式名稱
   - 列表應該會自動過濾

4. **選擇視窗**
   - 點選一個應用程式
   - 應該看到確認訊息：`Selected window: [應用程式名稱]`
   - Target Window 欄位應該更新為該應用程式名稱

## 預期結果

### ✅ 成功的標誌
- 能看到所有運行中的應用程式
- 不會看到背景程式（如系統服務）
- 可以搜尋和選擇視窗
- 選擇後有確認訊息

### ❌ 如果出現問題

**問題 1**: 看不到任何應用程式
- 檢查 Console 是否有錯誤訊息
- 確認是在 macOS 系統上運行
- 檢查 System Events 權限

**問題 2**: `getWindowList is not a function`
- 確認已重新啟動應用程式
- 檢查 `src/preload/index.js` 是否包含 `getWindowList`

**問題 3**: 只看到 Electron 視窗
- 檢查 AppleScript 是否正確執行
- 查看主進程的 console log

## 除錯指令

### 查看主進程 Log
主進程的 console.log 會顯示：
```
Found X running macOS applications
```

### 檢查 AppleScript 是否正常
在 Terminal 中執行：
```bash
osascript -e 'tell application "System Events" to get name of every application process whose background only is false'
```

應該會看到類似：
```
Finder, Safari, Visual Studio Code, Terminal, ...
```

## 已知限制

1. **只顯示應用程式名稱**
   - 目前只能獲取應用程式名稱，無法獲取個別視窗標題
   - 如果同一個應用程式開啟多個視窗，只會顯示一次

2. **權限要求**
   - macOS 可能會要求授予 Accessibility 權限
   - 如果出現權限提示，請允許存取

3. **效能**
   - 每次點擊刷新都會執行 AppleScript
   - 通常很快，但如果系統負載高可能會稍慢

## 下一步測試

測試完視窗抓取後，可以測試：
1. 選擇一個視窗
2. 開始錄製巨集
3. 播放巨集到選定的視窗

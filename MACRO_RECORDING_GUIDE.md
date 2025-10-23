# 巨集錄製功能使用指南 (Macro Recording Guide)

## 🎯 功能說明

現在已經實作真實的鍵盤和滑鼠事件錄製功能，使用 `uiohook-napi` 來監聽全局事件。

## 📋 支援的動作類型

1. **鍵盤事件**
   - `keydown` - 按下鍵盤按鍵
   - `keyup` - 放開鍵盤按鍵

2. **滑鼠事件**
   - `mousedown` - 按下滑鼠按鈕
   - `mouseup` - 放開滑鼠按鈕
   - `mousemove` - 滑鼠移動
   - `wheel` - 滑鼠滾輪

## 🔐 macOS 權限要求

**重要**: 在 macOS 上使用全局事件監聽需要 **Accessibility 權限**。

### 授予權限步驟：

1. 當你第一次點擊 "Record" 時，macOS 會彈出權限請求對話框
2. 如果沒有彈出，請手動設定：
   - 打開 **系統設定** (System Settings)
   - 前往 **隱私權與安全性** (Privacy & Security)
   - 點擊 **輔助使用** (Accessibility)
   - 找到你的應用程式並勾選啟用

3. **重新啟動應用程式**以使權限生效

## 🚀 使用方法

### 1. 選擇目標視窗
```
1. 點擊刷新按鈕 (🔄) 獲取視窗列表
2. 從下拉選單選擇目標應用程式（例如 SourceTree）
```

### 2. 開始錄製
```
1. 點擊 "Record" 按鈕
2. 執行你想要錄製的動作：
   - 移動滑鼠
   - 點擊滑鼠
   - 按下鍵盤按鍵
   - 滾動滑鼠滾輪
3. 所有動作會即時顯示在 "Recorded Actions" 列表中
```

### 3. 停止錄製
```
點擊 "Stop" 按鈕停止錄製
```

### 4. 儲存巨集
```
1. 輸入巨集名稱
2. 點擊 "Save Macro" 按鈕
```

### 5. 播放巨集
```
1. 從 "Saved Macros" 列表選擇一個巨集
2. 點擊 "Play" 按鈕
```

## 📊 動作顯示格式

錄製的動作會以下列格式顯示：

- **keydown/keyup**: `Keycode: 65` (按鍵代碼)
- **mousedown/mouseup**: `Button: 1, X: 100, Y: 200` (按鈕編號和座標)
- **mousemove**: `X: 100, Y: 200` (滑鼠座標)
- **wheel**: `Rotation: 1, Direction: 3` (滾輪旋轉和方向)

## ⚙️ 設定選項

- **Target Window**: 目標視窗名稱
- **Speed**: 播放速度 (0.5x - 2.0x)
- **Loop**: 是否循環播放

## 🐛 常見問題

### Q1: 點擊 Record 後沒有反應？
**A**: 檢查是否已授予 Accessibility 權限。查看主進程的 console 是否有錯誤訊息。

### Q2: 錄製的動作沒有顯示？
**A**: 
1. 確認已重新啟動應用程式
2. 檢查 uiohook-napi 是否正確安裝：`npm list uiohook-napi`
3. 查看 console 是否有 "Recording started with uIOhook" 訊息

### Q3: 滑鼠移動事件太多？
**A**: 這是正常的。滑鼠移動會產生大量事件。未來可以加入過濾或降採樣功能。

### Q4: 如何知道按鍵代碼對應哪個鍵？
**A**: 常見按鍵代碼：
- A-Z: 65-90
- 0-9: 48-57
- Enter: 13
- Space: 32
- Shift: 16
- Ctrl: 17
- Alt: 18

完整列表請參考：https://github.com/WilixLead/uiohook-napi

## 🔧 技術架構

```
User Action (Keyboard/Mouse)
    ↓
uIOhook (Global Event Listener)
    ↓
Main Process (macroIpcHandlers.js)
    ↓
IPC Communication
    ↓
Renderer Process (React UI)
    ↓
Display in Actions List
```

## 📦 依賴套件

- `uiohook-napi` - 全局鍵盤和滑鼠事件監聽
- `robotjs` - 用於播放巨集（未來實作）
- `electron` - 應用程式框架

## 🎬 下一步開發

- [ ] 實作巨集播放功能
- [ ] 過濾過多的滑鼠移動事件
- [ ] 顯示按鍵名稱而不是代碼
- [ ] 支援熱鍵快速啟動/停止錄製
- [ ] 巨集編輯功能
- [ ] 延遲調整
- [ ] 條件判斷（如顏色檢測）

## 🔄 重新啟動應用程式

安裝新套件後，請重新啟動：
```bash
npm run dev
```

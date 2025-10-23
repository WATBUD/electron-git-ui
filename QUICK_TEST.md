# 快速測試巨集錄製 (Quick Test)

## ⚡ 立即測試

### 1️⃣ 重新啟動應用程式
```bash
npm run dev
```

### 2️⃣ 授予權限（第一次使用）
當你點擊 "Record" 時，macOS 會要求 Accessibility 權限：
- 點擊 "Open System Settings"
- 在 Accessibility 列表中找到你的應用程式
- 勾選啟用
- **重新啟動應用程式**

### 3️⃣ 測試錄製

1. **選擇視窗**
   - 點擊刷新按鈕 🔄
   - 選擇 "SourceTree" 或任何其他應用程式

2. **開始錄製**
   - 點擊紅色 "Record" 按鈕
   - 你應該在 Console 看到：`Recording started with uIOhook`

3. **執行動作**
   - 移動滑鼠 → 應該看到 `mousemove` 事件
   - 點擊滑鼠 → 應該看到 `mousedown` 和 `mouseup` 事件
   - 按下鍵盤 → 應該看到 `keydown` 和 `keyup` 事件

4. **檢查結果**
   - "Recorded Actions" 計數應該增加
   - 列表中應該顯示所有動作
   - 每個動作都有時間戳記

5. **停止錄製**
   - 點擊 "Stop" 按鈕
   - Console 應該顯示：`Recording stopped. Total actions: X`

## ✅ 成功標誌

- ✅ 能看到 "Recording started with uIOhook" 訊息
- ✅ 滑鼠移動時看到 `mousemove` 事件
- ✅ 點擊時看到 `mousedown` 和 `mouseup` 事件
- ✅ 按鍵時看到 `keydown` 和 `keyup` 事件
- ✅ 動作計數正確增加

## ❌ 如果沒有反應

### 檢查清單：

1. **檢查 Console 錯誤**
   - 打開 DevTools (Cmd+Option+I)
   - 查看是否有紅色錯誤訊息

2. **檢查主進程 Log**
   - 在啟動應用程式的 Terminal 中查看
   - 應該看到 "Recording started with uIOhook"

3. **檢查權限**
   ```bash
   # 檢查是否有 Accessibility 權限
   # 系統設定 > 隱私權與安全性 > 輔助使用
   ```

4. **重新安裝套件**
   ```bash
   npm install uiohook-napi
   npm run dev
   ```

5. **檢查套件是否正確安裝**
   ```bash
   npm list uiohook-napi
   # 應該顯示: uiohook-napi@1.5.4
   ```

## 🔍 除錯指令

### 測試 uIOhook 是否正常
在 Node.js 環境中測試：
```javascript
const { uIOhook } = require('uiohook-napi')

uIOhook.on('keydown', (e) => {
  console.log('Key pressed:', e.keycode)
})

uIOhook.start()
console.log('uIOhook started, press any key...')
```

### 查看所有事件
在錄製時，主進程 console 應該顯示：
```
Recording started with uIOhook
Recording stopped. Total actions: 123
```

## 📝 預期行為

### 滑鼠移動
- 每次移動會產生多個 `mousemove` 事件
- 這是正常的，因為滑鼠移動很頻繁

### 鍵盤按鍵
- 每次按鍵會產生 1 個 `keydown` 和 1 個 `keyup`
- 長按會產生多個 `keydown`（系統重複輸入）

### 滑鼠點擊
- 每次點擊會產生 1 個 `mousedown` 和 1 個 `mouseup`
- Button 0 = 左鍵, 1 = 中鍵, 2 = 右鍵

## 🎯 測試場景

### 場景 1: 簡單測試
1. 錄製
2. 移動滑鼠到螢幕中央
3. 點擊一次
4. 按下 "A" 鍵
5. 停止錄製

**預期結果**: 應該看到約 10-50 個 mousemove + 2 個 mouse 事件 + 2 個 key 事件

### 場景 2: SourceTree 測試
1. 選擇 SourceTree
2. 錄製
3. 在 SourceTree 中執行一些操作
4. 停止錄製

**預期結果**: 所有操作都被記錄

## 🚨 已知限制

1. **滑鼠移動事件很多**
   - 正常現象，未來會加入過濾

2. **需要 Accessibility 權限**
   - 第一次使用必須授權

3. **播放功能尚未實作**
   - 目前只能錄製，播放功能待開發

## 📞 需要幫助？

如果測試失敗，請提供：
1. Console 錯誤訊息
2. 主進程 log
3. macOS 版本
4. 是否已授予 Accessibility 權限

# E2E 測試執行指南

本專案提供 **Playwright** 端對端測試，支援 JavaScript (Node.js) 和 Python 兩種實現。

## 目錄
- [快速開始](#快速開始)
- [JavaScript (Node.js) 版本](#javascript-nodejs-版本)
- [Python 版本](#python-版本)
- [測試架構](#測試架構)
- [故障排查](#故障排查)

## 快速開始

### 前置準備

確保以下服務正在運行：

1. **前端服務器** (終端 1)
```bash
cd frontend
php -S localhost:8000
```

2. **後端服務器** (終端 2)
```bash
cd backend
php -S 127.0.0.1:8080
```

3. **MySQL 資料庫**
```bash
# 確保已執行數據庫初始化
php run_migration.php
```

## JavaScript (Node.js) 版本

### 安裝

```bash
# 安裝依賴
npm install

# 安裝瀏覽器驅動
npx playwright install
```

### 執行測試

```bash
# 基本執行
npm test

# 互動式 UI 模式（推薦用於開發和調試）
npm run test:ui

# 有頭模式（可見瀏覽器）
npm run test:headed

# 特定瀏覽器
npm run test:chrome      # Chrome
npm run test:firefox     # Firefox
npm run test:webkit      # Safari

# 調試模式
npm run test:debug

# 執行特定測試
npx playwright test user-stories.spec.js
npx playwright test -g "US 1.1"
```

### 查看測試報告

```bash
npx playwright show-report
```

測試報告位置：`playwright-report/index.html`

## Python 版本

### 安裝

```bash
# 安裝 Python 依賴
pip install -r requirements-test.txt

# 安裝瀏覽器驅動
playwright install
```

### 執行測試

```bash
# 基本執行
pytest tests/e2e/test_user_stories.py -v

# 詳細輸出
pytest tests/e2e/test_user_stories.py -v -s

# 執行特定測試類
pytest tests/e2e/test_user_stories.py::TestUS11ClubListAndSearch -v

# 執行特定測試
pytest tests/e2e/test_user_stories.py::TestUS11ClubListAndSearch::test_ac1_has_category_and_tags_elements -v

# 並行執行（安裝 pytest-xdist）
pytest tests/e2e/test_user_stories.py -n auto

# 生成 HTML 報告（安裝 pytest-html）
pytest tests/e2e/test_user_stories.py --html=report.html
```

### 高級選項

```bash
# 停止在第一個失敗
pytest tests/e2e/test_user_stories.py -x

# 顯示最慢的 10 個測試
pytest tests/e2e/test_user_stories.py --durations=10

# 詳細執行秩序
pytest tests/e2e/test_user_stories.py -v --tb=short
```

## 測試架構

### 文件結構
```
tests/
├── e2e/
│   ├── README.md                    # 詳細文檔
│   ├── user-stories.spec.js         # JavaScript 測試（Playwright + Jest）
│   ├── test_user_stories.py         # Python 測試（Playwright + pytest）
│   └── RUNNING_TESTS.md             # 本檔案
└── api/
    ├── acceptance_user_stories.php  # API 層級測試
    └── acceptance_user_stories.ps1  # PowerShell 幫助腳本
```

### 測試覆蓋範圍

| 功能 | JS | Python | 狀態 |
|------|-----|--------|------|
| 社團列表 | ✅ | ✅ | 完成 |
| 搜尋篩選 | ✅ | ✅ | 完成 |
| 追蹤功能 | ✅ | ✅ | 完成 |
| 活動發布 | ✅ | ✅ | 完成 |
| 管理員功能 | ✅ | ✅ | 完成 |
| 登入/權限 | ✅ | ✅ | 完成 |

## 測試帳號

所有帳號預設密碼：`Test123456`

- **student@univ.edu** - 學生帳號
- **clubadmin@univ.edu** - 社團幹部
- **admin@univ.edu** - 平台管理員

## 故障排查

### JavaScript 版本

#### Q: 測試超時？
1. 檢查前端/後端服務狀態
2. 增加超時時間：在 `playwright.config.js` 中修改 `timeout`

#### Q: 找不到元素？
1. 運行 `npm run test:debug` 進行調試
2. 檢查元素選擇器是否與前端 HTML 匹配

#### Q: 無法登入？
1. 驗證資料庫已初始化
2. 檢查 CORS 設置

### Python 版本

#### Q: ImportError?
```bash
pip install --upgrade pip
pip install -r requirements-test.txt
playwright install
```

#### Q: 測試無法找到瀏覽器？
```bash
playwright install
```

#### Q: 權限被拒絕？
```bash
chmod +x ~/.cache/ms-playwright/*
```

## 配置選項

### JavaScript (playwright.config.js)

```javascript
// 修改超時時間
timeout: 30000,

// 並行工作進程
workers: 4,

// 重試次數
retries: 1,

// 視頻錄製
video: 'retain-on-failure',

// 截圖
screenshot: 'only-on-failure'
```

### Python (pytest.ini 或 pyproject.toml)

```ini
[pytest]
testpaths = tests/e2e
python_files = test_*.py
addopts = -v --tb=short
```

## 持續集成 (CI)

### GitHub Actions 範例
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

## 相關資源

- [Playwright 官方文檔](https://playwright.dev)
- [pytest 文檔](https://docs.pytest.org)
- [API 層級測試](acceptance_user_stories.php)
- [測試報告](../../TESTING_REPORT.md)

## 常用命令速查表

### JavaScript
```bash
npm test                    # 執行所有測試
npm run test:ui            # UI 模式
npm run test:headed        # 有頭模式
npm run test:debug         # 調試
npx playwright show-report # 查看報告
```

### Python
```bash
pytest tests/e2e           # 執行所有測試
pytest -v                  # 詳細模式
pytest -s                  # 顯示 print 輸出
pytest -x                  # 第一個失敗停止
pytest --html=report.html  # 生成 HTML 報告
```

## 支持與反饋

如有問題，請檢查：
1. 服務器是否正常運行
2. 資料庫連接
3. 元素選擇器是否正確
4. 瀏覽器驅動是否已安裝

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  
  /* 最多運行次數 */
  fullyParallel: true,
  
  /* 如果測試失敗，重新運行 */
  retries: process.env.CI ? 2 : 1,

  /* 並行運行的工作進程數 */
  // Firefox 在高並行下 Marionette 連線不穩，限制 4 個 worker
  workers: process.env.CI ? 1 : 4,
  
  /* 報告器 */
  reporter: 'html',
  
  /* 共享設置 */
  use: {
    /* 進行操作時的基本 URL */
    baseURL: 'http://localhost:8000',
    
    /* 收集追蹤 */
    trace: 'on-first-retry',
    
    /* 截圖失敗 */
    screenshot: 'only-on-failure',
    
    /* 視頻失敗 */
    video: 'retain-on-failure',
  },

  /* 為每個瀏覽器配置項目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 在命名瀏覽器上運行測試 */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* 在所有測試之前運行 Web 服務器 */
  webServer: {
    command: 'php -S localhost:8000 tests/e2e/dev-router.php',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
  },

  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
});

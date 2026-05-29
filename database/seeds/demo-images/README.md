# Demo 示範圖片

此資料夾存放 `demo_enrichment.sql` 使用的 24 張展示活動照片。
圖片已壓縮至約 50-100KB，直接進 git（不需要 LFS）。

## 使用方式

clone 後直接執行 seed 腳本，照片會自動複製到正確位置：

```bash
php scripts/seed-demo-data.php
```

## 新增 / 替換圖片

1. 將新圖片放入此資料夾（檔名對應 `demo_enrichment.sql` Section 8 的路徑）
2. 建議壓縮至 200KB 以下再 commit（避免 repo 膨脹）
3. `git add database/seeds/demo-images/新圖片.jpg && git commit`

## 檔案清單

```
demo_dance_show_1.jpg        demo_dance_show_2.jpg        demo_dance_show_3.jpg
demo_dance_recruit_1.jpg     demo_dance_recruit_2.jpg
demo_photo_outing_1.jpg      demo_photo_outing_2.jpg
demo_photo_exhibition_1.jpg  demo_photo_exhibition_2.jpg  demo_photo_exhibition_3.jpg
demo_music_concert_1.jpg     demo_music_concert_2.jpg     demo_music_concert_3.jpg
demo_hiking_1.jpg            demo_hiking_2.jpg
demo_martial_arts_1.jpg
demo_speech_1.jpg
demo_firstaid_1.jpg
demo_boardgame_1.jpg         demo_boardgame_2.jpg
demo_esports_1.jpg           demo_esports_2.jpg
demo_startup_1.jpg           demo_startup_2.jpg
```

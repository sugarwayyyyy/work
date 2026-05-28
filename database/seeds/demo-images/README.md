# Demo 示範圖片

此資料夾存放 `demo_enrichment.sql` 使用的 24 張展示活動照片，透過 **Git LFS** 管理（大型二進位檔案不直接進 git objects）。

## 同事首次 clone 後

```bash
git lfs pull
```

下載完成後圖片即出現在此資料夾，接著執行 seed 腳本會自動複製到正確位置：

```bash
php scripts/seed-demo-data.php
```

## 新增 / 替換圖片

1. 將新圖片放入此資料夾（檔名對應 `demo_enrichment.sql` Section 8 的路徑）
2. `git add database/seeds/demo-images/新圖片.jpg`
3. `git commit -m "update: 更換 demo 示範圖片"`
4. `git push`（LFS 會自動上傳大檔到 LFS storage）

## 預期檔案清單

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

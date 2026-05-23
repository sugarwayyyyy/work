# 敹恍?憪???

?祆?隞嗆?靘??剛楝敺???瘚?嚗?洵銝甈⊿蝵脫??撽??啣??蝙?具?

## ?桅?
- [?桃?](#?桃?)
- [?蔭璇辣](#?蔭璇辣)
- [摰?甇仿?](#摰?甇仿?)
- [???孵?](#???孵?)
- [皜祈岫撣唾?](#皜祈岫撣唾?)
- [撣貉???](#撣貉???)
- [?賊??辣](#?賊??辣)

## ?桃?

???澈??蝡航??垢敹恍?韏瑚?嚗Ⅱ隤像?啣隞交迤撣貊汗??乓?

## ?蔭璇辣

- Windows ?摰寧??祆??啣?
- AppServ ??XAMPP嚗 Apache + PHP嚗?
- MySQL 8.0+ ??MariaDB
- ?臬銵?PowerShell

## 摰?甇仿?

### 1. ?臬鞈?摨?

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p club_platform < database/migrations/2026_04_01_user_stories_core.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_event_tags.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_qa_urgency.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_transfer_request_workflow.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_event_poster_path.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_qa_reply_helpful.sql
mysql -u root -p club_platform < database/migrations/2026_04_09_qa_reply_threads.sql
mysql -u root -p club_platform < database/migrations/2026_04_19_event_comments.sql
mysql -u root -p club_platform < database/migrations/2026_04_19_reviews_unique_user_club.sql
mysql -u root -p club_platform < database/migrations/2026_04_28_event_time_range.sql
mysql -u root -p club_platform < database/migrations/2026_05_10_club_fee_semester.sql
mysql -u root -p club_platform < database/migrations/2026_05_11_remove_categories_religion_misc.sql
mysql -u root -p club_platform < database/migrations/2026_05_21_google_oauth.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_fee_per_session.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_member_fee_paid.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_member_join.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_private_messages.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_club_join_applications.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_bot_messages.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_user_notes.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_event_posters.sql
mysql -u root -p club_platform < database/seeds/2026_04_02_school_clubs_seed.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

> seed ??銝憿????`school_clubs_seed`嚗冗?蝷???嚗??臬 `test_accounts_and_story_data`嚗葫閰血董??瘣餃?嚗??蝷曉? ID嚗?

?舫?寞?嚗蝙??`run_migration.php` ?瑁??湔?瑞宏嚗???鋆銵??seed 瑼?嚗run_migration.php` 銝 seed嚗?

### 2. 閮剖??祆????

撱箇? `backend/config.local.php`嚗迨瑼?撌脣???`.gitignore`嚗???git嚗?

```php
<?php
// 靘?祆??啣?憛怠神嚗ppServ ?身撖Ⅳ?虜??12345678嚗AMPP ?身?箇征摮葡
define('DB_PASSWORD', '12345678');  // AppServ
// define('DB_PASSWORD', '');       // XAMPP

// 嚗憛恬?Google OAuth ??憛怠敺??/ 閮餃????整誑 Google 撣唾??餃????
// ?芸‵??????銝蔣??email / password ?餃
// define('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID.apps.googleusercontent.com');
```

> `backend/config.php` ??閮剖潛 AppServ嚗?蝣?`12345678`嚗雿輻 XAMPP嚗撖Ⅳ嚗??芷?撱箇?銝膩瑼?銝血?瘨?XAMPP ????釣閫??胯?

#### ? Google OAuth嚗憛恬?

1. ?? [Google Cloud Console](https://console.cloud.google.com/) ??OAuth 2.0 ?冽蝡???撱箇? **Web application** ?冽蝡胯?
2. ?具歇????JavaScript 靘????交璈??潛雯?嚗?憒?`http://localhost:8000`??
3. 撠?? Client ID 憛怠 `config.local.php` ??`GOOGLE_CLIENT_ID`??
4. 閮剖?摰?敺??餃?酉???Ｘ??芸?憿舐內 Google ??嚗閮剖??????箇??

### 3. 瑼Ｘ鞈?憭暹???
蝣箄?隞乩?鞈?憭曉??其??臬神?伐?
- `frontend/assets/uploads`
- `logs`

## ???孵?

### 銝?萄???Windows PowerShell嚗?

> **瘜冽?**嚗pwsh` ??PowerShell 7嚗??西?摰?嚗indows ?批遣??`powershell`嚗S5嚗?隢??批歇摰????祆?銝雿輻??

```powershell
# PowerShell 7嚗撌脣?鋆?
pwsh -File scripts/start-local-dev.ps1

# PowerShell 5嚗indows ?批遣嚗?
powershell -ExecutionPolicy Bypass -File scripts/start-local-dev.ps1
```

?迫嚗?

```powershell
# PowerShell 7
pwsh -File scripts/stop-local-dev.ps1

# PowerShell 5
powershell -ExecutionPolicy Bypass -File scripts/stop-local-dev.ps1
```

### ?孵?銝嚗ppServ / Apache嚗遣霅堆?

蝣箔?撠?雿 Web ?寧??嚗?仿???

```text
http://localhost/蝷曉?瘣餃?鞈?蝯望撟喳/frontend/index.html
```

### ?孵?鈭?PHP ?批遣?垢隡箸??剁?localhost:8000嚗?

```bash
cd frontend
php -S localhost:8000
```

?? `http://localhost:8000` ?喳??

?乩蝙?冽撘?嚗?蝡?API ????舐嚗?

1. Apache ??敺垢嚗http://localhost/蝷曉?瘣餃?鞈?蝯望撟喳/backend/api`
2. ?函???敺垢嚗?

```bash
cd backend
php -S localhost:8080
```

?亙??`localhost:8000` ??蝡舀??嚗??Ｘ?憿舐內雿???瘙?憭望???

## 皜祈岫撣唾?

- 蝞∠??∴?admin@univ.edu / Test123456
- 撟寥嚗lubadmin@univ.edu / Test123456
- 摮貊?嚗tudent@univ.edu / Test123456

## 撣貉???

### ?⊥????鞈?摨?
- 蝣箄? MySQL 撌脣???
- 蝣箄?撌脣遣蝡?`backend/config.local.php` 銝血‵?交迤蝣箏?蝣潘?AppServ: `12345678`嚗AMPP: 蝛箏?銝?`''`嚗?
- 蝣箄?鞈?摨怠?蝔望 `club_platform`

### ?瘝?璅??
- 瑼Ｘ `frontend/css/styles.css` ???刻楝敺?
- 蝣箄??桀???? `frontend/index.html` ??`frontend/pages/*`

### API ? 404
- 瑼Ｘ?垢 `main.js` ??API 頝臬?
- 蝣箄?敺垢鞈?憭曆???`backend/`
- ?亙?蝡臭蝙??`localhost:8000`嚗?蝣箄? Apache ??`localhost:8080` ?喳?銝蝔桀?蝡舀芋撘歇??

## ?賊??辣

- [README](README.md)
- [撠??脣漲](PROJECT_STATUS.md)
- [摰?蝮賜?](COMPLETION_REPORT.md)
- [皜祈岫?勗?](TESTING_REPORT.md)
- [??撽皜](tests/manual/user_story_acceptance_checklist.md)
- [??澆?蝝?(RELEASE_NOTES_2026-04-04.md)

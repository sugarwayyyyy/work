<?php
/**
 * 全站文字內容過濾器
 * 說明：集中管理不當字詞/垃圾訊息判斷，供各 API 共用。
 */

class ContentFilter {
    private static function toLower($text) {
        $value = (string)$text;
        if (function_exists('mb_strtolower')) {
            return mb_strtolower($value, 'UTF-8');
        }

        return strtolower($value);
    }

    private static function containsText($haystack, $needle) {
        if ($needle === '') {
            return false;
        }

        if (function_exists('mb_strpos')) {
            return mb_strpos($haystack, $needle, 0, 'UTF-8') !== false;
        }

        return strpos($haystack, $needle) !== false;
    }

    private static function getFilterRules() {
        static $rules = null;
        if ($rules === null) {
            $rules = require __DIR__ . '/review_filter_rules.php';
        }

        return $rules;
    }

    private static function normalizeForFilter($text) {
        $normalized = self::toLower((string)$text);
        $result = preg_replace('/[\s\p{P}\p{S}]+/u', '', $normalized);

        return $result === null ? $normalized : $result;
    }

    private static function isWhitelistedContext($normalizedText) {
        $rules = self::getFilterRules();
        $whitelist = $rules['whitelist'] ?? [];

        foreach ($whitelist as $term) {
            if (self::containsText($normalizedText, self::toLower((string)$term))) {
                return true;
            }
        }

        return false;
    }

    private static function containsProfanity($normalizedText) {
        $rules = self::getFilterRules();
        $patterns = $rules['profanity_patterns'] ?? [];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        return false;
    }

    private static function containsExtraBadWords($normalizedText) {
        $rules = self::getFilterRules();
        $badWords = $rules['extra_bad_words'] ?? [];

        foreach ($badWords as $word) {
            if (self::containsText($normalizedText, self::toLower((string)$word))) {
                return true;
            }
        }

        return false;
    }

    private static function containsSpamPattern($rawText, $normalizedText) {
        $raw = (string)$rawText;
        $rules = self::getFilterRules();
        $spamPatterns = $rules['spam_patterns'] ?? [];

        foreach ($spamPatterns as $pattern) {
            if (preg_match($pattern, $raw) === 1 || preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        if (preg_match('/(.)\1{8,}/u', $normalizedText) === 1) {
            return true;
        }

        return false;
    }

    private static function containsDangerousCommandPattern($rawText, $normalizedText) {
        $raw = (string)$rawText;

        $rawPatterns = [
            '/\brm\s+-[^\n\r;|&]*\b(?:rf|fr)\b/i',
            '/\bsudo\s+rm\b/i',
            '/\bdd\s+if\s*=\s*\/dev\/zero\b/i',
            '/\bmkfs(?:\.[a-z0-9_\-]+)?\b/i',
            '/:\(\)\s*\{\s*:\|:\&\s*\};:/',
            '/\brmdir\s+\/s\s+\/q\b/i',
            '/\b(?:del|erase)\s+\/[^\n\r]*\b(?:f|s|q)\b/i',
            '/\bformat\s+[a-z]:\b/i',
            '/\bremove-item\b[^\n\r]*(?:-recurse|-r)\b[^\n\r]*(?:-force|-f)\b/i',
            '/\b(?:curl|wget)\b[^\n\r]{0,200}\|\s*(?:sh|bash|zsh|pwsh|powershell)\b/i'
        ];

        foreach ($rawPatterns as $pattern) {
            if (preg_match($pattern, $raw) === 1) {
                return true;
            }
        }

        $normalizedPatterns = [
            '/rmrf/u',
            '/sudorm/u',
            '/ddifdevzero/u',
            '/rmdirsq/u',
            '/removeitemrecurseforce/u',
            '/curlsh|wgetsh/u'
        ];

        foreach ($normalizedPatterns as $pattern) {
            if (preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        return false;
    }

    public static function containsRestrictedLanguage($text) {
        $normalized = self::normalizeForFilter($text);

        if ($normalized === '') {
            return false;
        }

        // 優先攔截破壞性命令片段，避免注入式攻擊內容進入系統。
        if (self::containsDangerousCommandPattern($text, $normalized)) {
            return true;
        }

        if (self::isWhitelistedContext($normalized)) {
            return false;
        }

        if (self::containsProfanity($normalized)) {
            return true;
        }

        if (self::containsExtraBadWords($normalized)) {
            return true;
        }

        if (self::containsSpamPattern($text, $normalized)) {
            return true;
        }

        return false;
    }

    public static function containsRestrictedLanguageAllowingUrls($text) {
        $raw = (string)$text;
        if (trim($raw) === '') {
            return false;
        }

        $withoutUrls = preg_replace('/https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[\/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i', ' ', $raw);
        $withoutUrls = $withoutUrls === null ? $raw : $withoutUrls;

        if (preg_match('/https?:\/\/|www\./i', $withoutUrls) === 1) {
            return true;
        }

        return self::containsRestrictedLanguage($withoutUrls);
    }

    public static function isGoogleMapsUrl($text) {
        $raw = trim((string)$text);
        if ($raw === '') {
            return false;
        }

        return preg_match('/^https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[\/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)$/i', $raw) === 1;
    }

    public static function hasDangerousCommandPayload($value) {
        if (is_array($value)) {
            foreach ($value as $item) {
                if (self::hasDangerousCommandPayload($item)) {
                    return true;
                }
            }
            return false;
        }

        if (is_object($value)) {
            return self::hasDangerousCommandPayload((array)$value);
        }

        if (!is_scalar($value)) {
            return false;
        }

        $raw = trim((string)$value);
        if ($raw === '') {
            return false;
        }

        $normalized = self::normalizeForFilter($raw);
        return self::containsDangerousCommandPattern($raw, $normalized);
    }

    public static function hasRestrictedInFields($data, $fields) {
        foreach ($fields as $field) {
            if (!isset($data[$field])) {
                continue;
            }

            $value = trim((string)$data[$field]);
            if ($value === '') {
                continue;
            }

            if (self::containsRestrictedLanguage($value)) {
                return true;
            }
        }

        return false;
    }
}

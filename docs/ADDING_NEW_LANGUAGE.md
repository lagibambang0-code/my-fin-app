# Adding a New Language (Internationalization Guide)

This guide explains how to add and maintain languages in **Fin-App**.

---

## 1. Overview & Architecture

All language definitions, supported locales, and translation dictionaries are centralized in a single module:
```text
lib/i18n.ts
```

### Key Principles:
* **Fully Automatic UI Discovery**: Any language registered in `SUPPORTED_LANGUAGES` will **automatically appear** in the Language Settings UI (`/lainnya/pengaturan-bahasa`). You do **not** need to touch any UI component.
* **Safe Fallback Protection**: If an unregistered or corrupted language code is stored in `localStorage` or `IndexedDB`, the app will **never crash or show an error**. It automatically and silently falls back to the default language (`'id'` - Bahasa Indonesia).
* **Type-Safe Verification**: TypeScript enforces that every translation key existing in the default language must also be provided for any new language.

---

## 2. Step-by-Step: Adding a New Language

Suppose you want to add **Japanese (`ja`)** or **Spanish (`es`)**. You only need to edit **`lib/i18n.ts`** in 3 simple steps:

### Step 1: Add the Locale Code to `SupportedLocale`
Open `lib/i18n.ts` and add your ISO 639-1 language code to the union type:

```typescript
// lib/i18n.ts
export type SupportedLocale = 'id' | 'en' | 'ja' // <-- added 'ja'
```

---

### Step 2: Register Language Info in `SUPPORTED_LANGUAGES`
Add your language to the list of available languages. This is what users will see on the Language Settings screen:

```typescript
// lib/i18n.ts
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'id', name: 'Bahasa Indonesia', translator: 'Bawaan' },
  { code: 'en', name: 'English', translator: 'Default' },
  { code: 'ja', name: '日本語', translator: 'Community' }, // <-- added entry
]
```

* `code`: The locale code matching `SupportedLocale`.
* `name`: The display name of the language in its native script.
* `translator`: Credit note or translation status (e.g. `'Community'`, `'Official'`, or translator names).

---

### Step 3: Add Translation Dictionary to `TRANSLATIONS`
In the same file, add the translation object for your new locale under `TRANSLATIONS`:

```typescript
// lib/i18n.ts
export const TRANSLATIONS = {
  id: { ... },
  en: { ... },
  ja: {
    common: {
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      back: '戻る',
      edit: '編集',
      add: '追加',
      done: '完了',
      noData: 'データがありません',
      search: '検索',
      filter: 'フィルター',
      loading: '読み込み中...',
      confirm: 'はい',
      refuse: 'いいえ',
    },
    nav: {
      transaction: '取引',
      stats: '統計',
      asset: '資産',
      more: 'その他',
    },
    settings: {
      title: '設定・機能',
      general: '一般設定',
      swipe: 'スワイプ設定',
      password: 'パスコード',
      theme: 'テーマ',
      language: '言語設定',
      backup: 'バックアップ',
      tag: 'タグ管理',
      budget: '予算設定',
      repeat: '定期取引管理',
      incomeCategory: '収入カテゴリ管理',
      expenseCategory: '支出カテゴリ管理',
      manageAsset: '資産管理',
    },
    languageScreen: {
      title: '言語設定',
      subtitle: '使用するインターフェース言語を選択してください。',
    },
  },
} as const
```

---

## 3. How to Use Translations in React Components

To display translated text in any React component:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { getAppLanguage, TRANSLATIONS, type SupportedLocale } from '@/lib/i18n'

export function MyComponent() {
  const [lang, setLang] = useState<SupportedLocale>('id')

  useEffect(() => {
    void (async () => {
      const active = await getAppLanguage()
      setLang(active)
    })()
  }, [])

  const t = TRANSLATIONS[lang]

  return (
    <div>
      <h1>{t.nav.transaction}</h1>
      <button>{t.common.save}</button>
    </div>
  )
}
```

---

## 4. Verification

After adding your new language, you can verify your changes with the automated test suite:

```bash
npx tsc --noEmit
```

If any required translation key was missed, TypeScript compiler will immediately tell you the exact missing key.

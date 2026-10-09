# 弾き語りノート

ギター弾き語り用の Web アプリです。歌詞の文字ごとにコードとストロークパターンを置き、演奏画面で曲の長さに合わせて自動スクロールします。

## 使い方

```bash
npm install
npm run dev   # http://localhost:3000
```

## 画面

- `/` 曲一覧（新規作成・編集・削除）
- `/edit/[id]` 編集（タイトル・歌詞・曲の長さ・カポ／歌詞の文字をタップしてコードとストロークを配置）
- `/play/[id]` 演奏（自動スクロール、コードをタップで押さえ方を表示）

## 構成

```
src/app/page.tsx              曲一覧
src/app/edit/[id]/page.tsx    編集画面
src/app/play/[id]/page.tsx    演奏画面
src/components/LyricsSheet    歌詞＋コード＋ストロークの表示（文字の真下にコードを揃える）
src/components/ChordPicker    コード・ストローク選択のボトムシート
src/components/ChordDiagram   コードダイアグラム（SVG）
src/components/DiagramPopup   演奏中の押さえ方ポップアップ
src/lib/chords.ts             押さえ方データ（定番オープンコード＋Eフォーム/Aフォームから生成）
src/lib/storage.ts            localStorage への保存
src/lib/useAutoScroll.ts      自動スクロール
```

## メモ

- データはブラウザの localStorage に保存されます（端末・ブラウザごと）。
- スクロール位置 = 経過時間 ÷ 曲の長さ ×（全体の高さ − 画面の高さ）。曲の終わりで最後の行が画面下端に届きます。
- 再生中・停止中に手でスクロールすると、その位置から再生が続きます。

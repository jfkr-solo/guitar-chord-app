export type PlacedChord = {
  /** 歌詞の行番号（0始まり） */
  line: number;
  /** 行内の文字位置（0始まり） */
  index: number;
  /** コード名（例: "Am", "G7"） */
  chord: string;
  /** ストロークパターン（例: "↓↓↑↑↓↑"） */
  stroke: string;
};

export type Song = {
  id: string;
  title: string;
  lyrics: string;
  /** 曲の長さ（秒） */
  duration: number;
  capo: number;
  chords: PlacedChord[];
  updatedAt: number;
};

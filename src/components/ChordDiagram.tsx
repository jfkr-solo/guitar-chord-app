import { getChordShape } from "@/lib/chords";

const FRET_COUNT = 5;

type Props = { name: string; size?: number };

/** 6弦 × 5フレットのコードダイアグラム（左が6弦、右が1弦） */
export default function ChordDiagram({ name, size = 180 }: Props) {
  const shape = getChordShape(name);
  if (!shape) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-gray-400" style={{ width: size }}>
        <span className="text-2xl font-bold text-white">{name}</span>
        押さえ方データがありません
      </div>
    );
  }

  const pressed = shape.frets.filter((f) => f > 0);
  const maxFret = pressed.length ? Math.max(...pressed) : 0;
  const minFret = pressed.length ? Math.min(...pressed) : 0;
  const baseFret = maxFret <= FRET_COUNT ? 1 : minFret;

  const width = 120;
  const height = 150;
  const left = 22;
  const right = width - 14;
  const top = 34;
  const bottom = height - 10;
  const stringGap = (right - left) / 5;
  const fretGap = (bottom - top) / FRET_COUNT;
  const xOf = (stringIdx: number) => left + stringIdx * stringGap; // 0 = 6弦
  const yOf = (fret: number) => top + (fret - baseFret + 0.5) * fretGap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={(size * height) / width}
      role="img"
      aria-label={`${name} のコードダイアグラム`}
    >
      {/* ナット or 開始フレット番号 */}
      {baseFret === 1 ? (
        <rect x={left - 1} y={top - 4} width={right - left + 2} height={4} fill="#f3f4f6" />
      ) : (
        <text x={left - 6} y={top + fretGap * 0.5 + 4} fontSize={10} textAnchor="end" fill="#9ca3af">
          {baseFret}
        </text>
      )}

      {/* フレット線 */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left} x2={right} y1={top + i * fretGap} y2={top + i * fretGap} stroke="#6b7280" strokeWidth={1} />
      ))}
      {/* 弦 */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={xOf(i)} x2={xOf(i)} y1={top} y2={bottom} stroke="#9ca3af" strokeWidth={1 + (5 - i) * 0.2} />
      ))}

      {/* 開放弦 ○ / ミュート × */}
      {shape.frets.map((f, i) => {
        const x = xOf(i);
        const y = top - 13;
        if (f === 0) return <circle key={`o${i}`} cx={x} cy={y} r={4.5} fill="none" stroke="#f3f4f6" strokeWidth={1.4} />;
        if (f < 0)
          return (
            <g key={`x${i}`} stroke="#f87171" strokeWidth={1.6}>
              <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} />
              <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} />
            </g>
          );
        return null;
      })}

      {/* セーハ */}
      {shape.barres.map((b, i) => {
        const x1 = xOf(6 - b.fromString);
        const x2 = xOf(6 - b.toString);
        return (
          <rect key={`b${i}`} x={x1 - 7} y={yOf(b.fret) - 7} width={x2 - x1 + 14} height={14} rx={7} fill="#f59e0b" />
        );
      })}

      {/* 押さえる位置と指番号 */}
      {shape.frets.map((f, i) => {
        if (f <= 0) return null;
        const inBarre = shape.barres.some(
          (b) => b.fret === f && 6 - i <= b.fromString && 6 - i >= b.toString,
        );
        const finger = shape.fingers[i];
        if (inBarre && finger === 1) {
          return null;
        }
        return (
          <g key={`d${i}`}>
            <circle cx={xOf(i)} cy={yOf(f)} r={7} fill="#f59e0b" />
            {finger > 0 && (
              <text x={xOf(i)} y={yOf(f) + 3.5} fontSize={10} fontWeight={700} textAnchor="middle" fill="#111827">
                {finger}
              </text>
            )}
          </g>
        );
      })}
      {/* セーハの指番号 */}
      {shape.barres.map((b, i) => (
        <text key={`bt${i}`} x={xOf(6 - b.fromString)} y={yOf(b.fret) + 3.5} fontSize={10} fontWeight={700} textAnchor="middle" fill="#111827">
          {shape.fingers[6 - b.fromString] || 1}
        </text>
      ))}
    </svg>
  );
}

export interface ScorePoint {
    coding: number;
    communication: number;
}

// Dependency-free SVG line chart of scores over time (oldest → newest).
export default function ScoreChart({ data }: { data: ScorePoint[] }) {
    const W = 640;
    const H = 240;
    const padX = 34;
    const padY = 22;
    const MAX = 10;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const n = data.length;

    const x = (i: number) => (n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW);
    const y = (v: number) => padY + innerH - (Math.max(0, Math.min(MAX, v)) / MAX) * innerH;

    const polyline = (pick: (p: ScorePoint) => number) =>
        data.map((d, i) => `${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(' ');

    const area = (pick: (p: ScorePoint) => number) =>
        `${x(0).toFixed(1)},${y(0).toFixed(1)} ${polyline(pick)} ${x(n - 1).toFixed(1)},${y(0).toFixed(1)}`;

    return (
        <svg className="score-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Scores over time">
            <defs>
                <linearGradient id="codFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="comFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5e9dff" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#5e9dff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* horizontal grid + axis labels */}
            {[0, 5, 10].map((v) => (
                <g key={v}>
                    <line className="chart-grid" x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} />
                    <text className="chart-axis" x={padX - 8} y={y(v) + 4} textAnchor="end">{v}</text>
                </g>
            ))}

            {/* area fills (only meaningful with 2+ points) */}
            {n > 1 && (
                <>
                    <polygon points={area((d) => d.communication)} fill="url(#comFill)" />
                    <polygon points={area((d) => d.coding)} fill="url(#codFill)" />
                </>
            )}

            {/* series */}
            <polyline className="chart-line comm" points={polyline((d) => d.communication)} />
            <polyline className="chart-line coding" points={polyline((d) => d.coding)} />

            {/* points */}
            {data.map((d, i) => (
                <circle key={`comm-${i}`} className="chart-dot comm" cx={x(i)} cy={y(d.communication)} r={3.5} />
            ))}
            {data.map((d, i) => (
                <circle key={`cod-${i}`} className="chart-dot coding" cx={x(i)} cy={y(d.coding)} r={3.5} />
            ))}
        </svg>
    );
}

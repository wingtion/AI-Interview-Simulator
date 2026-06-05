import { useEffect, useState } from 'react';

// Animates a number from 0 up to `value` on mount (easeOutCubic).
export default function CountUp({
    value,
    decimals = 0,
    duration = 850,
}: {
    value: number;
    decimals?: number;
    duration?: number;
}) {
    const [n, setN] = useState(0);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setN(value);
            return;
        }
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(value * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
            else setN(value);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, duration]);

    return <>{decimals ? n.toFixed(decimals) : Math.round(n)}</>;
}

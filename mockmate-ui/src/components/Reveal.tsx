import { useEffect, useRef, useState } from 'react';

// Fades its children up into view the first time they enter the viewport.
// Add a `stagger` class to a grid/list child to cascade its items.
export default function Reveal({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`}>
            {children}
        </div>
    );
}

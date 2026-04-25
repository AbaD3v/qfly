import { useEffect, useRef } from 'react';
import { load } from '@2gis/mapgl';

const CENTER: [number, number] = [71.446, 51.1801]; // В 2GIS сначала [lon, lat]!

// Функция для расчета точек дуги (параболическая траектория)
function calculateArcPoints(
    start: [number, number],
    end: [number, number],
    maxAltitude: number = 200,
    points: number = 100
): Array<[number, number, number]> {
    const result: Array<[number, number, number]> = [];
    
    for (let i = 0; i <= points; i++) {
        const t = i / points; // 0 to 1
        // Линейная интерполяция по долготе и широте
        const lon = start[0] + (end[0] - start[0]) * t;
        const lat = start[1] + (end[1] - start[1]) * t;
        // Параболическая траектория для высоты (максимум в середине)
        const alt = maxAltitude * 4 * t * (1 - t);
        result.push([lon, lat, alt]);
    }
    
    return result;
}

export default function DeliveryMap3D() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const droneMarkerRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        let map: any;
        load().then((mapgl) => {
            if (!mapContainerRef.current) return;

            map = new mapgl.Map(mapContainerRef.current, {
                center: CENTER,
                zoom: 14,
                pitch: 45,
                rotation: 30,
                key: process.env.NEXT_PUBLIC_2GIS_API_KEY,
                style: 'c080bb6a-0ad1-4d34-bd43-9829f04ef050',
            });

            // Добавляем маркер Хаба
            new mapgl.HtmlMarker(map, {
                coordinates: CENTER,
                html: `
                    <div class="relative flex items-center justify-center w-10 h-10">
                        <div class="absolute inset-0 bg-sky-400 rounded-full animate-ping opacity-25"></div>
                        <div class="w-4 h-4 bg-sky-500 border-2 border-white rounded-full z-10 shadow-[0_0_15px_rgba(56,189,248,0.6)]"></div>
                    </div>
                `,
            });

            // Точка назначения для демо (примерно в 3км от центра)
            const destination: [number, number] = [71.55, 51.1];

            // Создаем маркер дрона
            droneMarkerRef.current = new mapgl.HtmlMarker(map, {
                coordinates: CENTER,
                html: `
                    <div class="relative flex items-center justify-center w-6 h-6 transition-transform">
                        <div class="w-3 h-3 bg-primary rounded-full shadow-[0_0_12px_rgba(56,189,248,1)]"></div>
                        <div class="absolute w-5 h-5 border border-primary/50 rounded-full animate-pulse"></div>
                    </div>
                `,
            });

            // Рассчитываем точки дуги
            const arcPoints = calculateArcPoints(CENTER, destination, 300, 150);
            let currentFrame = 0;

            // Функция анимации дрона
            const animateDrone = () => {
                if (currentFrame < arcPoints.length) {
                    const [lon, lat, alt] = arcPoints[currentFrame];
                    
                    // Обновляем позицию маркера
                    droneMarkerRef.current?.setCoordinates([lon, lat]);
                    
                    // Эффект высоты через translateY
                    const droneElement = droneMarkerRef.current?.element;
                    if (droneElement) {
                        droneElement.style.transform = `translateY(-${alt * 0.5}px)`;
                        droneElement.style.filter = `drop-shadow(0 ${alt * 0.3}px ${20 + alt * 0.1}px rgba(56,189,248,${0.4 + alt / 1000}))`;
                    }
                    
                    currentFrame++;
                    animationFrameRef.current = requestAnimationFrame(animateDrone);
                } else {
                    // Анимация завершена, повторяем через 2 секунды
                    setTimeout(() => {
                        currentFrame = 0;
                        animationFrameRef.current = requestAnimationFrame(animateDrone);
                    }, 2000);
                }
            };

            // Запускаем анимацию после небольшой задержки
            setTimeout(() => {
                animationFrameRef.current = requestAnimationFrame(animateDrone);
            }, 500);
        });

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // map && map.destroy(); // Закомментировано для Debug
        };
    }, []);

    return (
        <div className="relative w-full h-[500px] rounded-3xl overflow-hidden border border-white/10 glass-card">
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            
            {/* Overlay интерфейса радара */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-background/80 backdrop-blur-md border border-primary/20 p-3 rounded-xl font-mono">
                    <p className="text-[10px] text-primary animate-pulse">● 3D_RENDERING_ACTIVE</p>
                    <p className="text-[10px] text-slate-500">DRONE_FLIGHT_SIMULATION</p>
                </div>
            </div>
        </div>
    );
}
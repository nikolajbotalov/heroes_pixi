/**
 * Гексагональная координата (axial coordinate system: q, r)
 * Третья координата s выводится как s = -q - r
 */
export interface Hex {
    q: number;
    r: number;
}

/**
 * Константы для гексагональной сетки
 */
export const HEX_SIZE = 30; // Радиус гекса
export const HEX_ANGLE = Math.PI / 6; // 30 градусов

/**
 * Получить координату s из q и r
 */
export function hexS(hex: Hex): number {
    return -hex.q - hex.r;
}

/**
 * Сложить два гекса
 */
export function hexAdd(a: Hex, b: Hex): Hex {
    return { q: a.q + b.q, r: a.r + b.r };
}

/**
 * Умножить гекс на скаляр
 */
export function hexScale(hex: Hex, factor: number): Hex {
    return { q: hex.q * factor, r: hex.r * factor };
}

/**
 * Направления соседних гексов (pointy-top)
 */
export const HEX_DIRECTIONS: Hex[] = [
    { q: 0, r: -1 },
    { q: 1, r: -1 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
];

/**
 * Получить соседние гексы
 */
export function hexNeighbors(hex: Hex): Hex[] {
    return HEX_DIRECTIONS.map(dir => hexAdd(hex, dir));
}

/**
 * Расстояние между гексами (в шагах)
 */
export function hexDistance(a: Hex, b: Hex): number {
    const s = (h: Hex) => hexS(h);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(s(a) - s(b))) / 2;
}

/**
 * Преобразовать гексагональные координаты в экранные (пиксельные)
 * Pointy-top orientation
 */
export function hexToPixel(hex: Hex, size: number = HEX_SIZE): { x: number; y: number } {
    const x = size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = size * ((3 / 2) * hex.r);
    return { x, y };
}

/**
 * Преобразовать экранные координаты в гексагональные
 */
export function pixelToHex(x: number, y: number, size: number = HEX_SIZE): Hex {
    const q = (Math.sqrt(3) / 3 * x - y / 3) / size;
    const r = (2 / 3 * y) / size;
    return hexRound(q, r);
}

/**
 * Округлить дробные гексагональные координаты до ближайшего целого гекса
 */
function hexRound(q: number, r: number): Hex {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
    } else if (rDiff > sDiff) {
        rr = -rq - rs;
    }

    return { q: rq, r: rr };
}

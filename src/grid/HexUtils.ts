import {
  Hex,
  hexNeighbors,
  hexDistance,
  HEX_SIZE,
  hexToPixel,
} from "../types/hex";

/**
 * Проверка, находится ли гекс в пределах игрового поля
 */
function isHexInBounds(
  hex: Hex,
  gridWidth: number,
  gridHeight: number,
): boolean {
  const { q, r } = hex;
  const rOffset = Math.floor(r / 2);
  const minQ = -rOffset;
  const maxQ = gridWidth - rOffset - 1;

  return r >= 0 && r < gridHeight && q >= minQ && q <= maxQ;
}

/**
 * Получить все гексы в пределах заданного расстояния (range) от начального гекса
 * Используется для определения достижимых гексов на основе скорости существа
 * Ограничивает результат пределами игрового поля
 */
export function getHexesInRange(
  hex: Hex,
  range: number,
  occupiedHexes: Set<string>,
  gridWidth: number,
  gridHeight: number,
): Hex[] {
  const reachable: Hex[] = [];
  const visited = new Set<string>();
  const queue: Array<{ hex: Hex; dist: number }> = [{ hex, dist: 0 }];

  const key = (h: Hex) => `${h.q},${h.r}`;
  visited.add(key(hex));

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Не включаем начальный гекс
    if (current.dist > 0 && current.dist <= range) {
      if (
        !occupiedHexes.has(key(current.hex)) &&
        isHexInBounds(current.hex, gridWidth, gridHeight)
      ) {
        reachable.push(current.hex);
      }
    }

    // Если достигли максимального расстояния — не продолжаем
    if (current.dist >= range) continue;

    // Проверяем всех соседей
    const neighbors = hexNeighbors(current.hex);
    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({ hex: neighbor, dist: current.dist + 1 });
      }
    }
  }

  return reachable;
}

/**
 * Проверить, находится ли гекс в пределах досягаемости
 */
export function isHexReachable(
  from: Hex,
  to: Hex,
  maxRange: number,
  occupiedHexes: Set<string>,
): boolean {
  if (hexDistance(from, to) > maxRange) return false;
  if (occupiedHexes.has(`${to.q},${to.r}`)) return false;
  if (from.q === to.q && from.r === to.r) return false;
  return true;
}

/**
 * Найти кратчайший путь между двумя гексами (BFS)
 * Возвращает массив гексов от start до end (включительно)
 */
export function findPath(
  start: Hex,
  end: Hex,
  occupiedHexes: Set<string>,
  maxRange: number,
): Hex[] | null {
  const key = (h: Hex) => `${h.q},${h.r}`;
  const visited = new Set<string>();
  const parent = new Map<string, Hex>();
  const queue: Hex[] = [start];

  visited.add(key(start));

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Если достигли цели
    if (current.q === end.q && current.r === end.r) {
      // Восстанавливаем путь
      const path: Hex[] = [];
      let currentKey = key(end);
      while (currentKey !== key(start)) {
        const h = parseHexKey(currentKey);
        path.unshift(h);
        const p = parent.get(currentKey);
        if (!p) break;
        currentKey = key(p);
      }
      path.unshift(start);
      return path;
    }

    // Если превысили максимальную дистанцию
    if (hexDistance(start, current) >= maxRange) continue;

    const neighbors = hexNeighbors(current);
    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor);
      if (!visited.has(neighborKey) && !occupiedHexes.has(neighborKey)) {
        visited.add(neighborKey);
        parent.set(neighborKey, current);
        queue.push(neighbor);
      }
    }
  }

  return null; // Путь не найден
}

/**
 * Распарсить ключ гекса обратно в объект Hex
 */
function parseHexKey(key: string): Hex {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

/**
 * Найти путь перемещения существа от start до end
 * Возвращает массив точек {hex, x, y} для каждого шага анимации
 *
 * @param start - начальный гекс
 * @param end - конечный гекс
 * @param occupiedHexes - множество занятых гексов (кроме start)
 * @param maxRange - максимальная дальность перемещения (скорость существа)
 * @param hexSize - размер гекса для конвертации в пиксели
 * @returns Массив точек для анимации или null если путь недостижим
 */
export function findHexStepPath(
  start: Hex,
  end: Hex,
  occupiedHexes: Set<string>,
  maxRange: number,
  hexSize: number = HEX_SIZE,
): Array<{ hex: Hex; x: number; y: number }> | null {
  // Проверяем, что конечная точка в пределах досягаемости
  const distance = hexDistance(start, end);
  if (distance > maxRange) {
    return null;
  }

  // Если начальная и конечная точки совпадают
  if (start.q === end.q && start.r === end.r) {
    const pixel = hexToPixel(start, hexSize);
    return [{ hex: start, x: pixel.x, y: pixel.y }];
  }

  // Ищем путь через BFS
  const path = findPath(start, end, occupiedHexes, maxRange);
  if (!path) {
    return null;
  }

  // Конвертируем путь в массив точек для анимации
  return path.map((hex) => {
    const pixel = hexToPixel(hex, hexSize);
    return { hex, x: pixel.x, y: pixel.y };
  });
}

/**
 * Найти соседние гексы вокруг целевого, которые не заняты и в пределах поля
 * Возвращает массив гексов, на которые можно встать для атаки цели
 */
export function findAttackPositions(
  targetHex: Hex,
  occupiedHexes: Set<string>,
  gridWidth?: number,
  gridHeight?: number,
): Hex[] {
  const key = (h: Hex) => `${h.q},${h.r}`;
  const positions: Hex[] = [];

  const neighbors = hexNeighbors(targetHex);
  for (const neighbor of neighbors) {
    if (!occupiedHexes.has(key(neighbor))) {
      // Проверяем границы поля
      if (gridWidth !== undefined && gridHeight !== undefined) {
        if (isHexInBounds(neighbor, gridWidth, gridHeight)) {
          positions.push(neighbor);
        }
      } else {
        positions.push(neighbor);
      }
    }
  }

  return positions;
}

/**
 * Найти ближайший гекс для атаки к цели, достижимый за указанное расстояние
 * Использует BFS для поиска пути к ближайшей позиции атаки
 * Возвращает null если цель недоступна для атаки за один ход
 */
export function findNearestAttackHex(
  from: Hex,
  targetHex: Hex,
  maxRange: number,
  occupiedHexes: Set<string>,
  gridWidth?: number,
  gridHeight?: number,
): Hex | null {
  const key = (h: Hex) => `${h.q},${h.r}`;

  // Получаем все позиции для атаки (соседние с целью, не занятые, в пределах поля)
  const attackPositions = findAttackPositions(
    targetHex,
    occupiedHexes,
    gridWidth,
    gridHeight,
  );
  if (attackPositions.length === 0) return null;

  // BFS от начальной позиции до любой из позиций атаки
  const visited = new Set<string>();
  const queue: Array<{ hex: Hex; dist: number }> = [{ hex: from, dist: 0 }];
  visited.add(key(from));

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Проверяем, является ли текущий гекс позицией для атаки
    for (const attackPos of attackPositions) {
      if (current.hex.q === attackPos.q && current.hex.r === attackPos.r) {
        return attackPos;
      }
    }

    // Если достигли максимального расстояния — не продолжаем этот путь
    if (current.dist >= maxRange) continue;

    const neighbors = hexNeighbors(current.hex);
    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor);

      // Проверяем границы
      if (
        gridWidth !== undefined &&
        gridHeight !== undefined &&
        !isHexInBounds(neighbor, gridWidth, gridHeight)
      ) {
        continue;
      }

      if (!visited.has(neighborKey) && !occupiedHexes.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({ hex: neighbor, dist: current.dist + 1 });
      }
    }
  }

  return null;
}

/**
 * Найти лучший свободный гекс в направлении цели
 * (в пределах скорости, ближе всего к цели)
 */
export function findHexTowardsTarget(
  from: Hex,
  targetHex: Hex,
  maxRange: number,
  occupiedHexes: Set<string>,
  gridWidth?: number,
  gridHeight?: number,
): Hex | null {
  const key = (h: Hex) => `${h.q},${h.r}`;
  const visited = new Set<string>();
  const queue: Array<{ hex: Hex; dist: number }> = [{ hex: from, dist: 0 }];
  visited.add(key(from));

  let bestHex: Hex | null = null;
  let bestDistance = hexDistance(from, targetHex);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const distToTarget = hexDistance(current.hex, targetHex);

    // Обновляем лучший гекс (ближе к цели, свободный)
    if (distToTarget < bestDistance && !occupiedHexes.has(key(current.hex))) {
      bestDistance = distToTarget;
      bestHex = current.hex;
    }

    if (current.dist >= maxRange) continue;

    const neighbors = hexNeighbors(current.hex);
    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor);

      if (
        gridWidth !== undefined &&
        gridHeight !== undefined &&
        !isHexInBounds(neighbor, gridWidth, gridHeight)
      ) {
        continue;
      }

      if (!visited.has(neighborKey) && !occupiedHexes.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({ hex: neighbor, dist: current.dist + 1 });
      }
    }
  }

  return bestHex;
}

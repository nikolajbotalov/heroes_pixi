import { CreatureStack } from "../entities/CreatureStack";
import { BattleManager } from "../core/BattleManager";
import { ActionManager } from "../core/ActionManager";
import { DamageCalculator } from "../combat/DamageCalculator";
import { Hex } from "../types/hex";
import { findNearestAttackHex } from "../grid/HexUtils";
import { hexDistance, hexNeighbors } from "../types/hex";

/**
 * SimpleAI — базовый AI для компьютерного игрока
 *
 * Логика принятия решений:
 * 1. Если есть враги в радиусе атаки после перемещения — атаковать ближайшего/слабейшего
 * 2. Если враги далеко — переместиться к ближайшему врагу
 * 3. Если нет хороших ходов — защищаться
 * 4. Если выгодно — ожидать (переместиться в конец очереди)
 */
export class SimpleAI {
  private battleManager: BattleManager;
  private actionManager: ActionManager;
  private gridWidth: number;
  private gridHeight: number;

  constructor(
    battleManager: BattleManager,
    gridWidth: number,
    gridHeight: number,
  ) {
    this.battleManager = battleManager;
    this.actionManager = battleManager.getActionManager();
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
  }

  /**
   * Выполнить полный ход AI для текущего стека
   * Автоматически выбирает лучшее действие и выполняет его
   */
  executeTurn(stack: CreatureStack, onComplete?: () => void): void {
    const creature = stack.getCreature();

    // Получаем все стеки
    const allStacks = this.battleManager.getAllStacks();
    const enemyStacks = allStacks.filter(
      (s) => s.getCreature().isAttacker !== creature.isAttacker,
    );

    // Если нет врагов — защищаться
    if (enemyStacks.length === 0) {
      this.defend(stack, onComplete);
      return;
    }

    // --- 1. Атака без перемещения (враг уже рядом) ---
    const adjacentEnemy = this.findAdjacentEnemy(stack, enemyStacks);
    if (adjacentEnemy) {
      this.attackTarget(stack, adjacentEnemy, onComplete);
      return;
    }

    // --- 2. Перемещение + атака (можно дойти и ударить за один ход) ---
    if (this.actionManager.canMove(stack)) {
      const moveAndAttackResult = this.findMoveAndAttackTarget(
        stack,
        enemyStacks,
      );

      if (moveAndAttackResult) {
        this.moveAndAttack(
          stack,
          moveAndAttackResult.targetHex,
          moveAndAttackResult.targetStack,
          onComplete,
        );
        return;
      }
    }

    // --- 3. Если уже переместились — защищаемся ---
    const actionState = this.actionManager.getActionState(stack);
    if (actionState?.hasMoved) {
      this.defend(stack, onComplete);
      return;
    }

    // --- 4. Движение к ближайшему врагу (всегда, если не можем атаковать) ---
    const nearestEnemy = this.findNearestEnemy(stack, enemyStacks);
    if (nearestEnemy) {
      this.moveToEnemy(stack, nearestEnemy, onComplete);
      return;
    }

    // --- 5. Нечего делать — защищаемся ---
    this.defend(stack, onComplete);
  }

  /**
   * Найти врага на соседнем гексе (для ближнего боя)
   */
  private findAdjacentEnemy(
    stack: CreatureStack,
    enemyStacks: CreatureStack[],
  ): CreatureStack | null {
    const currentHex = stack.getHex();

    for (const enemy of enemyStacks) {
      const enemyHex = enemy.getHex();
      if (hexDistance(currentHex, enemyHex) <= 1) {
        return enemy;
      }
    }

    return null;
  }

  /**
   * Найти ближайшего врага (для перемещения)
   */
  private findNearestEnemy(
    stack: CreatureStack,
    enemyStacks: CreatureStack[],
  ): CreatureStack | null {
    const currentHex = stack.getHex();
    let nearest: CreatureStack | null = null;
    let minDistance = Infinity;

    for (const enemy of enemyStacks) {
      const distance = hexDistance(currentHex, enemy.getHex());
      if (distance < minDistance) {
        minDistance = distance;
        nearest = enemy;
      }
    }

    return nearest;
  }

  /**
   * Найти возможность переместиться и атаковать
   */
  private findMoveAndAttackTarget(
    stack: CreatureStack,
    enemyStacks: CreatureStack[],
  ): { targetHex: Hex; targetStack: CreatureStack } | null {
    const creature = stack.getCreature();
    const currentHex = stack.getHex();
    const occupiedHexes = this.battleManager.getOccupiedHexes(stack);
    const speed = creature.config.speed;

    let bestResult: { targetHex: Hex; targetStack: CreatureStack } | null =
      null;
    let bestScore = -Infinity;

    for (const enemy of enemyStacks) {
      const enemyHex = enemy.getHex();

      // Находим ближайший гекс для атаки
      const attackHex = findNearestAttackHex(
        currentHex,
        enemyHex,
        speed,
        occupiedHexes,
        this.gridWidth,
        this.gridHeight,
      );

      if (!attackHex) continue;

      // Оцениваем этот ход
      const distanceToAttack = hexDistance(currentHex, attackHex);
      const enemyCreature = enemy.getCreature();
      const hpRatio =
        enemyCreature.currentHp /
        (enemyCreature.config.health * enemyCreature.count);

      // Приоритет: ближе к цели + слабый враг
      const score = 10 - distanceToAttack + (1 - hpRatio) * 5;

      if (score > bestScore) {
        bestScore = score;
        bestResult = { targetHex: attackHex, targetStack: enemy };
      }
    }

    return bestResult;
  }

  /**
   * Выполнить атаку цели
   */
  private attackTarget(
    attacker: CreatureStack,
    target: CreatureStack,
    onComplete?: () => void,
  ): void {
    // Получаем модификатор защиты
    const defenseModifier = this.actionManager.getDefenseModifier(target);

    // Рассчитываем урон
    const damageResult = DamageCalculator.calculateDamage(
      attacker.getCreature(),
      target.getCreature(),
      defenseModifier,
    );

    // Применяем урон
    this.battleManager.applyDamage(
      target,
      damageResult.finalDamage,
      damageResult.killed,
    );

    // Отмечаем действие
    this.actionManager.markActed(attacker);

    // Завершаем ход с небольшой задержкой
    setTimeout(() => {
      this.battleManager.endTurn(attacker);
      onComplete?.();
    }, 500);
  }

  /**
   * Переместиться и атаковать
   */
  private moveAndAttack(
    stack: CreatureStack,
    targetHex: Hex,
    targetStack: CreatureStack,
    onComplete?: () => void,
  ): void {
    // Перемещаемся
    this.battleManager.moveStack(stack, targetHex, () => {
      this.actionManager.markMoved(stack);

      // Атакуем после перемещения
      setTimeout(() => {
        this.attackTarget(stack, targetStack, onComplete);
      }, 200);
    });
  }

  /**
   * Переместиться к врагу (без атаки)
   * Если может дойти до позиции атаки — идёт туда.
   * Иначе — двигается в сторону врага на максимальное расстояние.
   */
  private moveToEnemy(
    stack: CreatureStack,
    enemy: CreatureStack,
    onComplete?: () => void,
  ): void {
    const creature = stack.getCreature();
    const currentHex = stack.getHex();
    const enemyHex = enemy.getHex();
    const occupiedHexes = this.battleManager.getOccupiedHexes(stack);
    const speed = creature.config.speed;

    // Ищем лучший гекс: позиция атаки или просто ближе к врагу
    let targetHex = findNearestAttackHex(
      currentHex,
      enemyHex,
      speed,
      occupiedHexes,
      this.gridWidth,
      this.gridHeight,
    );

    if (!targetHex) {
      // Не можем дойти до позиции атаки — двигаемся в сторону врага
      targetHex = this.findBestApproachHex(
        currentHex,
        enemyHex,
        speed,
        occupiedHexes,
      );
    }

    if (targetHex) {
      this.moveToHex(stack, targetHex, onComplete);
    } else {
      this.defend(stack, onComplete);
    }
  }

  /**
   * Найти лучший свободный гекс в направлении цели
   * (максимально близко к цели, в пределах скорости)
   */
  private findBestApproachHex(
    from: Hex,
    targetHex: Hex,
    speed: number,
    occupiedHexes: Set<string>,
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

      if (distToTarget < bestDistance) {
        bestDistance = distToTarget;
        bestHex = current.hex;
      }

      if (current.dist >= speed) continue;

      for (const neighbor of hexNeighbors(current.hex)) {
        const neighborKey = key(neighbor);
        if (
          !visited.has(neighborKey) &&
          !occupiedHexes.has(neighborKey) &&
          this.isHexInBounds(neighbor)
        ) {
          visited.add(neighborKey);
          queue.push({ hex: neighbor, dist: current.dist + 1 });
        }
      }
    }

    return bestHex;
  }

  /**
   * Проверка границы поля
   */
  private isHexInBounds(hex: Hex): boolean {
    const { q, r } = hex;
    const rOffset = Math.floor(r / 2);
    const minQ = -rOffset;
    const maxQ = this.gridWidth - rOffset - 1;
    return r >= 0 && r < this.gridHeight && q >= minQ && q <= maxQ;
  }

  /**
   * Переместиться на указанный гекс и завершить ход
   */
  private moveToHex(
    stack: CreatureStack,
    targetHex: Hex,
    onComplete?: () => void,
  ): void {
    this.battleManager.moveStack(stack, targetHex, () => {
      this.actionManager.markMoved(stack);
      // После перемещения завершаем ход
      setTimeout(() => {
        this.battleManager.endTurn(stack);
        onComplete?.();
      }, 300);
    });
  }

  /**
   * Выполнить защиту
   */
  private defend(stack: CreatureStack, onComplete?: () => void): void {
    this.battleManager.defend(stack);
    setTimeout(() => {
      onComplete?.();
    }, 1200);
  }
}

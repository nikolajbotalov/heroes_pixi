import * as PIXI from "pixi.js";
import { Hex } from "../types/hex";
import { CreatureStack } from "../entities/CreatureStack";
import { BattleManager } from "../core/BattleManager";
import { HexHighlight } from "./HexHighlight";
import { AttackHighlight } from "../ui/AttackHighlight";
import { DamageDisplay } from "../ui/DamageDisplay";
import { DamageCalculator } from "../combat/DamageCalculator";
import { hexDistance } from "../types/hex";
import { getHexesInRange, findNearestAttackHex } from "./HexUtils";

/**
 * HexGridInteraction обрабатывает взаимодействие с гексагональной сеткой
 * - Клик по пустому гексу (снять выделение)
 * - Подсветка доступных гексов
 * - Клик по подсвеченному гексу (перемещение)
 * - Подсветка целей атаки
 * - Клик по врагу (атака)
 */
export class HexGridInteraction extends PIXI.Container {
  private battleManager: BattleManager;
  private hexHighlight: HexHighlight;
  private attackHighlight: AttackHighlight;
  private damageDisplay: DamageDisplay;
  private gridWidth: number;
  private gridHeight: number;
  private meleeRange: number = 1; // Радиус ближнего боя
  private rangedRange: number = 10; // Радиус дальнего боя (условно большое число)
  // Стеки, которые можно атаковать за один ход (переместиться + атаковать)
  private moveAttackTargets: Set<string> = new Set();
  private interactionEnabled: boolean = true;

  constructor(
    battleManager: BattleManager,
    hexHighlight: HexHighlight,
    attackHighlight: AttackHighlight,
    damageDisplay: DamageDisplay,
    gridWidth: number,
    gridHeight: number,
  ) {
    super();
    this.battleManager = battleManager;
    this.hexHighlight = hexHighlight;
    this.attackHighlight = attackHighlight;
    this.damageDisplay = damageDisplay;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    this.setupHighlightClicks();
    this.setupAttackClicks();
  }

  /**
   * Настройка кликов по подсветке доступных гексов
   */
  private setupHighlightClicks(): void {
    this.hexHighlight.setOnClick((hex) => {
      this.onReachableHexClick(hex);
    });
  }

  /**
   * Настройка кликов по вражеским стекам (атака)
   */
  private setupAttackClicks(): void {
    this.attackHighlight.setOnClick((stack) => {
      this.onAttackTargetClick(stack);
    });
  }

  /**
   * Скрыть цели атаки
   */
  clearAttackTargets(): void {
    this.attackHighlight.clear();
  }

  /**
   * Установить доступность взаимодействия
   */
  setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled;
  }

  /**
   * Обработка клика по доступному гексу
   */
  private onReachableHexClick(hex: Hex): void {
    if (!this.interactionEnabled) return;

    const selectedStack = this.battleManager.getSelectedStack();

    if (selectedStack) {
      // Отмечаем перемещение и действие
      this.battleManager.getActionManager().markMoved(selectedStack);
      this.battleManager.getActionManager().markActed(selectedStack);

      // Перемещаем стек
      this.battleManager.moveStack(selectedStack, hex, () => {
        // После перемещения завершаем ход
        this.battleManager.deselectStack();
        this.hexHighlight.clear();
        this.attackHighlight.clear();
        this.battleManager.endTurn(selectedStack);
      });
    }
  }

  /**
   * Обработка клика по цели атаки
   */
  private onAttackTargetClick(target: CreatureStack): void {
    if (!this.interactionEnabled) return;

    const attacker = this.battleManager.getSelectedStack();
    if (!attacker) return;

    const attackerHex = attacker.getHex();
    const targetHex = target.getHex();
    const distance = hexDistance(attackerHex, targetHex);
    const attackType = attacker.getCreature().config.attackType;
    const maxRange =
      attackType === "melee" ? this.meleeRange : this.rangedRange;

    // Проверяем, это цель для move+attack (в зоне досягаемости хода)
    const targetKey = `${targetHex.q},${targetHex.r}`;
    if (this.moveAttackTargets.has(targetKey)) {
      // Для ranged — атакуем без перемещения
      if (attackType === "ranged") {
        this.performAttack(attacker, target);
        this.attackHighlight.clear();
        this.hexHighlight.clear();
        return;
      }
      // Для melee — перемещаемся + атакуем
      this.performMoveAndAttack(attacker, target);
      this.attackHighlight.clear();
      this.hexHighlight.clear();
      return;
    }

    // Обычная атака (цель уже в радиусе атаки)
    if (distance <= maxRange) {
      this.performAttack(attacker, target);
      this.attackHighlight.clear();
    }
  }

  /**
   * Выполнить атаку
   */
  private performAttack(attacker: CreatureStack, target: CreatureStack): void {
    // Получаем модификатор защиты
    const actionManager = this.battleManager.getActionManager();
    const defenseModifier = actionManager.getDefenseModifier(target);

    // Рассчитываем урон
    const damageResult = DamageCalculator.calculateDamage(
      attacker.getCreature(),
      target.getCreature(),
      defenseModifier,
    );

    // Анимация атаки
    this.animateAttack(attacker, target, () => {
      // Применяем урон
      this.battleManager.applyDamage(
        target,
        damageResult.finalDamage,
        damageResult.killed,
      );

      // Показываем урон
      this.damageDisplay.showDamage(
        target.getHex(),
        damageResult.finalDamage,
        damageResult.killed,
      );

      if (damageResult.killed > 0) {
        setTimeout(() => {
          this.damageDisplay.showKilled(target.getHex(), damageResult.killed);
        }, 600);
      }

      // Завершаем ход
      setTimeout(() => {
        this.attackHighlight.clear();
        this.battleManager.getActionManager().markActed(attacker);
        this.battleManager.deselectStack();
        this.damageDisplay.clear();
        this.battleManager.endTurn(attacker);
      }, 1500);
    });
  }

  /**
   * Выполнить перемещение + атаку за один ход
   * Герой перемещается на ближайший гекс к цели и наносит урон
   */
  private performMoveAndAttack(
    attacker: CreatureStack,
    target: CreatureStack,
  ): void {
    const actionManager = this.battleManager.getActionManager();
    const occupiedHexes = this.battleManager.getOccupiedHexes(attacker);
    const speed = attacker.getCreature().config.speed;
    const targetHex = target.getHex();

    // Находим ближайший гекс для атаки
    const attackHex = findNearestAttackHex(
      attacker.getHex(),
      targetHex,
      speed,
      occupiedHexes,
    );

    if (!attackHex) {
      // Не удалось найти путь — отменяем
      return;
    }

    // Отмечаем перемещение и действие
    actionManager.markMoved(attacker);

    // Перемещаем стек
    this.battleManager.moveStack(attacker, attackHex);
    this.hexHighlight.clear();

    // После перемещения атакуем
    setTimeout(() => {
      const defenseModifier = actionManager.getDefenseModifier(target);
      const damageResult = DamageCalculator.calculateDamage(
        attacker.getCreature(),
        target.getCreature(),
        defenseModifier,
      );

      // Анимация атаки (теперь рядом с целью)
      this.animateAttack(attacker, target, () => {
        this.battleManager.applyDamage(
          target,
          damageResult.finalDamage,
          damageResult.killed,
        );

        this.damageDisplay.showDamage(
          target.getHex(),
          damageResult.finalDamage,
          damageResult.killed,
        );

        if (damageResult.killed > 0) {
          setTimeout(() => {
            this.damageDisplay.showKilled(target.getHex(), damageResult.killed);
          }, 600);
        }

        // Завершаем ход
        setTimeout(() => {
          this.attackHighlight.clear();
          actionManager.markActed(attacker);
          this.battleManager.deselectStack();
          this.damageDisplay.clear();
          this.battleManager.endTurn(attacker);
        }, 1500);
      });
    }, 400);
  }

  /**
   * Анимация атаки (рывок к цели для ближнего боя, выстрел для дальнего)
   */
  private animateAttack(
    attacker: CreatureStack,
    target: CreatureStack,
    onComplete: () => void,
  ): void {
    const attackType = attacker.getCreature().config.attackType;
    const attackerHex = attacker.getHex();
    const targetHex = target.getHex();

    // Для ближнего боя — рывок к цели и обратно
    if (attackType === "melee" && hexDistance(attackerHex, targetHex) > 1) {
      const startX = attacker.position.x;
      const startY = attacker.position.y;
      const targetX = target.position.x;
      const targetY = target.position.y;

      // Рассчитываем промежуточную точку (рядом с целью)
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const strikeX = startX + (dx / dist) * (dist - 30);
      const strikeY = startY + (dy / dist) * (dist - 30);

      const duration = 400;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 0.5) {
          // Рывок вперёд
          const p = progress * 2;
          attacker.position.x = startX + (strikeX - startX) * p;
          attacker.position.y = startY + (strikeY - startY) * p;
        } else {
          // Возврат назад
          const p = (progress - 0.5) * 2;
          attacker.position.x = strikeX + (startX - strikeX) * p;
          attacker.position.y = strikeY + (startY - strikeY) * p;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          attacker.render();
          onComplete();
        }
      };

      requestAnimationFrame(animate);
    } else if (attackType === "ranged") {
      // Для дальнего боя — короткая задержка (стрела летит)
      setTimeout(onComplete, 400);
    } else {
      // Для ближнего боя на соседнем гексе — просто задержка
      setTimeout(onComplete, 300);
    }
  }

  /**
   * Получить достижимые гексы для стека
   */
  private getReachableHexes(stack: CreatureStack): Hex[] {
    const creature = stack.getCreature();
    const currentHex = stack.getHex();
    const occupiedHexes = this.battleManager.getOccupiedHexes(stack);

    return getHexesInRange(
      currentHex,
      creature.config.speed,
      occupiedHexes,
      this.gridWidth,
      this.gridHeight,
    );
  }

  /**
   * Показать доступные гексы для выделенного стека
   */
  showReachableHexes(stack: CreatureStack): void {
    const reachableHexes = this.getReachableHexes(stack);
    this.hexHighlight.show(reachableHexes);
  }

  /**
   * Показать доступные цели для атаки
   */
  showAttackTargets(stack: CreatureStack): void {
    const enemyStacks = this.battleManager
      .getAllStacks()
      .filter(
        (s) => s.getCreature().isAttacker !== stack.getCreature().isAttacker,
      );

    const attackerHex = stack.getHex();
    const attackType = stack.getCreature().config.attackType;
    const maxRange =
      attackType === "melee" ? this.meleeRange : this.rangedRange;

    // Фильтруем цели в радиусе атаки (уже рядом)
    const inRange = enemyStacks.filter((enemy) => {
      const enemyHex = enemy.getHex();
      return hexDistance(attackerHex, enemyHex) <= maxRange;
    });

    if (inRange.length > 0) {
      this.attackHighlight.show(inRange);
    }
  }

  /**
   * Показать цели для атаки за один ход (move+attack)
   * Для ближнего боя: враги, до которых можно дойти и атаковать.
   * Для дальнего боя: все враги в радиусе стрельбы (без перемещения).
   */
  showMoveAttackTargets(stack: CreatureStack): void {
    const enemyStacks = this.battleManager
      .getAllStacks()
      .filter(
        (s) => s.getCreature().isAttacker !== stack.getCreature().isAttacker,
      );

    const attackerHex = stack.getHex();
    const speed = stack.getCreature().config.speed;
    const attackType = stack.getCreature().config.attackType;
    const maxRange =
      attackType === "melee" ? this.meleeRange : this.rangedRange;

    // Для дальнего боя — все враги в радиусе стрельбы
    if (attackType === "ranged") {
      const inRange = enemyStacks.filter((enemy) => {
        const enemyHex = enemy.getHex();
        return hexDistance(attackerHex, enemyHex) <= maxRange;
      });

      this.moveAttackTargets.clear();
      if (inRange.length > 0) {
        for (const enemy of inRange) {
          const key = `${enemy.getHex().q},${enemy.getHex().r}`;
          this.moveAttackTargets.add(key);
        }
        this.attackHighlight.show(inRange, "orange");
      }
      return;
    }

    // Для ближнего боя: находим врагов, до которых можно дойти и атаковать
    const occupiedHexes = this.battleManager.getOccupiedHexes(stack);

    this.moveAttackTargets.clear();
    const moveAttackStacks: CreatureStack[] = [];

    for (const enemy of enemyStacks) {
      const enemyHex = enemy.getHex();
      const attackHex = findNearestAttackHex(
        attackerHex,
        enemyHex,
        speed,
        occupiedHexes,
        this.gridWidth,
        this.gridHeight,
      );

      if (attackHex) {
        const key = `${enemyHex.q},${enemyHex.r}`;
        this.moveAttackTargets.add(key);
        moveAttackStacks.push(enemy);
      }
    }

    // Показываем оранжевую подсветку для move+attack целей
    if (moveAttackStacks.length > 0) {
      this.attackHighlight.show(moveAttackStacks, "orange");
    }
  }

  /**
   * Обработка клика по пустому месту (на уровне сетки)
   */
  handleEmptyHexClick(): void {
    if (!this.interactionEnabled) return;

    const state = this.battleManager.getState();

    if (state === "SELECTED" || state === "ATTACKING") {
      this.battleManager.deselectStack();
      this.hexHighlight.clear();
      this.attackHighlight.clear();
    }
  }
}

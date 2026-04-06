import * as PIXI from "pixi.js";
import { Creature } from "../types/creature";
import { Hex, hexToPixel, HEX_SIZE, hexAdd } from "../types/hex";
import { HealthBar } from "../ui/HealthBar";
import { findHexStepPath } from "../grid/HexUtils";

/**
 * Визуальное отображение стека существ на поле боя
 */
export class CreatureStack extends PIXI.Container {
  private creature: Creature;
  private hex: Hex;
  private hexSize: number;
  private graphic: PIXI.Graphics;
  private countText: PIXI.Text;
  private healthBar: HealthBar;
  private isSelected: boolean = false;

  /**
   * Получить размер существа в гексах
   */
  getSizeInHexes(): number {
    return this.creature.config.sizeInHexes ?? 1;
  }

  /**
   * Получить все гексы, занимаемые существом
   * Для существ размером 1 гекс — возвращает [hex]
   * Для существ размером 2 гекса — возвращает [hex, hex+смещение]
   */
  getOccupiedHexes(): Hex[] {
    const size = this.getSizeInHexes();
    if (size === 1) {
      return [this.hex];
    }

    // Для существа на 2 гекса: основной гекс + соседний справа
    // Смещение выбрано так, чтобы существо выглядело центрированным
    return [this.hex, hexAdd(this.hex, { q: 1, r: 0 })];
  }

  /**
   * Проверить, занимает ли стек указанный гекс
   */
  occupiesHex(hex: Hex): boolean {
    const occupiedHexes = this.getOccupiedHexes();
    return occupiedHexes.some((h) => h.q === hex.q && h.r === hex.r);
  }

  /**
   * Получить гексы, которые занимал бы стек, если бы находился на указанной позиции
   * Используется для проверки валидности перемещения без фактического перемещения
   */
  getOccupiedHexesAt(targetHex: Hex): Hex[] {
    const size = this.getSizeInHexes();
    if (size === 1) {
      return [targetHex];
    }

    // Для существа на 2 гекса: основной гекс + соседний справа
    return [targetHex, hexAdd(targetHex, { q: 1, r: 0 })];
  }

  constructor(creature: Creature, hex: Hex, hexSize: number = HEX_SIZE) {
    super();
    this.creature = creature;
    this.hex = hex;
    this.hexSize = hexSize;

    this.graphic = new PIXI.Graphics();
    this.countText = new PIXI.Text({
      text: String(creature.count),
      style: {
        fontSize: 16,
        fill: 0xffffff,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    this.countText.anchor.set(0.5);

    // HP бар — максимальное HP = health * count (при создании)
    const maxHp = creature.config.health * creature.count;
    this.healthBar = new HealthBar(maxHp);

    this.addChild(this.graphic);
    this.addChild(this.countText);
    this.addChild(this.healthBar);

    // Включаем интерактивность
    this.eventMode = "static";
    this.cursor = "pointer";

    // Останавливаем всплытие событий на уровне захвата
    this.on("click", (event) => {
      event.stopPropagation();
    });

    // Для существ на 2 гекса — увеличиваем hit area
    const size = this.getSizeInHexes();
    if (size >= 2) {
      // Hit area должен покрывать оба гекса
      const secondHex = hexAdd(this.hex, { q: 1, r: 0 });
      const secondPixel = hexToPixel(secondHex, this.hexSize);
      const dx = secondPixel.x;

      this.hitArea = new PIXI.Rectangle(
        -this.hexSize * 1.2,
        -this.hexSize * 0.9,
        Math.abs(dx) + this.hexSize * 2.4,
        this.hexSize * 1.8,
      );
    }

    this.render();
  }

  /**
   * Отрисовка существа на позиции гекса
   */
  public render(): void {
    const { x, y } = hexToPixel(this.hex, this.hexSize);
    const size = this.getSizeInHexes();

    this.position.set(x, y);

    this.graphic.clear();

    if (size >= 2) {
      // Для существ на 2 гекса — рисуем прямоугольник, охватывающий оба гекса
      const secondHex = hexAdd(this.hex, { q: 1, r: 0 });
      const secondPixel = hexToPixel(secondHex, this.hexSize);

      // Расстояние между центрами гексов
      const dx = secondPixel.x - x;
      const dy = secondPixel.y - y;

      // Смещение прямоугольника: центр должен быть посередине между двумя гексами
      const offsetX = dx / 2;
      const offsetY = dy / 2;

      // Половина ширины: половина расстояния между гексами + отступ
      const halfWidth = Math.abs(dx) / 2 + this.hexSize * 0.55;
      const halfHeight = this.hexSize * 0.85;

      this.graphic
        .rect(
          -halfWidth + offsetX,
          -halfHeight + offsetY,
          halfWidth * 2,
          halfHeight * 2,
        )
        .fill({
          color: this.creature.config.color,
          alpha: 0.9,
        });

      if (this.isSelected) {
        this.graphic
          .rect(
            -halfWidth + offsetX,
            -halfHeight + offsetY,
            halfWidth * 2,
            halfHeight * 2,
          )
          .stroke({
            width: 4,
            color: 0xffd700,
            alpha: 1.0,
          });
      } else {
        this.graphic
          .rect(
            -halfWidth + offsetX,
            -halfHeight + offsetY,
            halfWidth * 2,
            halfHeight * 2,
          )
          .stroke({
            width: 2,
            color: 0xffffff,
            alpha: 0.5,
          });
      }

      // Текст под прямоугольником, по центру фигуры
      this.countText.x = offsetX;
      this.countText.y = offsetY + halfHeight + 12;
      this.healthBar.x = -this.healthBar.barWidth / 2 + offsetX;
      this.healthBar.y = -halfHeight + offsetY - 14;
    } else {
      // Для существ на 1 гекс — рисуем круг
      const radius = this.hexSize * 0.6;
      this.graphic.circle(0, 0, radius).fill({
        color: this.creature.config.color,
        alpha: 0.9,
      });

      if (this.isSelected) {
        this.graphic.circle(0, 0, radius).stroke({
          width: 4,
          color: 0xffd700,
          alpha: 1.0,
        });
      } else {
        this.graphic.circle(0, 0, radius).stroke({
          width: 2,
          color: 0xffffff,
          alpha: 0.5,
        });
      }

      this.countText.x = 0;
      this.countText.y = radius + 12;
      this.healthBar.x = -this.healthBar.barWidth / 2;
      this.healthBar.y = -radius - 14;
    }

    // Обновляем максимальное HP (зависит от количества существ)
    const maxHp = this.creature.config.health * this.creature.count;
    this.healthBar.updateMaxHp(maxHp);
    this.healthBar.updateHp(this.creature.currentHp);
  }

  /**
   * Получить данные существа
   */
  getCreature(): Creature {
    return this.creature;
  }

  /**
   * Получить текущий гекс
   */
  getHex(): Hex {
    return this.hex;
  }

  /**
   * Выделить стек
   */
  select(): void {
    this.isSelected = true;
    this.render();
  }

  /**
   * Снять выделение со стека
   */
  deselect(): void {
    this.isSelected = false;
    this.render();
  }

  /**
   * Выделить стек для атаки (красная обводка)
   */
  selectForAttack(): void {
    this.isSelected = true;
    const { x, y } = hexToPixel(this.hex, this.hexSize);
    this.position.set(x, y);

    const size = this.getSizeInHexes();
    this.graphic.clear();

    if (size >= 2) {
      const secondHex = hexAdd(this.hex, { q: 1, r: 0 });
      const secondPixel = hexToPixel(secondHex, this.hexSize);
      const dx = secondPixel.x - x;
      const dy = secondPixel.y - y;
      const offsetX = dx / 2;
      const offsetY = dy / 2;
      const halfWidth = Math.abs(dx) / 2 + this.hexSize * 0.55;
      const halfHeight = this.hexSize * 0.85;

      this.graphic
        .rect(
          -halfWidth + offsetX,
          -halfHeight + offsetY,
          halfWidth * 2,
          halfHeight * 2,
        )
        .fill({
          color: this.creature.config.color,
          alpha: 0.9,
        });
      this.graphic
        .rect(
          -halfWidth + offsetX,
          -halfHeight + offsetY,
          halfWidth * 2,
          halfHeight * 2,
        )
        .stroke({
          width: 4,
          color: 0xff0000,
          alpha: 1.0,
        });

      this.countText.x = offsetX;
      this.countText.y = offsetY + halfHeight + 12;
    } else {
      const radius = this.hexSize * 0.6;
      this.graphic.circle(0, 0, radius).fill({
        color: this.creature.config.color,
        alpha: 0.9,
      });
      this.graphic.circle(0, 0, radius).stroke({
        width: 4,
        color: 0xff0000,
        alpha: 1.0,
      });

      this.countText.x = 0;
      this.countText.y = radius + 12;
    }
  }

  /**
   * Переместить стек на новый гекс с пошаговой анимацией по гексам
   * Существо двигается строго по гексагональной сетке, посещая каждый промежуточный гекс
   *
   * @param newHex - целевой гекс
   * @param occupiedHexes - множество занятых гексов (для поиска пути)
   * @param onComplete - колбэк, вызываемый после завершения анимации
   */
  moveTo(
    newHex: Hex,
    occupiedHexes?: Set<string>,
    onComplete?: () => void,
  ): void {
    const speed = this.creature.config.speed;
    const size = this.getSizeInHexes();

    // Для многогексовых существ — проверяем валидность каждой позиции на пути
    const isValidPosition =
      size >= 2
        ? (hex: Hex) => {
            const occupied = this.getOccupiedHexesAt(hex);
            for (const h of occupied) {
              const key = `${h.q},${h.r}`;
              if (occupiedHexes?.has(key)) return false;
            }
            return true;
          }
        : undefined;

    // Находим путь по гексам
    const stepPath = findHexStepPath(
      this.hex,
      newHex,
      occupiedHexes || new Set(),
      speed,
      this.hexSize,
      isValidPosition,
    );

    if (!stepPath || stepPath.length === 0) {
      // Если путь не найден, просто перемещаем на целевой гекс (fallback)
      this.hex = newHex;
      this.render();
      onComplete?.();
      return;
    }

    // Если путь состоит из одной точки (уже на месте)
    if (stepPath.length === 1) {
      this.hex = newHex;
      this.render();
      onComplete?.();
      return;
    }

    // Пошаговая анимация по каждому гексу в пути
    this.animateHexPath(stepPath, onComplete);
  }

  /**
   * Анимировать перемещение по массиву точек пути
   * Каждая точка - это {hex, x, y} для конкретного шага
   */
  private animateHexPath(
    stepPath: Array<{ hex: Hex; x: number; y: number }>,
    onComplete?: () => void,
  ): void {
    const stepDuration = 150; // мс на один гекс (постоянная скорость)
    let currentStep = 0;

    const animateStep = () => {
      if (currentStep >= stepPath.length) {
        // Все шаги завершены
        this.hex = stepPath[stepPath.length - 1].hex;
        this.render();
        onComplete?.();
        return;
      }

      const target = stepPath[currentStep];
      const startX = this.position.x;
      const startY = this.position.y;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / stepDuration, 1);

        // Линейная интерполяция для плавности
        this.position.x = startX + (target.x - startX) * progress;
        this.position.y = startY + (target.y - startY) * progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Переход к следующему шагу
          currentStep++;
          animateStep();
        }
      };

      requestAnimationFrame(animate);
    };

    animateStep();
  }

  /**
   * Обновить HP бар (вызывать при изменении здоровья)
   */
  updateHealthBar(): void {
    const maxHp = this.creature.config.health * this.creature.count;
    this.healthBar.updateMaxHp(maxHp);
    this.healthBar.updateHp(this.creature.currentHp);
    // Обновляем текст количества существ
    this.countText.text = String(this.creature.count);
  }

  /**
   * Анимация смерти (fade out)
   */
  animateDeath(onComplete?: () => void): void {
    this.healthBar.hide();

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Затухание
      this.alpha = 1 - progress;

      // Уменьшение
      const scale = 1 - progress * 0.5;
      this.scale.set(scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.visible = false;
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Скрыть HP бар
   */
  hideHealthBar(): void {
    this.healthBar.hide();
  }
}

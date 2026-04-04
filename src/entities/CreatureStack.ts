import * as PIXI from "pixi.js";
import { Creature } from "../types/creature";
import { Hex, hexToPixel, HEX_SIZE } from "../types/hex";
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

    this.render();
  }

  /**
   * Отрисовка существа на позиции гекса
   */
  public render(): void {
    const { x, y } = hexToPixel(this.hex, this.hexSize);

    this.position.set(x, y);

    // Рисуем круг, представляющий стек
    const radius = this.hexSize * 0.6;
    this.graphic.clear();
    this.graphic.circle(0, 0, radius).fill({
      color: this.creature.config.color,
      alpha: 0.9,
    });

    // Если выделен - добавляем яркую обводку
    if (this.isSelected) {
      this.graphic.circle(0, 0, radius).stroke({
        width: 4,
        color: 0xffd700, // Золотой цвет для выделения
        alpha: 1.0,
      });
    } else {
      this.graphic.circle(0, 0, radius).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.5,
      });
    }

    // Текст с количеством под кругом
    this.countText.y = radius + 12;

    // HP бар над кругом
    this.healthBar.x = -this.healthBar.barWidth / 2;
    this.healthBar.y = -radius - 14;
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
    // Перерисовываем с красной обводкой
    const { x, y } = hexToPixel(this.hex, this.hexSize);
    this.position.set(x, y);

    const radius = this.hexSize * 0.6;
    this.graphic.clear();
    this.graphic.circle(0, 0, radius).fill({
      color: this.creature.config.color,
      alpha: 0.9,
    });
    this.graphic.circle(0, 0, radius).stroke({
      width: 4,
      color: 0xff0000, // Красная обводка для атаки
      alpha: 1.0,
    });

    this.countText.y = radius + 12;
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

    // Находим путь по гексам
    const stepPath = findHexStepPath(
      this.hex,
      newHex,
      occupiedHexes || new Set(),
      speed,
      this.hexSize,
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

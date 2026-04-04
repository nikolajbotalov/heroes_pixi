import * as PIXI from "pixi.js";

/**
 * Визуальное отображение здоровья стека (HP bar)
 * Показывает текущее соотношение HP к максимальному HP
 * Цвет меняется: зелёный → жёлтый → красный
 */
export class HealthBar extends PIXI.Container {
  private maxHp: number;
  private currentHp: number;
  public barWidth: number;
  private barHeight: number;
  private background: PIXI.Graphics;
  private fill: PIXI.Graphics;

  constructor(maxHp: number, barWidth: number = 40, barHeight: number = 6) {
    super();
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.barWidth = barWidth;
    this.barHeight = barHeight;

    this.background = new PIXI.Graphics();
    this.fill = new PIXI.Graphics();

    this.addChild(this.background);
    this.addChild(this.fill);

    this.render();
  }

  /**
   * Обновить текущее здоровье
   */
  updateHp(currentHp: number): void {
    this.currentHp = Math.max(0, currentHp);
    this.render();
  }

  /**
   * Обновить максимальное здоровье (при изменении количества существ)
   */
  updateMaxHp(newMaxHp: number): void {
    this.maxHp = Math.max(1, newMaxHp);
    this.render();
  }

  /**
   * Отрисовка HP бара
   */
  private render(): void {
    this.background.clear();
    this.fill.clear();

    // Фон (тёмная рамка)
    this.background.roundRect(0, 0, this.barWidth, this.barHeight, 2).fill({
      color: 0x000000,
      alpha: 0.7,
    });
    this.background.roundRect(0, 0, this.barWidth, this.barHeight, 2).stroke({
      width: 1,
      color: 0x333333,
      alpha: 0.8,
    });

    // Заполнение (цвет зависит от % HP)
    const hpPercent = this.currentHp / this.maxHp;
    const fillWidth = Math.max(2, this.barWidth * hpPercent);
    const color = this.getHpBarColor(hpPercent);

    this.fill.roundRect(1, 1, fillWidth - 2, this.barHeight - 2, 1).fill({
      color,
      alpha: 0.9,
    });
  }

  /**
   * Получить цвет HP бара в зависимости от процента здоровья
   */
  private getHpBarColor(hpPercent: number): number {
    if (hpPercent > 0.6) {
      return 0x2ecc71; // Зелёный
    } else if (hpPercent > 0.3) {
      return 0xf1c40f; // Жёлтый
    } else {
      return 0xe74c3c; // Красный
    }
  }

  /**
   * Скрыть HP бар
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Показать HP бар
   */
  show(): void {
    this.visible = true;
  }
}

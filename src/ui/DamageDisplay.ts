import * as PIXI from "pixi.js";
import { hexToPixel, HEX_SIZE } from "../types/hex";
import { Hex } from "../types/hex";

/**
 * Отображение нанесённого урона (всплывающий текст)
 */
export class DamageDisplay extends PIXI.Container {
  private hexSize: number;

  constructor(hexSize: number = HEX_SIZE) {
    super();
    this.hexSize = hexSize;
  }

  /**
   * Показать урон на позиции гекса
   */
  showDamage(
    hex: Hex,
    damage: number,
    _killed: number,
    onComplete?: () => void,
  ): void {
    const { x, y } = hexToPixel(hex, this.hexSize);

    // Создаём текст урона
    const damageText = new PIXI.Text({
      text: `-${damage}`,
      style: {
        fontSize: 24,
        fill: 0xff0000,
        fontFamily: "Arial",
        fontWeight: "bold",
        stroke: {
          color: 0x000000,
          width: 3,
        },
      },
    });
    damageText.anchor.set(0.5);
    damageText.x = x;
    damageText.y = y - 20;

    this.addChild(damageText);

    // Анимация всплывания и исчезновения
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Всплывание вверх
      damageText.y = y - 20 - progress * 40;

      // Затухание
      damageText.alpha = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1;

      // Масштабирование
      const scale = progress < 0.1 ? progress * 10 : 1;
      damageText.scale.set(scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.removeChild(damageText);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Показать текст "Убито: N"
   */
  showKilled(hex: Hex, killed: number, onComplete?: () => void): void {
    const { x, y } = hexToPixel(hex, this.hexSize);

    const killedText = new PIXI.Text({
      text: `☠ ${killed}`,
      style: {
        fontSize: 18,
        fill: 0xff6600,
        fontFamily: "Arial",
        fontWeight: "bold",
        stroke: {
          color: 0x000000,
          width: 2,
        },
      },
    });
    killedText.anchor.set(0.5);
    killedText.x = x;
    killedText.y = y + 20;

    this.addChild(killedText);

    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      killedText.y = y + 20 + progress * 20;
      killedText.alpha = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.removeChild(killedText);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Очистить все отображения
   */
  clear(): void {
    this.removeChildren();
  }
}

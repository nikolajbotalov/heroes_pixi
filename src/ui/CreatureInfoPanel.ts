import * as PIXI from "pixi.js";
import { Creature } from "../types/creature";

/**
 * Словарь русских названий существ
 */
const CREATURE_NAMES_RU: Record<string, string> = {
  Peasant: "Крестьянин",
  Archer: "Лучник",
};

/**
 * Панель информации о существе
 * Отображает характеристики выбранного стека существ
 */
export class CreatureInfoPanel extends PIXI.Container {
  private background: PIXI.Graphics;
  private titleText: PIXI.Text;
  private infoText: PIXI.Text;

  constructor() {
    super();

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.titleText = new PIXI.Text({
      text: "Информация о существе",
      style: {
        fontSize: 20,
        fill: 0xffffff,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    this.addChild(this.titleText);

    this.infoText = new PIXI.Text({
      text: "Наведите на существо",
      style: {
        fontSize: 16,
        fill: 0xcccccc,
        fontFamily: "Arial",
        lineHeight: 24,
      },
    });
    this.addChild(this.infoText);

    this.render();
  }

  /**
   * Отрисовка панели
   */
  private render(): void {
    this.removeChildren();
    this.addChild(this.background);
    this.addChild(this.titleText);
    this.addChild(this.infoText);

    // Перерисовка фона
    this.background.clear();

    const padding = 15;
    const titleHeight = 35;
    const infoHeight = this.calculateInfoHeight();
    const panelWidth = 280;
    const panelHeight = titleHeight + infoHeight + padding * 2 + 10;

    this.background.roundRect(0, 0, panelWidth, panelHeight, 10).fill({
      color: 0x16213e,
      alpha: 0.95,
    });
    this.background.roundRect(0, 0, panelWidth, panelHeight, 10).stroke({
      width: 2,
      color: 0x0f3460,
    });

    // Позиционирование заголовка
    this.titleText.x = padding;
    this.titleText.y = padding;

    // Позиционирование информации
    this.infoText.x = padding;
    this.infoText.y = padding + titleHeight;
  }

  /**
   * Рассчитать высоту блока информации
   */
  private calculateInfoHeight(): number {
    // 10 строк информации с увеличенным отступом
    return 10 * 24;
  }

  /**
   * Обновить панель с информацией о существе
   */
  update(creature: Creature | null): void {
    if (!creature) {
      this.titleText.text = "Информация о существе";
      this.infoText.text = "Наведите на существо";
    } else {
      const config = creature.config;

      // Получаем русское название
      const nameRu = CREATURE_NAMES_RU[config.name] || config.name;
      this.titleText.text = nameRu;

      // Форматируем информацию о существе
      const side = creature.isAttacker ? "Атакующий" : "Защитник";
      const attackType =
        config.attackType === "melee" ? "Ближний бой" : "Дальний бой";

      this.infoText.text =
        `Уровень: ${config.level}\n` +
        `Сторона: ${side}\n` +
        `Атака: ${config.attack}\n` +
        `Защита: ${config.defense}\n` +
        `Урон: ${config.damageMin}-${config.damageMax}\n` +
        `Здоровье (всего): ${creature.currentHp}\n` +
        `Здоровье (ед.): ${Math.round(creature.currentHp / creature.count)}\n` +
        `Инициатива: ${config.initiative}\n` +
        `Скорость: ${config.speed}\n` +
        `Тип атаки: ${attackType}\n` +
        `Количество: ${creature.count}`;
    }

    this.render();
  }
}

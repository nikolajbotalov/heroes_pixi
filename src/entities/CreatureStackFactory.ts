import { Creature } from "../types/creature";
import { CreatureStack } from "../entities/CreatureStack";
import { StackConfig } from "../core/BattleConfig";
import { PEASANT_CONFIG } from "../entities/PeasantConfig";
import { ARCHER_CONFIG } from "../entities/ArcherConfig";

/**
 * Реестр конфигураций существ по ключу.
 */
const CREATURE_REGISTRY: Record<string, Creature["config"]> = {
  peasant: PEASANT_CONFIG,
  archer: ARCHER_CONFIG,
};

/**
 * Фабрика для создания стеков существ.
 * Инкапсулирует логику создания Creature и CreatureStack.
 */
export class CreatureStackFactory {
  /**
   * Создать стек существа из конфигурации.
   *
   * @param config - конфигурация стека
   * @returns созданный CreatureStack
   * @throws Error если тип существа не найден в реестре
   */
  public createStack(config: StackConfig): CreatureStack {
    const creatureConfig = CREATURE_REGISTRY[config.creatureType];
    if (!creatureConfig) {
      throw new Error(
        `Unknown creature type: "${config.creatureType}". ` +
          `Available types: ${Object.keys(CREATURE_REGISTRY).join(", ")}`,
      );
    }

    const creature: Creature = {
      config: creatureConfig,
      count: config.count,
      currentHp: creatureConfig.health * config.count,
      isAttacker: config.isAttacker,
      isAIControlled: config.isAIControlled,
    };

    return new CreatureStack(creature, config.hex);
  }

  /**
   * Создать несколько стеков из массива конфигураций.
   *
   * @param configs - массив конфигураций стеков
   * @returns массив созданных CreatureStack
   */
  public createStacks(configs: StackConfig[]): CreatureStack[] {
    return configs.map((config) => this.createStack(config));
  }

  /**
   * Проверить, зарегистрирован ли тип существа.
   *
   * @param creatureType - ключ типа
   */
  public static hasCreature(creatureType: string): boolean {
    return creatureType in CREATURE_REGISTRY;
  }
}

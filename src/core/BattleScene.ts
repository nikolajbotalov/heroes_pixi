import * as PIXI from "pixi.js";
import { HexGrid } from "../grid/HexGrid";
import { CreatureStack } from "../entities/CreatureStack";
import { InitiativeQueue } from "../core/InitiativeQueue";
import { TurnOrderPanel } from "../ui/TurnOrderPanel";
import { CreatureInfoPanel } from "../ui/CreatureInfoPanel";
import { BattleManager } from "../core/BattleManager";
import { HexHighlight } from "../grid/HexHighlight";
import { HexGridInteraction } from "../grid/HexGridInteraction";
import { AttackHighlight } from "../ui/AttackHighlight";
import { DamageDisplay } from "../ui/DamageDisplay";
import { ActionPanel } from "../ui/ActionPanel";
import { VictoryScreen } from "../ui/VictoryScreen";
import { SimpleAI } from "../ai/SimpleAI";
import { DebugPanel } from "../ui/DebugPanel";
import { CreatureStackFactory } from "../entities/CreatureStackFactory";
import {
  StackConfig,
  GridConfig,
  LAYOUT,
  AI_TURN_DELAY_MS,
} from "../core/BattleConfig";

/**
 * BattleScene — инкапсулирует всю логику боевой сцены.
 * Управляет стеками, UI, AI, взаимодействием с сеткой.
 */
export class BattleScene {
  private app: PIXI.Application;
  private gridConfig: GridConfig;
  private stackConfigs: StackConfig[];

  // Core
  private hexGrid!: HexGrid;
  private battleManager!: BattleManager;
  private initiativeQueue!: InitiativeQueue;
  private simpleAI!: SimpleAI;

  // UI
  private turnOrderPanel!: TurnOrderPanel;
  private creatureInfoPanel!: CreatureInfoPanel;
  private actionPanel!: ActionPanel;
  private victoryScreen!: VictoryScreen;
  private debugPanel!: DebugPanel;

  // Interaction
  private hexHighlight!: HexHighlight;
  private attackHighlight!: AttackHighlight;
  private damageDisplay!: DamageDisplay;
  private hexGridInteraction!: HexGridInteraction;

  // State
  private isAIProcessing = false;
  private allStacks: CreatureStack[] = [];

  constructor(
    app: PIXI.Application,
    gridConfig: GridConfig,
    stackConfigs: StackConfig[],
  ) {
    this.app = app;
    this.gridConfig = gridConfig;
    this.stackConfigs = stackConfigs;
  }

  /**
   * Инициализировать все компоненты сцены.
   * Должен быть вызван после добавления в stage.
   */
  public init(): void {
    this.createGrid();
    this.createStacks();
    this.createBattleManager();
    this.createAI();
    this.createUI();
    this.createInteraction();
    this.setupEventListeners();
    this.layoutElements();
    this.autoSelectFirstPlayerStack();
  }

  /**
   * Обработать изменение размера окна.
   */
  public onResize(): void {
    this.layoutElements();
    this.victoryScreen.resize(this.app.screen.width, this.app.screen.height);
  }

  // ==================== PRIVATE ====================

  private createGrid(): void {
    this.hexGrid = new HexGrid(
      this.gridConfig.width,
      this.gridConfig.height,
      this.gridConfig.hexSize,
    );
    this.hexGrid.eventMode = "static";
    this.hexGrid.on("click", (event) => {
      event.stopPropagation();
      this.hexGridInteraction.handleEmptyHexClick();
    });
    this.app.stage.addChild(this.hexGrid);
  }

  private createStacks(): void {
    const factory = new CreatureStackFactory();
    this.allStacks = factory.createStacks(this.stackConfigs);

    // Добавляем стеки на сетку
    this.allStacks.forEach((stack) => this.hexGrid.addChild(stack));
  }

  private createBattleManager(): void {
    this.battleManager = new BattleManager();
    this.battleManager.init(this.allStacks);
  }

  private createAI(): void {
    this.simpleAI = new SimpleAI(
      this.battleManager,
      this.gridConfig.width,
      this.gridConfig.height,
    );
  }

  private createUI(): void {
    // Инициализация очереди
    this.initiativeQueue = new InitiativeQueue();
    this.allStacks.forEach((stack) => this.initiativeQueue.add(stack));

    // Victory Screen
    this.victoryScreen = new VictoryScreen();
    this.victoryScreen.setOnRestart(() => window.location.reload());
    this.app.stage.addChild(this.victoryScreen);

    // Turn Order Panel
    this.turnOrderPanel = new TurnOrderPanel();
    this.turnOrderPanel.init(this.initiativeQueue.getQueue());
    this.turnOrderPanel.update(
      this.initiativeQueue.getQueue(),
      this.initiativeQueue.getCurrent(),
    );
    this.app.stage.addChild(this.turnOrderPanel);

    // Action Panel
    this.actionPanel = new ActionPanel();
    this.actionPanel.visible = false;
    this.actionPanel.setOnAction((action) => this.handleAction(action));
    this.app.stage.addChild(this.actionPanel);

    // Creature Info Panel
    this.creatureInfoPanel = new CreatureInfoPanel();
    this.app.stage.addChild(this.creatureInfoPanel);

    // Debug Panel
    this.debugPanel = new DebugPanel();
    this.app.stage.addChild(this.debugPanel);
  }

  private createInteraction(): void {
    this.hexHighlight = new HexHighlight(this.gridConfig.hexSize);
    this.attackHighlight = new AttackHighlight(this.gridConfig.hexSize);
    this.damageDisplay = new DamageDisplay(this.gridConfig.hexSize);

    this.hexGridInteraction = new HexGridInteraction(
      this.battleManager,
      this.hexHighlight,
      this.attackHighlight,
      this.damageDisplay,
      this.gridConfig.width,
      this.gridConfig.height,
    );

    // Порядок добавления важен для z-order
    this.hexGrid.addChild(this.hexGridInteraction);
    this.hexGrid.addChild(this.hexHighlight);
    this.hexGrid.addChild(this.attackHighlight);
    this.hexGrid.addChild(this.damageDisplay);
  }

  private setupEventListeners(): void {
    // Stack destroyed — удалить из очереди и UI
    this.battleManager.on("stackDestroyed", (deadStack: CreatureStack) => {
      this.initiativeQueue.remove(deadStack);
      this.turnOrderPanel.removeStack(deadStack);
      this.turnOrderPanel.update(
        this.initiativeQueue.getQueue(),
        this.initiativeQueue.getCurrent(),
      );
      this.actionPanel.y =
        this.turnOrderPanel.y +
        this.turnOrderPanel.panelHeight +
        LAYOUT.actionPanelGap;
    });

    // Turn ended — переключить ход, запустить AI или выбрать стек игрока
    this.battleManager.on("turnEnded", (actingStack: CreatureStack | null) => {
      this.handleTurnEnded(actingStack);
    });

    // Stack moved — записать в debug
    this.battleManager.on(
      "stackMoved",
      (stack: CreatureStack, _oldHex: unknown, newHex: unknown) => {
        const creature = stack.getCreature();
        if (creature.isAttacker) {
          this.debugPanel.recordMove(
            creature.config.name,
            _oldHex as { q: number; r: number },
            newHex as { q: number; r: number },
          );
        }
      },
    );

    // Turn ended — увеличить счётчик хода
    this.battleManager.on("turnEnded", () => {
      this.debugPanel.nextTurn();
    });

    // Battle ended — показать экран победы
    this.battleManager.getVictoryManager().on("battleEnded", (outcome) => {
      this.victoryScreen.show(
        outcome,
        this.app.screen.width,
        this.app.screen.height,
      );
    });

    // Клики по стекам
    this.allStacks.forEach((stack) => {
      stack.on("click", (event) => {
        event.stopPropagation();
        this.handleStackClick(stack);
      });
    });
  }

  private handleAction(action: string): void {
    const selectedStack = this.battleManager.getSelectedStack();
    if (!selectedStack) return;

    switch (action) {
      case "defend":
        this.battleManager.defend();
        this.actionPanel.hide();
        break;

      case "wait":
        this.battleManager.wait();
        this.actionPanel.hide();
        break;

      case "skip":
        this.battleManager.endTurn(this.initiativeQueue.getCurrent());
        this.actionPanel.hide();
        break;

      case "attack":
        this.battleManager.startAttackPhase();
        this.hexGridInteraction.showAttackTargets(selectedStack);
        this.actionPanel.hide();
        break;

      case "move":
        this.battleManager.selectStack(selectedStack);
        this.hexGridInteraction.showReachableHexes(selectedStack);
        this.actionPanel.hide();
        break;
    }
  }

  private handleTurnEnded(actingStack: CreatureStack | null): void {
    if (this.battleManager.getVictoryManager().isBattleOver()) return;

    const actionManager = this.battleManager.getActionManager();
    const wasWaiting = actingStack
      ? actionManager.isWaiting(actingStack)
      : false;

    const { isNewRound } = this.initiativeQueue.next();

    const actingCreature = actingStack?.getCreature();
    console.log(
      `[Queue] Ход завершён: ${actingCreature?.config.name ?? "null"}, isNewRound: ${isNewRound}, wasWait: ${wasWaiting}`,
    );

    if (isNewRound) {
      actionManager.resetAllActions();
      const round = this.initiativeQueue.getRound();
      this.turnOrderPanel.reinit(this.initiativeQueue.getQueue(), round);
      console.log(`[Queue] Новый раунд ${round} — переинициализация`);
    } else if (actingStack) {
      if (wasWaiting) {
        this.turnOrderPanel.advanceTurnWithWait(actingStack);
        console.log(`[Queue] Wait: ${actingCreature?.config.name}`);
      } else {
        this.turnOrderPanel.advanceTurn(actingStack);
      }
    }

    this.turnOrderPanel.update(
      this.initiativeQueue.getQueue(),
      this.initiativeQueue.getCurrent(),
    );

    const slotNames = this.turnOrderPanel.getSlotNames();
    console.log(`[Queue] Слоты: [${slotNames.join(", ")}]`);

    const nextStack = this.initiativeQueue.getCurrent();
    if (!nextStack) return;

    if (this.battleManager.isAIControlled(nextStack)) {
      this.runAITurn(nextStack);
    } else {
      this.autoSelectPlayerStack(nextStack);
    }
  }

  private handleStackClick(stack: CreatureStack): void {
    if (this.isAIProcessing) return;

    const creature = stack.getCreature();
    const currentTurn = this.initiativeQueue.getCurrent();
    const currentCreature = currentTurn?.getCreature();

    if (currentCreature && creature.isAttacker === currentCreature.isAttacker) {
      this.autoSelectPlayerStack(stack);
    }
  }

  private runAITurn(stack: CreatureStack): void {
    this.isAIProcessing = true;
    this.hexGridInteraction.setInteractionEnabled(false);

    setTimeout(() => {
      this.simpleAI.executeTurn(stack, () => {
        this.isAIProcessing = false;
        this.hexGridInteraction.setInteractionEnabled(true);
      });
    }, AI_TURN_DELAY_MS);
  }

  private autoSelectPlayerStack(stack: CreatureStack): void {
    const actionManager = this.battleManager.getActionManager();

    this.battleManager.selectStack(stack);
    this.creatureInfoPanel.update(stack.getCreature());
    this.hexGridInteraction.showReachableHexes(stack);
    this.hexGridInteraction.showMoveAttackTargets(stack);
    this.actionPanel.show();

    // Обновить доступность кнопок
    if (!actionManager.canMove(stack)) {
      this.actionPanel.disableAction("move");
    } else {
      this.actionPanel.enableAction("move");
    }

    if (!actionManager.canAct(stack)) {
      this.actionPanel.disableAction("attack");
      this.actionPanel.disableAction("defend");
      this.actionPanel.disableAction("wait");
    } else {
      this.actionPanel.enableAction("attack");
      this.actionPanel.enableAction("defend");
      this.actionPanel.enableAction("wait");
    }
  }

  private autoSelectFirstPlayerStack(): void {
    const firstStack = this.initiativeQueue.getCurrent();
    if (firstStack && !this.battleManager.isAIControlled(firstStack)) {
      this.autoSelectPlayerStack(firstStack);
    }
  }

  private layoutElements(): void {
    const gridX =
      (this.app.screen.width - this.hexGrid.width) / 2 + LAYOUT.gridPadding;
    const gridY =
      (this.app.screen.height - this.hexGrid.height) / 2 +
      LAYOUT.gridPadding +
      LAYOUT.gridOffsetY;

    this.hexGrid.position.set(gridX, gridY);

    this.turnOrderPanel.x = gridX;
    this.turnOrderPanel.y = gridY + this.hexGrid.height + LAYOUT.turnOrderGap;

    this.creatureInfoPanel.x = gridX + LAYOUT.infoPanelOffsetX;
    this.creatureInfoPanel.y = gridY + LAYOUT.infoPanelOffsetY;

    this.actionPanel.x = gridX;
    this.actionPanel.y =
      this.turnOrderPanel.y +
      this.turnOrderPanel.panelHeight +
      LAYOUT.actionPanelGap;

    this.debugPanel.x = gridX + this.hexGrid.width + LAYOUT.debugPanelOffsetX;
    this.debugPanel.y = gridY;
  }

  /**
   * Получить BattleManager для внешнего использования (например, для тестов).
   */
  public getBattleManager(): BattleManager {
    return this.battleManager;
  }
}

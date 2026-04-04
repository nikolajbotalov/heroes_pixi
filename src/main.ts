import * as PIXI from "pixi.js";
import { HexGrid } from "./grid/HexGrid";
import { Hex } from "./types/hex";
import { Creature } from "./types/creature";
import { PEASANT_CONFIG } from "./entities/PeasantConfig";
import { CreatureStack } from "./entities/CreatureStack";
import { InitiativeQueue } from "./core/InitiativeQueue";
import { TurnOrderPanel } from "./ui/TurnOrderPanel";
import { CreatureInfoPanel } from "./ui/CreatureInfoPanel";
import { BattleManager } from "./core/BattleManager";
import { HexHighlight } from "./grid/HexHighlight";
import { HexGridInteraction } from "./grid/HexGridInteraction";
import { AttackHighlight } from "./ui/AttackHighlight";
import { DamageDisplay } from "./ui/DamageDisplay";
import { ActionPanel } from "./ui/ActionPanel";
import { VictoryScreen } from "./ui/VictoryScreen";
import { SimpleAI } from "./ai/SimpleAI";
import { DebugPanel } from "./ui/DebugPanel";

(async (): Promise<void> => {
  const app: PIXI.Application = new PIXI.Application();

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
  });

  document.body.appendChild(app.canvas);

  // --- Гексагональная сетка ---
  const gridWidth = 12;
  const gridHeight = 10;
  const hexSize = 30;
  const hexGrid = new HexGrid(gridWidth, gridHeight, hexSize);

  const padding = 40;
  hexGrid.x = (app.screen.width - hexGrid.width) / 2 + padding;
  hexGrid.y = (app.screen.height - hexGrid.height) / 2 + padding + 30;

  app.stage.addChild(hexGrid);

  // --- Стек крестьян (игрок, атакующие) ---
  // Позиция: левый верхний угол
  const peasantStack: Creature = {
    config: PEASANT_CONFIG,
    count: 20,
    currentHp: 20,
    isAttacker: true,
  };
  const peasantHex = { q: 0, r: 0 };
  const peasantView = new CreatureStack(peasantStack, peasantHex);
  hexGrid.addChild(peasantView);

  // --- Стек крестьян (враг, защитники) ---
  // Позиция: правый верхний угол (q=11)
  const defenderStack: Creature = {
    config: PEASANT_CONFIG,
    count: 15,
    currentHp: 15,
    isAttacker: false,
    isAIControlled: true, // AI контролирует защитников
  };
  const defenderHex = { q: 11, r: 0 };
  const defenderView = new CreatureStack(defenderStack, defenderHex);
  hexGrid.addChild(defenderView);

  // --- Стек крестьян (враг, второй) ---
  // Позиция: правый, ниже первого
  const enemyStack: Creature = {
    config: PEASANT_CONFIG,
    count: 10,
    currentHp: 10,
    isAttacker: false,
    isAIControlled: true, // AI контролирует защитников
  };
  const enemyHex = { q: 11, r: 1 };
  const enemyView = new CreatureStack(enemyStack, enemyHex);

  // --- Battle Manager ---
  const battleManager = new BattleManager();
  const allStacks = [peasantView, defenderView, enemyView];
  battleManager.init(allStacks);

  // --- Simple AI ---
  const simpleAI = new SimpleAI(battleManager, gridWidth, gridHeight);

  // --- Victory Screen ---
  const victoryScreen = new VictoryScreen();
  victoryScreen.setOnRestart(() => {
    // Перезагрузка страницы
    window.location.reload();
  });
  app.stage.addChild(victoryScreen);

  // Подписка на событие конца боя
  battleManager.getVictoryManager().on("battleEnded", (outcome) => {
    victoryScreen.show(outcome, app.screen.width, app.screen.height);
  });

  // Обновление панели очереди при гибели существ
  battleManager.on("stackDestroyed", (deadStack: CreatureStack) => {
    // Удаляем из очереди инициативы
    initiativeQueue.remove(deadStack);
    // Удаляем из панели
    turnOrderPanel.removeStack(deadStack);
    // Обновляем отображение
    turnOrderPanel.update(
      initiativeQueue.getQueue(),
      initiativeQueue.getCurrent(),
    );
    actionPanel.y = turnOrderPanel.y + turnOrderPanel.panelHeight + 10;
  });

  // Переключение очереди хода после завершения действия
  let isAIProcessing = false; // Блокировка от повторного запуска AI

  /**
   * Запустить AI-ход для текущего стека.
   * После завершения проверит, является ли следующий стек AI, и запустит его.
   */
  function runAITurn(stack: CreatureStack): void {
    isAIProcessing = true;

    // Блокируем UI на время AI-хода
    hexGridInteraction.setInteractionEnabled(false);

    // Небольшая задержка перед AI-ходом для визуальной обратной связи
    setTimeout(() => {
      simpleAI.executeTurn(stack, () => {
        // AI завершил действие, но turnEnded уже мог сработать.
        // Проверяем, не является ли следующий стек тоже AI.
        const nextStack = initiativeQueue.getCurrent();
        if (
          nextStack &&
          battleManager.isAIControlled(nextStack) &&
          !nextStack.getCreature().isAttacker
        ) {
          // Следующий стек — AI, запускаем его
          runAITurn(nextStack);
        } else {
          // Ход переходит к игроку — разблокируем UI
          isAIProcessing = false;
          hexGridInteraction.setInteractionEnabled(true);
        }
      });
    }, 500);
  }

  battleManager.on("turnEnded", (actingStack: CreatureStack | null) => {
    // Проверяем, не завершён ли бой
    if (battleManager.getVictoryManager().isBattleOver()) return;

    const actionManager = battleManager.getActionManager();

    // Переключаем ход, проверяем новый раунд
    const { isNewRound } = initiativeQueue.next();

    // При новом раунде сбрасываем все действия
    if (isNewRound) {
      actionManager.resetAllActions();
    }

    // Сдвигаем очередь в панели
    if (actingStack) {
      turnOrderPanel.advanceTurn(actingStack);
    }

    // Обновляем отображение
    turnOrderPanel.update(
      initiativeQueue.getQueue(),
      initiativeQueue.getCurrent(),
    );

    // Проверяем, является ли следующий ход AI-контролируемым
    const nextStack = initiativeQueue.getCurrent();

    if (
      nextStack &&
      battleManager.isAIControlled(nextStack) &&
      !isAIProcessing
    ) {
      runAITurn(nextStack);
    }
  });

  // --- Hex Highlight ---
  const hexHighlight = new HexHighlight(hexSize);

  // --- Attack Highlight ---
  const attackHighlight = new AttackHighlight(hexSize);

  // --- Damage Display ---
  const damageDisplay = new DamageDisplay(hexSize);

  // --- Очередь ходов ---
  const initiativeQueue = new InitiativeQueue();
  initiativeQueue.add(peasantView);
  initiativeQueue.add(defenderView);
  initiativeQueue.add(enemyView);

  // --- Панель очереди (под сеткой) ---
  const turnOrderPanel = new TurnOrderPanel();
  turnOrderPanel.y = hexGrid.y + hexGrid.height + 20;
  turnOrderPanel.x = hexGrid.x;

  // Инициализируем панель
  turnOrderPanel.init(initiativeQueue.getQueue());
  turnOrderPanel.update(
    initiativeQueue.getQueue(),
    initiativeQueue.getCurrent(),
  );
  app.stage.addChild(turnOrderPanel);

  // --- Action Panel (под очередью существ) ---
  const actionPanel = new ActionPanel();
  actionPanel.x = hexGrid.x;
  actionPanel.y = turnOrderPanel.y + turnOrderPanel.panelHeight + 10;
  actionPanel.visible = false;
  app.stage.addChild(actionPanel);

  // --- Action Panel events ---
  actionPanel.setOnAction((action) => {
    const selectedStack = battleManager.getSelectedStack();
    if (!selectedStack) return;

    const actionManager = battleManager.getActionManager();

    switch (action) {
      case "defend":
        battleManager.defend();
        actionPanel.hide();
        break;

      case "wait":
        if (actionManager.wait(selectedStack)) {
          actionPanel.hide();
          turnOrderPanel.update(
            initiativeQueue.getQueue(),
            initiativeQueue.getCurrent(),
          );
        }
        break;

      case "skip":
        battleManager.endTurn(initiativeQueue.getCurrent());
        actionPanel.hide();
        break;

      case "attack":
        // Переходим в фазу атаки
        battleManager.startAttackPhase();
        hexGridInteraction.showAttackTargets(selectedStack);
        actionPanel.hide();
        break;

      case "move":
        // Показываем доступные гексы для перемещения
        battleManager.selectStack(selectedStack);
        hexGridInteraction.showReachableHexes(selectedStack);
        actionPanel.hide();
        break;
    }
  });

  // --- Debug Panel (отладка координат перемещения игрока) ---
  const debugPanel = new DebugPanel();
  debugPanel.x = hexGrid.x + hexGrid.width + 20;
  debugPanel.y = hexGrid.y;
  app.stage.addChild(debugPanel);

  // Подписка на событие перемещения — записываем только атакующих (игрок)
  battleManager.on(
    "stackMoved",
    (stack: CreatureStack, oldHex: Hex, newHex: Hex) => {
      const creature = stack.getCreature();
      if (creature.isAttacker) {
        const nameRu = creature.config.name;
        debugPanel.recordMove(nameRu, oldHex, newHex);
      }
    },
  );

  // Увеличиваем счётчик хода при смене хода
  battleManager.on("turnEnded", (_actingStack: CreatureStack | null) => {
    debugPanel.nextTurn();
  });

  // --- Hex Grid Interaction ---
  const hexGridInteraction = new HexGridInteraction(
    battleManager,
    hexHighlight,
    attackHighlight,
    damageDisplay,
    gridWidth,
    gridHeight,
  );

  // Добавляем в правильном порядке: сначала взаимодействие, потом подсветки, потом стеки
  hexGrid.addChild(hexGridInteraction);
  hexGrid.addChild(hexHighlight);
  hexGrid.addChild(attackHighlight);
  hexGrid.addChild(damageDisplay);
  hexGrid.addChild(peasantView);
  hexGrid.addChild(defenderView);
  hexGrid.addChild(enemyView);

  // --- Клик по пустому месту (снимает выделение) ---
  hexGrid.eventMode = "static";
  hexGrid.on("click", (event) => {
    event.stopPropagation();
    hexGridInteraction.handleEmptyHexClick();
  });

  // --- Панель информации о существе (слева вплотную к сетке) ---
  const creatureInfoPanel = new CreatureInfoPanel();
  creatureInfoPanel.x = hexGrid.x - 350; // 300px ширина панели + отступ 50px
  creatureInfoPanel.y = hexGrid.y - 50;
  app.stage.addChild(creatureInfoPanel);

  // --- Заголовок ---
  const title: PIXI.Text = new PIXI.Text({
    text: "Heroes Arena",
    style: {
      fontSize: 36,
      fill: 0xffffff,
      fontFamily: "Arial",
      fontWeight: "bold",
    },
  });
  title.anchor.set(0.5, 0);
  title.x = app.screen.width / 2;
  title.y = 10;
  app.stage.addChild(title);

  // --- Обработка клика по стекам (выделение + информация) ---
  allStacks.forEach((stack) => {
    stack.on("click", (event) => {
      event.stopPropagation();

      // Блокируем клики во время AI-хода
      if (isAIProcessing) return;

      const creature = stack.getCreature();
      const currentTurn = initiativeQueue.getCurrent();
      const currentCreature = currentTurn?.getCreature();
      const actionManager = battleManager.getActionManager();

      // Можно выделять только стеки текущей стороны
      if (
        currentCreature &&
        creature.isAttacker === currentCreature.isAttacker
      ) {
        // Выделяем стек
        battleManager.selectStack(stack);

        // Обновляем панель информации
        creatureInfoPanel.update(stack.getCreature());

        // Показываем доступные гексы для перемещения
        hexGridInteraction.showReachableHexes(stack);

        // Показываем врагов для атаки за один ход (move+attack)
        hexGridInteraction.showMoveAttackTargets(stack);

        // Показываем панель действий
        actionPanel.show();

        // Обновляем доступность кнопок
        if (!actionManager.canMove(stack)) {
          actionPanel.disableAction("move");
        } else {
          actionPanel.enableAction("move");
        }

        if (!actionManager.canAct(stack)) {
          actionPanel.disableAction("attack");
          actionPanel.disableAction("defend");
          actionPanel.disableAction("wait");
        } else {
          actionPanel.enableAction("attack");
          actionPanel.enableAction("defend");
          actionPanel.enableAction("wait");
        }
      }
    });
  });

  // --- Переключение хода — только по кнопке ---
  // (убран клик по canvas, чтобы не мешать выделению)

  // --- Ресайз ---
  window.addEventListener("resize", (): void => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    hexGrid.x = (app.screen.width - hexGrid.width) / 2 + padding;
    hexGrid.y = (app.screen.height - hexGrid.height) / 2 + padding + 30;
    turnOrderPanel.y = hexGrid.y + hexGrid.height + 20;
    turnOrderPanel.x = hexGrid.x;
    creatureInfoPanel.x = hexGrid.x - 350;
    creatureInfoPanel.y = hexGrid.y - 50;
    actionPanel.x = hexGrid.x;
    actionPanel.y = turnOrderPanel.y + turnOrderPanel.panelHeight + 10;
    title.x = app.screen.width / 2;
    victoryScreen.resize(app.screen.width, app.screen.height);
  });

  console.log("PixiJS приложение запущено! Кликни для переключения хода.");
})();

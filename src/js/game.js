
const Game = {
  level: 1,
  tubes: [],
  selected: null,
  moves: 0,
  score: 0,
  history: [],
  finished: false,
  animating: false,
  animationId: 0,
  statsRecorded: false,
  limit: 0,
  reward: 0,
  defeatReason: null,

  UNDO_COST: 100,
  TUBE_CAPACITY: 4,

  start(levelNumber = 1) {
    this.animationId++;
    this.animating = false;

    const level = getLevel(levelNumber);

    this.level = levelNumber;
    this.tubes = level.tubes.map(tube => [...tube]);
    this.selected = null;
    this.moves = 0;
    this.score = 0;
    this.history = [];
    this.finished = false;
    this.statsRecorded = false;
    this.defeatReason = null;
    this.limit = level.movesLimit;
    this.reward = level.reward;

    document.querySelectorAll(
      ".topbar, .welcome, .level-card, .puzzle-preview, .play-button, .bottom-nav"
    ).forEach(element => {
      element.style.display = "none";
    });

    const challengesScreen = document.getElementById("challenges-screen");
    if (challengesScreen) challengesScreen.style.display = "none";

    let screen = document.getElementById("game-screen");

    if (!screen) {
      screen = document.createElement("section");
      screen.id = "game-screen";
      document.querySelector(".game-shell").appendChild(screen);
    }

    screen.style.display = "block";
    this.installStyles();

    screen.innerHTML = `
      <header class="game-header">
        <button id="back-game" aria-label="Voltar">←</button>

        <div>
          <span>FASE</span>
          <strong>${String(this.level).padStart(2, "0")}</strong>
        </div>

        <div>
          <span>MOVIMENTOS</span>
          <strong id="move-count">0 / ${this.limit}</strong>
        </div>
      </header>

      <div class="game-resource-bar">
        <div class="game-resource">
          <span>❤️</span>
          <span>VIDAS</span>
          <strong id="game-lives">5/5</strong>
        </div>

        <div class="game-resource">
          <span>🪙</span>
          <span>MOEDAS</span>
          <strong id="game-coins">0</strong>
        </div>
      </div>

      <div class="game-status">
        <h2>Organize as cores!</h2>
        <p>Coloque todas as cores nos tubos corretos.</p>
      </div>

      <div class="game-board" id="game-board"></div>

      <div class="game-actions">
        <button id="undo-move" disabled>
          ↶ Desfazer <span>(100 🪙)</span>
        </button>

        <button id="reset-level">⟳ Reiniciar</button>
      </div>

      <div class="game-score">
        PONTUAÇÃO
        <strong id="current-score">0</strong>
      </div>

      <p class="game-message" id="game-message">
        Toque em um tubo para selecioná-lo.
      </p>

      <div id="game-result"></div>
    `;

    this.render();
    this.updateResources();
    this.bindEvents();
  },

  installStyles() {
    if (document.getElementById("game-improvements")) return;

    const style = document.createElement("style");
    style.id = "game-improvements";

    style.textContent = `
      .game-tube {
        transform-origin: 50% 10%;
        transition: transform .35s ease, box-shadow .3s ease;
        animation: none !important;
        position: relative;
        z-index: 1;
      }

      .game-tube.pouring-active {
        transform:
          translate(var(--pour-x), var(--pour-y))
          rotate(var(--pour-angle));
        transform-origin: 50% 10%;
        z-index: 100;
        transition:
          transform .65s cubic-bezier(.18,.85,.25,1);
      }

      .game-tube.receiving {
        box-shadow: 0 0 20px rgba(66,201,255,.55);
      }

      .game-resource-bar {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin: 0 auto 20px;
      }

      .game-resource {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 9px 13px;
        border-radius: 14px;
        background: linear-gradient(145deg, #242e4d, #171e35);
        border: 1px solid rgba(130,155,210,.22);
        font-size: 12px;
      }

      .game-resource span:first-child {
        font-size: 16px;
      }

      .game-resource span:nth-child(2) {
        color: #929bb5;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .game-resource strong {
        color: #fff;
        font-size: 13px;
      }

      .game-actions button span {
        color: #ffd34e;
        font-size: 10px;
      }

      .game-actions button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      #game-result {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        background: rgba(5, 8, 22, .88);
        backdrop-filter: blur(12px);
      }

      #game-result.active {
        display: flex;
        animation: resultBackdrop .25s ease;
      }

      #game-result .result-card {
        width: 100%;
        max-width: 360px;
        max-height: 90vh;
        overflow-y: auto;
        box-sizing: border-box;
        padding: 30px 22px;
        border-radius: 26px;
        text-align: center;
        background: linear-gradient(145deg, #242c49, #151b31);
        border: 1px solid rgba(100,190,255,.28);
        box-shadow:
          0 20px 70px rgba(0,0,0,.5),
          0 0 35px rgba(66,201,255,.08);
        animation: resultAppear .4s ease;
      }

      #game-result .result-icon {
        font-size: 58px;
        margin-bottom: 12px;
      }

      #game-result .result-card h2 {
        color: white;
        font-size: 23px;
        margin: 8px 0 12px;
      }

      #game-result .result-card p {
        color: #c5cce0;
        margin: 10px 0;
        font-size: 13px;
      }

      #game-result .result-card strong {
        display: block;
        color: #ffd34e;
        font-size: 23px;
        margin: 18px 0;
      }

      #game-result .result-card button {
        width: 100%;
        border: 0;
        border-radius: 15px;
        padding: 16px 14px;
        margin-top: 9px;
        color: white;
        background: linear-gradient(100deg, #ff478e, #ff6c70);
        font-weight: 900;
        font-size: 13px;
        cursor: pointer;
      }

      #game-result .result-card button.secondary {
        color: #dce7ff;
        background: #303b5b;
        border: 1px solid #465476;
      }

      #game-result .result-card button.ad-unavailable {
        color: #929bb5;
        background: #202943;
        border: 1px dashed #465476;
        cursor: not-allowed;
        opacity: .7;
      }

      #game-result .result-card .result-note {
        color: #929bb5;
        font-size: 11px;
        line-height: 1.5;
        margin-top: 14px;
      }

      @keyframes resultBackdrop {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes resultAppear {
        from {
          opacity: 0;
          transform: translateY(25px) scale(.88);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

    document.head.appendChild(style);
  },

  bindEvents() {
    document.getElementById("back-game").onclick = () => this.exit();

    document.getElementById("undo-move").onclick = () => this.undo();

    document.getElementById("reset-level").onclick = () => {
      if (this.finished || this.animating) return;

      this.start(this.level);
    };

    document.getElementById("game-board").onclick = event => {
      const tube = event.target.closest("[data-tube]");
      if (tube) this.select(Number(tube.dataset.tube));
    };
  },

  updateResources() {
    const data = Storage.load();

    const livesElement = document.getElementById("game-lives");
    const coinsElement = document.getElementById("game-coins");

    if (livesElement) {
      livesElement.textContent = `${data.lives}/${data.maxLives}`;
    }

    if (coinsElement) {
      coinsElement.textContent = data.coins;
    }

    const homeCoins = document.getElementById("coin-count");
    if (homeCoins) {
      homeCoins.textContent = data.coins;
    }
  },

  updateUndoButton() {
    const undoButton = document.getElementById("undo-move");

    if (!undoButton) return;

    undoButton.disabled =
      this.history.length === 0 ||
      this.finished ||
      this.animating;
  },

  select(index) {
    if (this.finished || this.animating) return;

    const tube = this.tubes[index];

    if (!tube) return;

    if (this.selected === null) {
      if (tube.length === 0) {
        this.message("Escolha um tubo que tenha líquido.");
        return;
      }

      this.selected = index;

      const element = this.getTubeElement(index);
      if (element) element.classList.add("selected");

      this.message("Agora escolha o tubo de destino.");
      return;
    }

    if (this.selected === index) {
      this.clearSelection();
      this.message("Seleção cancelada.");
      return;
    }

    const from = this.tubes[this.selected];
    const to = this.tubes[index];
    const color = from[from.length - 1];

    if (to.length >= this.TUBE_CAPACITY) {
      this.clearSelection();
      this.message("Este tubo está cheio!");
      return;
    }

    if (to.length > 0 && to[to.length - 1] !== color) {
      this.clearSelection();
      this.message("Você só pode juntar cores iguais!");
      return;
    }

    let amount = 0;

    for (let i = from.length - 1; i >= 0; i--) {
      if (
        from[i] !== color ||
        to.length + amount >= this.TUBE_CAPACITY
      ) {
        break;
      }

      amount++;
    }

    if (amount <= 0) {
      this.clearSelection();
      return;
    }

    const sourceIndex = this.selected;

    this.history.push({
      tubes: this.tubes.map(item => [...item]),
      moves: this.moves,
      score: this.score
    });

    this.updateUndoButton();

    this.clearSelection();
    this.animating = true;
    this.updateUndoButton();

    this.animatePour(sourceIndex, index, color, amount);
  },

  getTubeElement(index) {
    return document.querySelector(
      `#game-board [data-tube="${index}"]`
    );
  },

  clearSelection() {
    document.querySelectorAll(".game-tube.selected").forEach(element => {
      element.classList.remove("selected");
    });

    this.selected = null;
  },

  animatePour(sourceIndex, destinationIndex, color, amount) {
    const source = this.getTubeElement(sourceIndex);
    const destination = this.getTubeElement(destinationIndex);

    if (!source || !destination) {
      this.finishPour(sourceIndex, destinationIndex, color, amount);
      return;
    }

    const sourceRect = source.getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;

    const destinationCenterX =
      destinationRect.left + destinationRect.width / 2;

    const destinationCenterY =
      destinationRect.top + destinationRect.height / 2;

    const deltaX = destinationCenterX - sourceCenterX;
    const deltaY = destinationCenterY - sourceCenterY;

    const moveX = deltaX * 0.58;
    const moveY = deltaY * 0.58;

    let angle =
      Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;

    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;

    angle = Math.max(-145, Math.min(145, angle));

    source.style.setProperty("--pour-x", `${moveX}px`);
    source.style.setProperty("--pour-y", `${moveY}px`);
    source.style.setProperty("--pour-angle", `${angle}deg`);

    destination.classList.add("receiving");

    const currentAnimation = ++this.animationId;

    this.message("Despejando...");
    source.classList.add("pouring-active");

    setTimeout(() => {
      if (currentAnimation !== this.animationId) return;

      source.classList.remove("pouring-active");
      destination.classList.remove("receiving");

      source.style.removeProperty("--pour-x");
      source.style.removeProperty("--pour-y");
      source.style.removeProperty("--pour-angle");

      this.finishPour(sourceIndex, destinationIndex, color, amount);
    }, 950);
  },

  finishPour(sourceIndex, destinationIndex, color, amount) {
    const from = this.tubes[sourceIndex];
    const to = this.tubes[destinationIndex];

    if (!from || !to) {
      this.animating = false;
      this.updateUndoButton();
      return;
    }

    for (let i = 0; i < amount; i++) {
      if (
        from[from.length - 1] === color &&
        to.length < this.TUBE_CAPACITY
      ) {
        to.push(from.pop());
      }
    }

    this.moves++;
    this.score += 10;
    this.animating = false;

    this.updateTube(sourceIndex);
    this.updateTube(destinationIndex);

    const moveCount = document.getElementById("move-count");
    const scoreElement = document.getElementById("current-score");

    if (moveCount) {
      moveCount.textContent = `${this.moves} / ${this.limit}`;
    }

    if (scoreElement) {
      scoreElement.textContent = this.score;
    }

    this.updateUndoButton();

    this.message("Boa jogada!");
    this.checkWin();
  },

  updateTube(index) {
    const element = this.getTubeElement(index);
    if (!element) return;

    const tube = this.tubes[index];

    element.innerHTML = [...tube].reverse().map(color => `
      <div class="liquid ${color}"></div>
    `).join("");
  },

  undo() {
    if (this.finished || this.animating) return;

    const previous = this.history[this.history.length - 1];

    if (!previous) {
      this.message("Não há movimentos para desfazer.");
      this.updateUndoButton();
      return;
    }

    const balance = Storage.spendCoins(this.UNDO_COST);

    if (balance === false) {
      this.message("Você precisa de 100 moedas para desfazer.");
      return;
    }

    this.history.pop();

    this.tubes = previous.tubes;
    this.moves = previous.moves;
    this.score = previous.score;
    this.selected = null;

    this.render();
    this.updateResources();
    this.updateUndoButton();

    this.message("Movimento desfeito! 100 moedas utilizadas.");
  },

  render() {
    const board = document.getElementById("game-board");
    if (!board) return;

    board.innerHTML = this.tubes.map((tube, index) => {
      const liquidHTML = [...tube].reverse().map(color => `
        <div class="liquid ${color}"></div>
      `).join("");

      return `
        <div class="tube game-tube" data-tube="${index}">
          ${liquidHTML}
        </div>
      `;
    }).join("");

    const moveCount = document.getElementById("move-count");
    const scoreElement = document.getElementById("current-score");

    if (moveCount) {
      moveCount.textContent = `${this.moves} / ${this.limit}`;
    }

    if (scoreElement) {
      scoreElement.textContent = this.score;
    }

    this.updateUndoButton();
  },

  hasValidMoves() {
    for (let fromIndex = 0; fromIndex < this.tubes.length; fromIndex++) {
      const from = this.tubes[fromIndex];

      if (from.length === 0) continue;

      const color = from[from.length - 1];

      for (let toIndex = 0; toIndex < this.tubes.length; toIndex++) {
        if (fromIndex === toIndex) continue;

        const to = this.tubes[toIndex];

        if (to.length >= this.TUBE_CAPACITY) continue;

        if (
          to.length === 0 ||
          to[to.length - 1] === color
        ) {
          return true;
        }
      }
    }

    return false;
  },

  checkWin() {
    const won = this.tubes.every(tube =>
      tube.length === 0 ||
      (
        tube.length === this.TUBE_CAPACITY &&
        tube.every(color => color === tube[0])
      )
    );

    if (won) {
      this.finishVictory();
      return;
    }

    if (this.moves >= this.limit) {
      this.showDefeat("Você atingiu o limite de movimentos.");
      return;
    }

    if (!this.hasValidMoves()) {
      this.showDefeat("Não existem mais jogadas possíveis neste tabuleiro.");
    }
  },

  finishVictory() {
    this.finished = true;
    this.updateUndoButton();

    this.score += this.reward;

    const scoreElement = document.getElementById("current-score");
    if (scoreElement) scoreElement.textContent = this.score;

    if (!this.statsRecorded) {
      this.statsRecorded = true;

      if (window.Scoring) {
        Scoring.recordCompletion(this.score, this.moves)
          .then(success => {
            if (success) {
              console.log(
                `COLOR SORT: Fase ${this.level} registrada no ranking!`
              );
            }
          })
          .catch(error => {
            console.error(
              "COLOR SORT: Falha ao registrar a fase no ranking:",
              error
            );
          });
      } else {
        console.error("COLOR SORT: Sistema de pontuação não encontrado.");
      }

      if (window.Challenges) {
        try {
          const result = Challenges.onLevelCompleted(
            this.score,
            this.moves,
            this.level
          );

          if (result) {
            console.log("COLOR SORT: Desafios atualizados!", result);
          }
        } catch (error) {
          console.error(
            "COLOR SORT: Erro ao atualizar desafios:",
            error
          );
        }
      } else {
        console.error("COLOR SORT: Sistema de desafios não encontrado.");
      }
    }

    this.updateResources();

    const result = document.getElementById("game-result");

    result.innerHTML = `
      <div class="result-card">
        <div class="result-icon">🏆</div>
        <h2>FASE CONCLUÍDA!</h2>
        <p>Você organizou todas as cores!</p>
        <strong>+${(window.Challenges && Challenges.lastReward !== undefined) ? Challenges.lastReward : this.reward} moedas</strong>
        <p>Pontuação: ${this.score}</p>
        <button id="next-level">PRÓXIMA FASE →</button>
      </div>
    `;

    result.classList.add("active");

    document.getElementById("next-level").onclick = () => {
      this.start(this.level + 1);
    };
  },

  showDefeat(reason) {
    if (this.finished) return;

    this.finished = true;
    this.defeatReason = reason;
    this.updateUndoButton();

    const data = Storage.load();
    const result = document.getElementById("game-result");

    if (!result) return;

    const noLives = data.lives <= 0;

    result.innerHTML = `
      <div class="result-card">
        <div class="result-icon">${noLives ? "💔" : "⚠️"}</div>

        <h2>${noLives ? "SEM VIDAS!" : "FIM DE JOGO"}</h2>

        <p>${reason}</p>

        <p>Vidas disponíveis: ${data.lives}/${data.maxLives}</p>

        ${
          noLives
            ? `
              <p>Você não tem mais vidas disponíveis.</p>
              <button id="exit-no-lives">VOLTAR AO INÍCIO</button>
            `
            : `
              <button class="ad-unavailable" disabled>
                ▶ CONTINUAR COM ANÚNCIO
              </button>

              <p class="result-note">
                O anúncio recompensado real ainda será integrado.
                Nenhuma recompensa será concedida sem a confirmação
                do AdMob.
              </p>

              <button id="lose-life-retry">
                PERDER 1 VIDA E REINICIAR
              </button>

              <button class="secondary" id="exit-defeat">
                VOLTAR AO INÍCIO
              </button>
            `
        }
      </div>
    `;

    result.classList.add("active");

    if (noLives) {
      document.getElementById("exit-no-lives").onclick = () => {
        this.exit();
      };

      return;
    }

    document.getElementById("lose-life-retry").onclick = () => {
      this.loseLifeAndRestart();
    };

    document.getElementById("exit-defeat").onclick = () => {
      this.exit();
    };
  },

  loseLifeAndRestart() {
    const remainingLives = Storage.loseLife();

    if (remainingLives === false) {
      this.message("Não foi possível atualizar suas vidas.");
      return;
    }

    this.updateResources();

    if (remainingLives <= 0) {
      this.finished = true;

      const result = document.getElementById("game-result");

      result.innerHTML = `
        <div class="result-card">
          <div class="result-icon">💔</div>
          <h2>SUAS VIDAS ACABARAM</h2>
          <p>Você perdeu sua última vida.</p>
          <p>Volte quando tiver novas vidas disponíveis.</p>
          <button id="exit-no-lives">VOLTAR AO INÍCIO</button>
        </div>
      `;

      result.classList.add("active");

      document.getElementById("exit-no-lives").onclick = () => {
        this.exit();
      };

      return;
    }

    this.start(this.level);
  },

  message(text) {
    const element = document.getElementById("game-message");
    if (element) element.textContent = text;
  },

  exit() {
    this.animationId++;
    this.animating = false;
    this.selected = null;

    const screen = document.getElementById("game-screen");
    if (screen) screen.style.display = "none";

    document.querySelectorAll(
      ".topbar, .welcome, .level-card, .puzzle-preview, .play-button, .bottom-nav"
    ).forEach(element => {
      element.style.display = "";
    });

    this.updateResources();
  }
};

window.Game = Game;


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
  pourRafId: null,
  statsRecorded: false,
  limit: 0,
  reward: 0,
  defeatReason: null,

  UNDO_COST: 100,
  TUBE_CAPACITY: 4,

  POUR_COLORS: {
    blue: { main: "#36c4ff", light: "#9ce8ff", deep: "#1183d6" },
    pink: { main: "#ff458e", light: "#ff9ec4", deep: "#c21b60" },
    yellow: { main: "#ffca3a", light: "#fff09c", deep: "#c9850c" },
    purple: { main: "#9c6cff", light: "#d7c2ff", deep: "#6632c9" },
    green: { main: "#2ed69b", light: "#9bf7d6", deep: "#0e9968" },
    orange: { main: "#ff7926", light: "#ffc48f", deep: "#cc4806" }
  },

  start(levelNumber = 1) {
    this.animationId++;
    this.cancelActivePour();
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

    screen.innerHTML = `
      ${this.getLabBackdropHTML()}

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

      <section class="lab-stage" aria-hidden="false">
        <div class="lab-scientist" id="lab-scientist" aria-hidden="true">
          ${this.getScientistHTML("game-sci")}
        </div>

        <div class="game-status">
          <span class="lab-status-tag">LAB CROMÁTICO</span>
          <h2>Organize as cores!</h2>
          <p>Coloque todas as cores nos tubos corretos.</p>
        </div>
      </section>

      <div class="game-board-stage" id="game-board-stage">
        <div class="lab-workbench" aria-hidden="true"></div>
        <div class="game-board" id="game-board"></div>
        <svg class="pour-fx-layer" id="pour-fx-layer" aria-hidden="true"></svg>
      </div>

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

  getLabBackdropHTML() {
    return `
      <div class="lab-backdrop" id="lab-backdrop" aria-hidden="true">
        <svg class="lab-room-svg" viewBox="0 0 480 860" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lab-wall-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#17244d" />
              <stop offset="48%" stop-color="#0f1838" />
              <stop offset="100%" stop-color="#090e22" />
            </linearGradient>
            <radialGradient id="lab-ceiling-glow" cx="50%" cy="6%" r="55%">
              <stop offset="0%" stop-color="#48d1ff" stop-opacity="0.32" />
              <stop offset="55%" stop-color="#5d6dff" stop-opacity="0.1" />
              <stop offset="100%" stop-color="#0b1021" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="lab-window-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1d3670" stop-opacity="0.7" />
              <stop offset="100%" stop-color="#101b3d" stop-opacity="0.35" />
            </linearGradient>
            <linearGradient id="lab-shelf-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#354980" />
              <stop offset="100%" stop-color="#1c274d" />
            </linearGradient>
            <linearGradient id="lab-counter-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#22315e" />
              <stop offset="18%" stop-color="#141e3f" />
              <stop offset="100%" stop-color="#090e20" />
            </linearGradient>
          </defs>

          <rect width="480" height="860" fill="url(#lab-wall-grad)" />
          <rect width="480" height="520" fill="url(#lab-ceiling-glow)" />

          <!-- Painéis arquitetônicos em perspectiva suave -->
          <path d="M0 0 L70 95 L70 590 L0 650 Z" fill="#0d1531" opacity="0.55" />
          <path d="M480 0 L410 95 L410 590 L480 650 Z" fill="#0d1531" opacity="0.55" />
          <line x1="70" y1="95" x2="410" y2="95" stroke="#3c5899" stroke-opacity="0.22" stroke-width="1.5" />

          <!-- Janela / Painel luminoso central -->
          <rect x="132" y="108" width="216" height="132" rx="18" fill="url(#lab-window-grad)" stroke="#4c78c9" stroke-opacity="0.28" stroke-width="1.5" />
          <line x1="154" y1="142" x2="326" y2="142" stroke="#48d1ff" stroke-opacity="0.12" stroke-width="1" />
          <line x1="154" y1="176" x2="326" y2="176" stroke="#48d1ff" stroke-opacity="0.12" stroke-width="1" />
          <line x1="154" y1="210" x2="326" y2="210" stroke="#48d1ff" stroke-opacity="0.12" stroke-width="1" />
          <circle cx="298" cy="134" r="14" fill="#38c8ff" fill-opacity="0.14" />

          <!-- Prateleira esquerda com frascos fora de foco -->
          <g opacity="0.62">
            <rect x="26" y="218" width="88" height="9" rx="4" fill="url(#lab-shelf-grad)" />
            <rect x="38" y="182" width="18" height="36" rx="7" fill="#38c8ff" fill-opacity="0.22" stroke="#8adfff" stroke-opacity="0.35" stroke-width="1.2" />
            <rect x="40" y="198" width="14" height="18" rx="5" fill="#38c8ff" fill-opacity="0.55" />
            <path d="M72 178 L82 178 L89 218 L65 218 Z" fill="#ff4b8f" fill-opacity="0.22" stroke="#ff9bc2" stroke-opacity="0.35" stroke-width="1.2" />
            <path d="M68 201 L86 201 L88 217 L66 217 Z" fill="#ff4b8f" fill-opacity="0.52" />
          </g>

          <!-- Prateleira direita com frascos fora de foco -->
          <g opacity="0.62">
            <rect x="366" y="218" width="88" height="9" rx="4" fill="url(#lab-shelf-grad)" />
            <circle cx="390" cy="202" r="15" fill="#a272ff" fill-opacity="0.22" stroke="#ceb5ff" stroke-opacity="0.35" stroke-width="1.2" />
            <rect x="385" y="178" width="10" height="12" rx="3" fill="#a272ff" fill-opacity="0.24" stroke="#ceb5ff" stroke-opacity="0.35" stroke-width="1" />
            <path d="M377 204 Q390 215 403 204 A14 14 0 0 1 377 204 Z" fill="#a272ff" fill-opacity="0.58" />
            <rect x="418" y="184" width="17" height="34" rx="7" fill="#3ce0a8" fill-opacity="0.2" stroke="#9bf5d4" stroke-opacity="0.35" stroke-width="1.2" />
            <rect x="420" y="198" width="13" height="18" rx="5" fill="#3ce0a8" fill-opacity="0.52" />
          </g>

          <!-- Luminária suspensa suave -->
          <path d="M188 0 L292 0 L318 28 L162 28 Z" fill="#1e2d5a" opacity="0.85" />
          <rect x="176" y="26" width="128" height="6" rx="3" fill="#6fe0ff" opacity="0.55" />

          <!-- Bancada inferior do laboratório -->
          <rect x="0" y="585" width="480" height="275" fill="url(#lab-counter-grad)" />
          <line x1="0" y1="585" x2="480" y2="585" stroke="#5aaeff" stroke-opacity="0.3" stroke-width="2" />
        </svg>
      </div>
    `;
  },

  getScientistHTML(idPrefix = "sci") {
    const skinId = `${idPrefix}-skin`;
    const hairId = `${idPrefix}-hair`;
    const coatId = `${idPrefix}-coat`;
    const goggleLensId = `${idPrefix}-goggle-lens`;
    const flaskLiqId = `${idPrefix}-flask-liq`;
    const deskGlowId = `${idPrefix}-desk-glow`;

    return `
      <svg class="scientist-svg" viewBox="0 0 180 156" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="${skinId}" cx="42%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#ffd9bd" />
            <stop offset="68%" stop-color="#f4b792" />
            <stop offset="100%" stop-color="#dc916b" />
          </radialGradient>
          <linearGradient id="${hairId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#4e6094" />
            <stop offset="60%" stop-color="#2c3761" />
            <stop offset="100%" stop-color="#192140" />
          </linearGradient>
          <linearGradient id="${coatId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="70%" stop-color="#dfe8ff" />
            <stop offset="100%" stop-color="#b7c6eb" />
          </linearGradient>
          <linearGradient id="${goggleLensId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#b3f2ff" stop-opacity="0.72" />
            <stop offset="100%" stop-color="#38c8ff" stop-opacity="0.38" />
          </linearGradient>
          <linearGradient id="${flaskLiqId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5ce1ff" />
            <stop offset="100%" stop-color="#a272ff" />
          </linearGradient>
          <radialGradient id="${deskGlowId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38c8ff" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#38c8ff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Sombra no balcão -->
        <ellipse cx="78" cy="144" rx="54" ry="8" fill="#060a18" opacity="0.55" />
        <ellipse cx="144" cy="142" rx="22" ry="6" fill="url(#${deskGlowId})" />

        <!-- Corpo com respiração em loop -->
        <g class="sci-body">
          <!-- Jaleco 3D -->
          <path d="M36 142 C36 105 46 88 78 88 C110 88 120 105 120 142 Z" fill="url(#${coatId})" />
          <!-- Camisa interna -->
          <path d="M68 88 L88 88 L82 126 L74 126 Z" fill="#2c539e" />
          <!-- Gola -->
          <path d="M62 88 L74 108 L66 112 L54 92 Z" fill="#eef4ff" />
          <path d="M94 88 L82 108 L90 112 L102 92 Z" fill="#eef4ff" />
          <!-- Bolso e caneta -->
          <rect x="92" y="114" width="16" height="14" rx="3" fill="#cddaf7" />
          <rect x="96" y="106" width="3.5" height="10" rx="1.5" fill="#ff4b8f" />
          <rect x="102" y="108" width="3.5" height="8" rx="1.5" fill="#38c8ff" />

          <!-- Braço esquerdo apoiado -->
          <path d="M44 102 C31 112 31 128 44 134" fill="none" stroke="#dce6ff" stroke-width="13" stroke-linecap="round" />
          <circle cx="46" cy="134" r="6.5" fill="#38c8ff" />

          <!-- Braço direito segurando pipeta / agitando -->
          <g class="sci-arm-right">
            <path d="M111 100 C125 104 131 115 128 123" fill="none" stroke="#eef4ff" stroke-width="12" stroke-linecap="round" />
            <circle cx="128" cy="123" r="6.5" fill="#38c8ff" />
            <!-- Tubo/pipeta na mão -->
            <rect x="125" y="96" width="6" height="24" rx="3" transform="rotate(14 128 108)" fill="#d6f4ff" fill-opacity="0.8" stroke="#ffffff" stroke-width="1" />
            <rect x="126" y="107" width="4" height="11" rx="2" transform="rotate(14 128 108)" fill="#ff4b8f" />
          </g>

          <!-- Cabeça e rosto carismático -->
          <g class="sci-head">
            <!-- Pescoço -->
            <rect x="70" y="76" width="16" height="16" rx="7" fill="#e29d77" />
            <!-- Orelhas -->
            <circle cx="44" cy="57" r="7.5" fill="#ebb08c" />
            <circle cx="112" cy="57" r="7.5" fill="#ebb08c" />

            <!-- Cabelo traseiro e topete estiloso -->
            <path d="M43 52 C41 24 62 12 80 14 C102 15 117 29 113 54 C107 38 92 31 76 31 C60 31 48 40 43 52 Z" fill="url(#${hairId})" />
            <path d="M62 16 C70 5 92 7 98 18 C88 15 76 16 62 16 Z" fill="#5e73b0" />

            <!-- Rosto -->
            <rect x="46" y="26" width="64" height="58" rx="29" fill="url(#${skinId})" />

            <!-- Bochechas -->
            <ellipse cx="57" cy="64" rx="5.5" ry="3.2" fill="#ff788c" opacity="0.35" />
            <ellipse cx="99" cy="64" rx="5.5" ry="3.2" fill="#ff788c" opacity="0.35" />

            <!-- Sobrancelhas -->
            <path d="M56 44 Q63 40 69 43" fill="none" stroke="#2c3761" stroke-width="2.6" stroke-linecap="round" />
            <path d="M87 43 Q93 40 100 44" fill="none" stroke="#2c3761" stroke-width="2.6" stroke-linecap="round" />

            <!-- Óculos de proteção 3D cartoon -->
            <rect x="50" y="45" width="25" height="20" rx="9" fill="url(#${goggleLensId})" stroke="#293866" stroke-width="3" />
            <rect x="81" y="45" width="25" height="20" rx="9" fill="url(#${goggleLensId})" stroke="#293866" stroke-width="3" />
            <path d="M75 54 Q78 52 81 54" fill="none" stroke="#293866" stroke-width="3" />

            <!-- Olhos com piscar suave -->
            <g class="sci-eyes">
              <circle cx="62.5" cy="55" r="4.2" fill="#18203c" />
              <circle cx="64" cy="53.5" r="1.5" fill="#ffffff" />
              <circle cx="93.5" cy="55" r="4.2" fill="#18203c" />
              <circle cx="95" cy="53.5" r="1.5" fill="#ffffff" />
            </g>

            <!-- Reflexo nas lentes dos óculos -->
            <path d="M55 49 L62 49" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7" />
            <path d="M86 49 L93 49" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7" />

            <!-- Nariz e sorriso simpático -->
            <ellipse cx="78" cy="61" rx="3" ry="2.2" fill="#dc916b" />
            <path d="M69 68 Q78 75 87 68" fill="none" stroke="#7a3b2e" stroke-width="2.6" stroke-linecap="round" />
          </g>
        </g>

        <!-- Frasco Erlenmeyer borbulhante na bancada lateral -->
        <g class="sci-flask">
          <path d="M138 102 L150 102 L150 112 L163 134 C165 138 162 142 157 142 L131 142 C126 142 123 138 125 134 L138 112 Z"
            fill="#d9f5ff" fill-opacity="0.18" stroke="#9ee4ff" stroke-opacity="0.65" stroke-width="1.6" />
          <path d="M131 124 L157 124 L161 134 C162 137 160 139 156 139 L132 139 C128 139 126 137 127 134 Z"
            fill="url(#${flaskLiqId})" class="sci-flask-liquid" />
          <ellipse cx="144" cy="102" rx="7.5" ry="2.4" fill="#c7f0ff" fill-opacity="0.4" stroke="#b9ecff" stroke-width="1.2" />
          <!-- Bolhas animadas em loop -->
          <circle class="sci-bubble sci-b1" cx="140" cy="128" r="2.3" fill="#9cf3ff" />
          <circle class="sci-bubble sci-b2" cx="148" cy="131" r="1.9" fill="#ffd24a" />
          <circle class="sci-bubble sci-b3" cx="144" cy="126" r="2.6" fill="#ffffff" />
        </g>
      </svg>
    `;
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

  cancelActivePour() {
    if (this.pourRafId !== null) {
      cancelAnimationFrame(this.pourRafId);
      this.pourRafId = null;
    }

    const fxLayer = document.getElementById("pour-fx-layer");
    if (fxLayer) {
      fxLayer.innerHTML = "";
    }

    document.querySelectorAll(".game-tube").forEach(tube => {
      tube.classList.remove("pouring-active", "pouring-source", "receiving");
      tube.style.transform = "";
      tube.style.transformOrigin = "";
      tube.style.zIndex = "";
      tube.style.willChange = "";
    });
  },

  preparePourDOM(source, destination, sourceIndex, destinationIndex, color, amount) {
    const fromTube = this.tubes[sourceIndex];
    const toTube = this.tubes[destinationIndex];

    const remainingSource = fromTube.slice(0, fromTube.length - amount);
    const remainingHTML = [...remainingSource].reverse().map(c => `
      <div class="liquid ${c}"></div>
    `).join("");

    source.innerHTML = `
      <div class="liquid ${color} pouring-drain" data-pour-drain="true"></div>
      ${remainingHTML}
    `;

    const existingDestHTML = [...toTube].reverse().map(c => `
      <div class="liquid ${c}"></div>
    `).join("");

    destination.innerHTML = `
      <div class="liquid ${color} pouring-fill" data-pour-fill="true" style="display: none; height: 0px;">
        <span class="pour-ripple-wave" data-pour-wave="true"></span>
      </div>
      ${existingDestHTML}
    `;

    return {
      drainEl: source.querySelector("[data-pour-drain]"),
      fillEl: destination.querySelector("[data-pour-fill]"),
      waveEl: destination.querySelector("[data-pour-wave]")
    };
  },

  animatePour(sourceIndex, destinationIndex, color, amount) {
    const source = this.getTubeElement(sourceIndex);
    const destination = this.getTubeElement(destinationIndex);
    const stage = document.getElementById("game-board-stage");
    const fxLayer = document.getElementById("pour-fx-layer");

    if (!source || !destination || !stage || !fxLayer) {
      this.finishPour(sourceIndex, destinationIndex, color, amount);
      return;
    }

    this.cancelActivePour();

    const currentAnimation = ++this.animationId;
    const palette = this.POUR_COLORS[color] || this.POUR_COLORS.blue;

    // Leituras geométricas únicas antes do loop rAF (evita layout thrashing)
    const stageRect = stage.getBoundingClientRect();
    const srcRect = source.getBoundingClientRect();
    const dstRect = destination.getBoundingClientRect();

    const srcStyles = getComputedStyle(source);
    const dstStyles = getComputedStyle(destination);

    const srcPadTop = parseFloat(srcStyles.paddingTop) || 11;
    const srcPadBottom = parseFloat(srcStyles.paddingBottom) || 6;
    const srcInnerH = Math.max(40, srcRect.height - srcPadTop - srcPadBottom);

    const dstPadTop = parseFloat(dstStyles.paddingTop) || 11;
    const dstPadBottom = parseFloat(dstStyles.paddingBottom) || 6;
    const dstInnerH = Math.max(40, dstRect.height - dstPadTop - dstPadBottom);

    const gapPx = 1;
    const srcUnitH = (srcInnerH - (this.TUBE_CAPACITY - 1) * gapPx) / this.TUBE_CAPACITY;
    const dstUnitH = (dstInnerH - (this.TUBE_CAPACITY - 1) * gapPx) / this.TUBE_CAPACITY;

    const unitHeightSum = (units, unitH) =>
      units <= 0 ? 0 : units * unitH + Math.max(0, units - 1) * gapPx;

    const initialDrainPx = unitHeightSum(amount, srcUnitH);
    const targetFillPx = unitHeightSum(amount, dstUnitH);

    const srcCenterX = srcRect.left - stageRect.left + srcRect.width * 0.5;
    const srcOriginY = srcRect.top - stageRect.top + 8;

    const dstCenterX = dstRect.left - stageRect.left + dstRect.width * 0.5;
    const dstTopY = dstRect.top - stageRect.top;
    const dstBottomY = dstTopY + dstRect.height - dstPadBottom;

    const dxCenter = dstCenterX - srcCenterX;
    const dir = Math.abs(dxCenter) > 8
      ? (dxCenter > 0 ? 1 : -1)
      : (srcCenterX < stageRect.width * 0.5 ? 1 : -1);

    const pourAngle = dir * (amount >= 3 ? 68 : 62);
    const rad = (pourAngle * Math.PI) / 180;

    // Ponto do bocal no referencial local da origem (50%, 8px)
    const lipLocalX = dir * (srcRect.width * 0.43);
    const lipLocalY = -8;
    const rotatedLipX = lipLocalX * Math.cos(rad) - lipLocalY * Math.sin(rad);
    const rotatedLipY = lipLocalX * Math.sin(rad) + lipLocalY * Math.cos(rad);

    const desiredLipX = dstCenterX - dir * 10;
    const desiredLipY = Math.max(-36, dstTopY - 24);

    const targetTx = desiredLipX - (srcCenterX + rotatedLipX);
    const targetTy = desiredLipY - (srcOriginY + rotatedLipY);

    const { drainEl, fillEl, waveEl } = this.preparePourDOM(
      source,
      destination,
      sourceIndex,
      destinationIndex,
      color,
      amount
    );

    if (drainEl) {
      drainEl.style.height = `${initialDrainPx}px`;
    }

    // Prepara SVG de fluxo curvado e impacto
    fxLayer.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
    fxLayer.innerHTML = `
      <defs>
        <linearGradient id="pour-stream-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.light}" />
          <stop offset="40%" stop-color="${palette.main}" />
          <stop offset="100%" stop-color="${palette.deep}" />
        </linearGradient>
      </defs>
      <path id="pour-stream-glow" fill="none" stroke="${palette.main}" stroke-width="11" stroke-linecap="round" stroke-opacity="0.28" pathLength="100" />
      <path id="pour-stream-main" fill="none" stroke="url(#pour-stream-grad)" stroke-width="6.5" stroke-linecap="round" pathLength="100" />
      <path id="pour-stream-shine" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.65" pathLength="100" />
      <ellipse id="pour-splash-ring" cx="${dstCenterX}" cy="${dstBottomY}" rx="12" ry="3.5" fill="none" stroke="${palette.light}" stroke-width="2" opacity="0" />
    `;

    const streamGlow = fxLayer.querySelector("#pour-stream-glow");
    const streamMain = fxLayer.querySelector("#pour-stream-main");
    const streamShine = fxLayer.querySelector("#pour-stream-shine");
    const splashRing = fxLayer.querySelector("#pour-splash-ring");

    source.style.transformOrigin = "50% 8px";
    source.style.zIndex = "100";
    source.style.willChange = "transform";
    source.classList.add("pouring-active", "pouring-source");
    destination.classList.add("receiving");

    this.message("Despejando...");

    // Durações proporcionais à quantidade transferida (1, 2, 3 ou 4 unidades)
    const approachMs = 210;
    const pourMs = Math.max(240, amount * 210);
    const returnMs = 230;
    const totalMs = approachMs + pourMs + returnMs;

    const initialDestCount = this.tubes[destinationIndex].length;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = t =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    let startTime = null;

    const tick = now => {
      if (currentAnimation !== this.animationId) return;

      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      let tx = 0;
      let ty = 0;
      let angle = 0;
      let drainRatio = 0;
      let fillRatio = 0;
      let streamStart = 0;
      let streamEnd = 0;
      let waveAmp = 0;

      if (elapsed <= approachMs) {
        // Etapa 1: Inclinação suave do tubo de origem
        const k = easeOutCubic(clamp01(elapsed / approachMs));
        tx = targetTx * k;
        ty = targetTy * k;
        angle = pourAngle * k;
      } else if (elapsed <= approachMs + pourMs) {
        // Etapas 2, 3, 4, 5 e 6: Transferência contínua, fluxo curvado, entrada e ondulação
        tx = targetTx;
        ty = targetTy;
        angle = pourAngle;

        const p = clamp01((elapsed - approachMs) / pourMs);
        drainRatio = clamp01((p - 0.03) / 0.89);
        fillRatio = clamp01((p - 0.11) / 0.85);

        streamStart = p > 0.86 ? clamp01((p - 0.86) / 0.14) : 0;
        streamEnd = p < 0.13 ? clamp01(p / 0.13) : 1;
        waveAmp = fillRatio > 0 ? 1 : 0;
      } else {
        // Etapa 7: Retorno suave do tubo e amortecimento da superfície
        const r = easeInOutCubic(
          clamp01((elapsed - approachMs - pourMs) / returnMs)
        );
        tx = targetTx * (1 - r);
        ty = targetTy * (1 - r);
        angle = pourAngle * (1 - r);

        drainRatio = 1;
        fillRatio = 1;
        streamStart = 1;
        streamEnd = 1;
        waveAmp = Math.max(0, 1 - r * 1.4);
      }

      // Atualiza posição e inclinação do tubo de origem
      source.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${angle.toFixed(2)}deg)`;

      // Atualiza nível contínuo de saída na origem
      if (drainEl) {
        const currentDrainPx = initialDrainPx * (1 - drainRatio);
        if (currentDrainPx <= 0.4) {
          drainEl.style.display = "none";
          drainEl.style.height = "0px";
        } else {
          drainEl.style.display = "";
          drainEl.style.height = `${currentDrainPx.toFixed(2)}px`;
        }
      }

      // Atualiza nível contínuo de entrada no destino + ondulação da superfície
      if (fillEl) {
        const currentFillPx = targetFillPx * fillRatio;
        if (currentFillPx <= 0.4) {
          fillEl.style.display = "none";
          fillEl.style.height = "0px";
        } else {
          fillEl.style.display = "";
          fillEl.style.height = `${currentFillPx.toFixed(2)}px`;
        }
      }

      if (waveEl) {
        if (waveAmp > 0.02 && fillRatio > 0) {
          const wavePhase = elapsed * 0.026;
          const waveY = Math.sin(wavePhase) * 2.1 * waveAmp;
          const waveScaleY = 1 + Math.cos(wavePhase * 1.5) * 0.35 * waveAmp;
          const waveSkew = Math.sin(wavePhase * 0.9) * 5 * waveAmp;
          waveEl.style.opacity = String(Math.min(1, 0.55 + waveAmp * 0.45));
          waveEl.style.transform = `translateY(${waveY.toFixed(2)}px) scaleY(${waveScaleY.toFixed(3)}) skewX(${waveSkew.toFixed(2)}deg)`;
        } else {
          waveEl.style.opacity = "0";
          waveEl.style.transform = "";
        }
      }

      // Atualiza fluxo curvado SVG sincronizado com o bocal e o nível de destino
      const curRad = (angle * Math.PI) / 180;
      const curLipX = lipLocalX * Math.cos(curRad) - lipLocalY * Math.sin(curRad);
      const curLipY = lipLocalX * Math.sin(curRad) + lipLocalY * Math.cos(curRad);

      const spoutX = srcCenterX + tx + curLipX;
      const spoutY = srcOriginY + ty + curLipY;

      const currentDestUnits = initialDestCount + amount * fillRatio;
      const currentDestFillPx = unitHeightSum(currentDestUnits, dstUnitH);
      const surfaceY = dstBottomY - currentDestFillPx;

      const visibleLen = Math.max(0, streamEnd - streamStart) * 100;

      if (visibleLen > 0.5) {
        const ctrlX = spoutX + (dstCenterX - spoutX) * 0.88;
        const ctrlY = spoutY + Math.max(10, (surfaceY - spoutY) * 0.16);
        const pathData = `M ${spoutX.toFixed(1)} ${spoutY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${dstCenterX.toFixed(1)} ${surfaceY.toFixed(1)}`;

        const dashArray = `${visibleLen.toFixed(2)} 200`;
        const dashOffset = `${(-streamStart * 100).toFixed(2)}`;
        const flowPulse = 5.8 + Math.sin(elapsed * 0.03) * 0.8;

        [streamGlow, streamMain, streamShine].forEach(pathEl => {
          if (!pathEl) return;
          pathEl.setAttribute("d", pathData);
          pathEl.style.strokeDasharray = dashArray;
          pathEl.style.strokeDashoffset = dashOffset;
          pathEl.style.opacity = "1";
        });

        if (streamMain) streamMain.setAttribute("stroke-width", flowPulse.toFixed(2));
        if (streamGlow) streamGlow.setAttribute("stroke-width", (flowPulse + 4.5).toFixed(2));

        if (splashRing) {
          const splashPulse = (Math.sin(elapsed * 0.035) + 1) * 0.5;
          const rx = 8 + splashPulse * 6;
          splashRing.setAttribute("cy", surfaceY.toFixed(1));
          splashRing.setAttribute("rx", rx.toFixed(1));
          splashRing.setAttribute("opacity", (fillRatio > 0 && streamStart < 0.6 ? 0.65 - splashPulse * 0.3 : 0).toFixed(2));
        }
      } else {
        [streamGlow, streamMain, streamShine].forEach(pathEl => {
          if (pathEl) pathEl.style.opacity = "0";
        });
        if (splashRing) splashRing.setAttribute("opacity", "0");
      }

      if (elapsed < totalMs) {
        this.pourRafId = requestAnimationFrame(tick);
      } else {
        this.pourRafId = null;
        this.cancelActivePour();
        this.finishPour(sourceIndex, destinationIndex, color, amount);
      }
    };

    this.pourRafId = requestAnimationFrame(tick);
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
    this.cancelActivePour();
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


const Ranking = {
  players: [],
  filter: "global",
  loading: false,

  positionFields: {
    global: "global_position",
    neighborhood: "neighborhood_position",
    city: "city_position",
    state: "state_position",
    country: "country_position"
  },

  async load() {
    this.loading = true;

    try {
      const profile = Auth.profile || {};
      const locationValue = profile[this.filter];

      if (
        this.filter !== "global" &&
        (!locationValue || !locationValue.trim())
      ) {
        this.players = [];
        return this.players;
      }

      let query = supabaseClient
        .from("leaderboard")
        .select("*")
        .order("total_score", { ascending: false })
        .order("levels_completed", { ascending: false })
        .order("total_moves", { ascending: true })
        .limit(100);

      if (this.filter !== "global") {
        query = query.eq(this.filter, locationValue);
      }

      const { data, error } = await query;

      if (error) throw error;

      const players = data || [];

      // Busca também o próprio jogador, mesmo fora dos 100 primeiros.
      let ownQuery = supabaseClient
        .from("leaderboard")
        .select("*")
        .eq("user_id", Auth.user.id);

      if (this.filter !== "global") {
        ownQuery = ownQuery.eq(this.filter, locationValue);
      }

      const { data: ownPlayer, error: ownError } =
        await ownQuery.maybeSingle();

      if (ownError) throw ownError;

      if (
        ownPlayer &&
        !players.some(player => player.user_id === ownPlayer.user_id)
      ) {
        players.push(ownPlayer);
      }

      const positionField = this.positionFields[this.filter];

      players.sort((a, b) => {
        return Number(a[positionField] || 999999) -
          Number(b[positionField] || 999999);
      });

      this.players = players;

      console.log("COLOR SORT: Ranking carregado!", this.players);

      return this.players;

    } catch (error) {
      console.error("Erro ao carregar ranking:", error.message);
      this.players = [];
      return [];

    } finally {
      this.loading = false;
    }
  },

  getPosition(player) {
    const field = this.positionFields[this.filter];
    return Number(player[field] || 0);
  },

  async show() {
    if (!Auth.user) {
      AuthUI.show("login");
      return;
    }

    await this.load();
    this.render();
  },

  render() {
    let screen = document.getElementById("ranking-screen");

    if (!screen) {
      screen = document.createElement("section");
      screen.id = "ranking-screen";
      screen.className = "ranking-screen";
      document.body.appendChild(screen);
    }

    const filters = [
      { id: "global", label: "Geral" },
      { id: "neighborhood", label: "Bairro" },
      { id: "city", label: "Cidade" },
      { id: "state", label: "Estado" },
      { id: "country", label: "País" }
    ];

    const podiumPositions = [
      { position: 2, medal: "🥈", className: "silver" },
      { position: 1, medal: "🥇", className: "gold" },
      { position: 3, medal: "🥉", className: "bronze" }
    ];

    const podium = podiumPositions.map(place => {
      const player = this.players.find(
        item => this.getPosition(item) === place.position
      );

      if (!player) {
        return `
          <div class="podium-place ${place.className} empty">
            <div class="podium-avatar">?</div>
            <strong>Aguardando</strong>
            <span class="podium-medal">${place.medal}</span>
            <div class="podium-base">${place.position}º</div>
          </div>
        `;
      }

      const name = this.escapeHTML(
        player.display_name || "Jogador"
      );

      const isMe = player.user_id === Auth.user.id;

      return `
        <div class="podium-place ${place.className} ${isMe ? "podium-is-me" : ""}">
          <div class="podium-avatar">
            ${this.escapeHTML(name.charAt(0).toUpperCase())}
          </div>

          <strong>${name}</strong>

          ${isMe ? '<span class="podium-me">VOCÊ</span>' : ""}

          <span class="podium-medal">${place.medal}</span>

          <small>
            ${Number(player.total_score || 0).toLocaleString("pt-BR")} pts
          </small>

          <div class="podium-base">${place.position}º</div>
        </div>
      `;
    }).join("");

    const htmlFilters = filters.map(filter => `
      <button
        class="ranking-filter ${this.filter === filter.id ? "active" : ""}"
        data-filter="${filter.id}"
      >
        ${filter.label}
      </button>
    `).join("");

    const remainingPlayers = this.players.filter(
      player => this.getPosition(player) > 3
    );

    const htmlPlayers = remainingPlayers.map(player => `
      <article class="ranking-player ${
        player.user_id === Auth.user.id ? "ranking-me" : ""
      }">
        <div class="ranking-position">
          ${this.getPosition(player)}º
        </div>

        <div class="ranking-player-info">
          <strong>
            ${this.escapeHTML(player.display_name || "Jogador")}
            ${player.user_id === Auth.user.id ? " (Você)" : ""}
          </strong>

          <span>
            ${this.escapeHTML([
              player.neighborhood,
              player.city,
              player.state,
              player.country
            ].filter(Boolean).join(" • ") || "Localização não informada")}
          </span>

          <small>
            ${Number(player.levels_completed || 0)} fases concluídas
          </small>
        </div>

        <div class="ranking-score">
          <strong>
            ${Number(player.total_score || 0).toLocaleString("pt-BR")}
          </strong>
          <span>pontos</span>
        </div>
      </article>
    `).join("");

    const emptyMessage = this.players.length === 0
      ? `<p class="ranking-empty">
          Nenhum jogador encontrado nesta região.
        </p>`
      : this.players.length <= 3
        ? `<p class="ranking-empty">
            Você está vendo os primeiros colocados!
          </p>`
        : "";

    const myPlayer = this.players.find(
      player => player.user_id === Auth.user.id
    );

    const myPosition = myPlayer
      ? this.getPosition(myPlayer)
      : null;

    screen.innerHTML = `
      <div class="ranking-container">

        <header class="ranking-header">
          <div>
            <span class="ranking-eyebrow">COLOR SORT</span>
            <h2>Ranking</h2>
            <p>Descubra quem está no topo!</p>
          </div>

          <button id="ranking-close" class="ranking-close">×</button>
        </header>

        <nav class="ranking-filters">
          ${htmlFilters}
        </nav>

        ${myPosition ? `
          <section class="ranking-my-position">
            <span>SUA POSIÇÃO</span>
            <strong>${myPosition}º lugar</strong>
            <small>
              ${Number(myPlayer.total_score || 0).toLocaleString("pt-BR")} pontos
            </small>
          </section>
        ` : ""}

        <section class="ranking-podium-section">
          <div class="ranking-section-title">
            <span>🏆</span>
            <h3>TOP 3 JOGADORES</h3>
          </div>

          <div class="ranking-podium">
            ${podium}
          </div>
        </section>

        <section class="ranking-list-section">
          <div class="ranking-section-title">
            <h3>CLASSIFICAÇÃO</h3>
          </div>

          <div class="ranking-list">
            ${htmlPlayers}
            ${emptyMessage}
          </div>
        </section>

        <button id="ranking-refresh" class="ranking-refresh">
          ATUALIZAR RANKING
        </button>

      </div>
    `;

    screen.classList.add("active");

    screen.querySelector("#ranking-close")
      .addEventListener("click", () => {
        this.hide();
        if (typeof window.syncActiveNavFromScreens === "function") {
          window.syncActiveNavFromScreens();
        }
      });

    screen.querySelector("#ranking-refresh")
      .addEventListener("click", () => this.show());

    screen.querySelectorAll("[data-filter]")
      .forEach(button => {
        button.addEventListener("click", async () => {
          this.filter = button.dataset.filter;
          await this.show();
        });
      });
  },

  hide() {
    const screen = document.getElementById("ranking-screen");

    if (screen) {
      screen.classList.remove("active");
    }
  },

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }
};

window.Ranking = Ranking;

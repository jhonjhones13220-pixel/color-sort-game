
function showChallenges() {
  const shell = document.querySelector(".game-shell");

  document.querySelectorAll(
    ".topbar, .welcome, .level-card, .puzzle-preview, .play-button"
  ).forEach(element => {
    element.style.display = "none";
  });

  let screen = document.getElementById("challenges-screen");

  if (!screen) {
    screen = document.createElement("section");
    screen.id = "challenges-screen";
    screen.className = "challenges-screen";
    shell.appendChild(screen);
  }

  screen.style.display = "block";

  const daily = Challenges.getDaily();
  const achievements = Challenges.getAchievements();

  const completedDaily = daily.filter(item => item.claimed).length;
  const completedAchievements = achievements.filter(
    item => item.completed
  ).length;

  const dailyHTML = daily.map(item => {
    const percentage = Math.min(
      100,
      Math.round((item.progress / item.target) * 100)
    );

    return `
      <article class="challenge-card ${item.claimed ? "challenge-completed" : ""}">
        <div class="challenge-icon">${item.icon}</div>

        <div class="challenge-content">
          <h3>${item.name}</h3>
          <p>${item.description}</p>

          <div class="challenge-progress-track">
            <div
              class="challenge-progress-fill"
              style="width:${percentage}%"
            ></div>
          </div>

          <div class="challenge-progress-label">
            <span>${item.progress} / ${item.target}</span>
            <span>${percentage}%</span>
          </div>

          ${item.claimed
            ? '<span class="challenge-badge">✓ Recompensa recebida</span>'
            : ""}
        </div>

        <div class="challenge-reward">
          🪙 ${item.reward}
        </div>
      </article>
    `;
  }).join("");

  const achievementsHTML = achievements.map(item => {
    return `
      <article class="challenge-card ${item.completed ? "challenge-completed" : ""}">
        <div class="challenge-icon">${item.icon}</div>

        <div class="challenge-content">
          <h3>${item.name}</h3>
          <p>${item.description}</p>

          <div class="challenge-progress-track">
            <div
              class="challenge-progress-fill"
              style="width:${item.percentage}%"
            ></div>
          </div>

          <div class="challenge-progress-label">
            <span>${item.progress.toLocaleString("pt-BR")} / ${item.target.toLocaleString("pt-BR")}</span>
            <span>${item.percentage}%</span>
          </div>

          ${item.completed
            ? '<span class="challenge-badge">✓ Conquista desbloqueada</span>'
            : '<span class="challenge-badge locked">🔒 Ainda não desbloqueada</span>'}
        </div>

        <div class="challenge-reward">
          🪙 ${item.reward}
        </div>
      </article>
    `;
  }).join("");

  const data = Storage.load();

  screen.innerHTML = `
    <header class="challenges-header">
      <span class="eyebrow">COLOR SORT • MISSÕES</span>
      <h1>Desafios ⚡</h1>
      <p>Complete objetivos, conquiste medalhas e ganhe moedas!</p>
    </header>

    <div class="challenge-summary">
      <div class="challenge-summary-card">
        <span>DESAFIOS DE HOJE</span>
        <strong>${completedDaily}/${daily.length}</strong>
      </div>

      <div class="challenge-summary-card">
        <span>CONQUISTAS</span>
        <strong>${completedAchievements}/${achievements.length}</strong>
      </div>
    </div>

    <section class="challenge-section">
      <div class="challenge-section-title">
        <h2>⚡ Desafios diários</h2>
        <span>RENOVA TODO DIA</span>
      </div>

      ${dailyHTML}
    </section>

    <div class="challenge-section-divider"></div>

    <section class="challenge-section">
      <div class="challenge-section-title">
        <h2>🏆 Conquistas</h2>
        <span>PERMANENTES</span>
      </div>

      ${achievementsHTML}
    </section>

    <div class="challenge-section-divider"></div>

    <div class="challenge-summary-card">
      <span>SEU SALDO ATUAL</span>
      <strong>🪙 ${Number(data.coins || 0).toLocaleString("pt-BR")}</strong>
    </div>
  `;

  const coinElement = document.getElementById("coin-count");

  if (coinElement) {
    coinElement.textContent = data.coins || 0;
  }
}

function hideChallenges() {
  const screen = document.getElementById("challenges-screen");

  if (screen) {
    screen.style.display = "none";
  }

  document.querySelectorAll(
    ".topbar, .welcome, .level-card, .puzzle-preview, .play-button"
  ).forEach(element => {
    element.style.display = "";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = Storage.load();

  document.getElementById("coin-count").textContent =
    Number(data.coins || 0);

  document.getElementById("level-number").textContent =
    String(data.level || 1).padStart(2, "0");

  document.getElementById("progress-text").textContent =
    `${data.completedLevels || 0} fases concluídas`;

  document.getElementById("progress-fill").style.width =
    `${Math.min(data.completedLevels || 0, 100)}%`;

  document.getElementById("play-button").addEventListener("click", () => {
    Game.start(data.level || 1);
  });

  document.getElementById("add-coins").addEventListener("click", () => {
    alert("Em breve: loja de moedas e recompensas!");
  });

  AuthUI.init();
  Profile.init();
  Challenges.init();

  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", async () => {
      const page = button.dataset.page;

      document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      if (page === "home") {
        hideChallenges();
        Profile.hide();
        Ranking.hide();
        return;
      }

      if (page === "profile") {
        hideChallenges();
        Ranking.hide();
        await Profile.open();
        return;
      }

      if (page === "ranking") {
        hideChallenges();
        Profile.hide();
        await Ranking.show();
        return;
      }

      if (page === "challenges") {
        Profile.hide();
        Ranking.hide();
        showChallenges();
        return;
      }
    });
  });

  try {
    await Auth.init();

    if (Auth.user) {
      AuthUI.hide();
      console.log("COLOR SORT: Usuário autenticado!");
    } else {
      AuthUI.show("login");
      console.log("COLOR SORT: Aguardando login ou cadastro.");
    }

  } catch (error) {
    console.error("Erro ao inicializar autenticação:", error);
  }

  console.log("COLOR SORT: Aplicativo inicializado!");
});

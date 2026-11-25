
const Challenges = {
  daily: [],

  achievements: [
    {
      id: "first_level",
      name: "Primeira vitória",
      description: "Conclua sua primeira fase.",
      target: 1,
      reward: 50,
      icon: "🏆",
      type: "levels"
    },
    {
      id: "levels_10",
      name: "Aquecimento",
      description: "Conclua 10 fases.",
      target: 10,
      reward: 150,
      icon: "🔥",
      type: "levels"
    },
    {
      id: "levels_50",
      name: "Especialista",
      description: "Conclua 50 fases.",
      target: 50,
      reward: 500,
      icon: "💎",
      type: "levels"
    },
    {
      id: "levels_100",
      name: "Mestre das cores",
      description: "Conclua 100 fases.",
      target: 100,
      reward: 1000,
      icon: "👑",
      type: "levels"
    },
    {
      id: "score_10000",
      name: "Pontuação lendária",
      description: "Acumule 10.000 pontos.",
      target: 10000,
      reward: 750,
      icon: "⭐",
      type: "score"
    }
  ],

  dateKey() {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  },

  createDaily(date) {
    return [
      {
        id: "daily_one",
        name: "Primeiro desafio",
        description: "Conclua 1 fase hoje.",
        target: 1,
        progress: 0,
        reward: 50,
        icon: "🎯",
        type: "levels",
        claimed: false
      },
      {
        id: "daily_three",
        name: "Maratona de cores",
        description: "Conclua 3 fases hoje.",
        target: 3,
        progress: 0,
        reward: 100,
        icon: "⚡",
        type: "levels",
        claimed: false
      },
      {
        id: "daily_score",
        name: "Mente afiada",
        description: "Faça 500 pontos hoje.",
        target: 500,
        progress: 0,
        reward: 100,
        icon: "🧠",
        type: "score",
        claimed: false
      }
    ].map(item => ({ ...item, date }));
  },

  getData() {
    const data = Storage.load();
    const today = this.dateKey();

    if (!data.challenges || typeof data.challenges !== "object") {
      data.challenges = {};
    }

    const progress = data.challenges;

    if (!Array.isArray(progress.daily)) {
      progress.daily = this.createDaily(today);
    }

    if (!Array.isArray(progress.achievementsClaimed)) {
      progress.achievementsClaimed = [];
    }

    progress.totalCompleted = Number(
      progress.totalCompleted ?? data.completedLevels ?? 0
    );

    progress.totalScore = Number(
      progress.totalScore ?? data.totalScore ?? 0
    );

    progress.totalMoves = Number(progress.totalMoves || 0);

    if (!progress.dailyDate) {
      progress.dailyDate = today;
    }

    return data;
  },

  saveData(data) {
    return Storage.save(data);
  },

  init() {
    const data = this.getData();
    const today = this.dateKey();

    if (data.challenges.dailyDate !== today) {
      data.challenges.dailyDate = today;
      data.challenges.daily = this.createDaily(today);
      this.saveData(data);
    }

    this.daily = data.challenges.daily;

    console.log("COLOR SORT: Desafios carregados!");
  },

  onLevelCompleted(score, moves, level) {
    const data = this.getData();
    const progress = data.challenges;
    const today = this.dateKey();

    const earnedScore = Math.max(0, Number(score || 0));
    const earnedMoves = Math.max(0, Number(moves || 0));
    const completedLevel = Math.max(1, Number(level || 1));

    if (progress.dailyDate !== today) {
      progress.dailyDate = today;
      progress.daily = this.createDaily(today);
    }

    if (!Array.isArray(data.bestMoves)) {
      if (!data.bestMoves || typeof data.bestMoves !== "object") {
        data.bestMoves = {};
      }
    }

    // Atualiza o progresso geral.
    progress.totalCompleted += 1;
    progress.totalScore += earnedScore;
    progress.totalMoves += earnedMoves;
    progress.lastCompletedLevel = completedLevel;

    // Atualiza o progresso principal do jogo.
    data.completedLevels = Number(data.completedLevels || 0) + 1;
    data.totalScore = Number(data.totalScore || 0) + earnedScore;

    // Avança o nível salvo sem diminuir o progresso ao repetir fases.
    data.level = Math.max(
      Number(data.level || 1),
      completedLevel + 1
    );

    // Guarda o melhor resultado de movimentos por fase.
    const previousBest = Number(data.bestMoves[completedLevel] || 0);

    if (!previousBest || earnedMoves < previousBest) {
      data.bestMoves[completedLevel] = earnedMoves;
    }

    // Adiciona a recompensa normal da fase.
    const levelInfo = getLevel(completedLevel);
    const levelReward = Math.max(0, Number(levelInfo.reward || 0));

    let totalReward = levelReward;

    data.coins = Number(data.coins || 0) + levelReward;

    // Atualiza os desafios diários.
    progress.daily.forEach(challenge => {
      if (challenge.claimed) return;

      challenge.progress = Number(challenge.progress || 0);

      if (challenge.type === "levels") {
        challenge.progress += 1;
      }

      if (challenge.type === "score") {
        challenge.progress += earnedScore;
      }

      challenge.progress = Math.min(
        challenge.progress,
        challenge.target
      );

      if (challenge.progress >= challenge.target) {
        challenge.claimed = true;

        data.coins += challenge.reward;
        totalReward += challenge.reward;

        console.log(
          `COLOR SORT: Desafio "${challenge.name}" concluído!`
        );
      }
    });

    // Verifica as conquistas permanentes.
    this.achievements.forEach(achievement => {
      if (
        progress.achievementsClaimed.includes(achievement.id)
      ) {
        return;
      }

      const current = achievement.type === "levels"
        ? progress.totalCompleted
        : progress.totalScore;

      if (current >= achievement.target) {
        progress.achievementsClaimed.push(achievement.id);

        data.coins += achievement.reward;
        totalReward += achievement.reward;

        console.log(
          `COLOR SORT: Conquista "${achievement.name}" desbloqueada!`
        );
      }
    });

    // Salva tudo de uma vez.
    this.lastReward = totalReward;
    const saved = this.saveData(data);

    if (!saved) {
      console.error("COLOR SORT: Não foi possível salvar as recompensas!");
      return null;
    }

    this.daily = progress.daily;

    // Atualiza o saldo visível.
    const coinElement = document.getElementById("coin-count");

    if (coinElement) {
      coinElement.textContent = data.coins;
    }

    // Atualiza o progresso da tela inicial.
    const levelElement = document.getElementById("level-number");
    const progressElement = document.getElementById("progress-text");
    const progressFill = document.getElementById("progress-fill");

    if (levelElement) {
      levelElement.textContent = String(data.level).padStart(2, "0");
    }

    if (progressElement) {
      progressElement.textContent =
        `${data.completedLevels} fases concluídas`;
    }

    if (progressFill) {
      progressFill.style.width =
        `${Math.min(data.completedLevels, 100)}%`;
    }

    // Atualiza a tela de desafios caso esteja aberta.
    const challengeScreen = document.getElementById("challenges-screen");

    if (challengeScreen && challengeScreen.style.display !== "none") {
      if (typeof showChallenges === "function") {
        showChallenges();
      }
    }

    return {
      coins: data.coins,
      levelReward,
      totalReward,
      daily: progress.daily,
      totalCompleted: progress.totalCompleted,
      totalScore: progress.totalScore,
      nextLevel: data.level
    };
  },

  getDaily() {
    this.init();
    return this.daily;
  },

  getAchievements() {
    const data = this.getData();
    const progress = data.challenges;

    return this.achievements.map(item => {
      const current = item.type === "levels"
        ? progress.totalCompleted
        : progress.totalScore;

      const value = Math.min(current, item.target);

      return {
        ...item,
        progress: value,
        completed: progress.achievementsClaimed.includes(item.id),
        percentage: Math.min(
          100,
          Math.round((value / item.target) * 100)
        )
      };
    });
  }
};

window.Challenges = Challenges;

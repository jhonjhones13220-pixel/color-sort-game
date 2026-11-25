
const Storage = {
  KEY: "colorSortSave",

  DEFAULT_DATA: {
    level: 1,
    coins: 500,
    lives: 5,
    maxLives: 5,
    totalScore: 0,
    completedLevels: 0,
    bestMoves: {}
  },

  load() {
    try {
      const saved = localStorage.getItem(this.KEY);

      if (!saved) {
        const initialData = { ...this.DEFAULT_DATA };
        this.save(initialData);
        return initialData;
      }

      const data = JSON.parse(saved);

      const normalized = {
        ...this.DEFAULT_DATA,
        ...data,
        lives: Number.isFinite(Number(data.lives))
          ? Math.max(0, Math.min(5, Number(data.lives)))
          : 5,
        maxLives: 5,
        coins: Number.isFinite(Number(data.coins))
          ? Math.max(0, Number(data.coins))
          : 500,
        bestMoves: data.bestMoves || {}
      };

      return normalized;
    } catch (error) {
      console.error("Erro ao carregar progresso:", error);
      return { ...this.DEFAULT_DATA };
    }
  },

  save(data) {
    try {
      const current = {
        ...this.DEFAULT_DATA,
        ...data,
        lives: Math.max(0, Math.min(5, Number(data.lives ?? 5))),
        maxLives: 5,
        coins: Math.max(0, Number(data.coins ?? 0)),
        bestMoves: data.bestMoves || {}
      };

      localStorage.setItem(this.KEY, JSON.stringify(current));
      return true;
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
      return false;
    }
  },

  spendCoins(amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    const data = this.load();

    if (data.coins < amount) {
      return false;
    }

    data.coins -= amount;

    if (!this.save(data)) {
      return false;
    }

    return data.coins;
  },

  loseLife() {
    const data = this.load();

    if (data.lives <= 0) {
      return false;
    }

    data.lives--;

    if (!this.save(data)) {
      return false;
    }

    return data.lives;
  },

  addLife(amount = 1) {
    const data = this.load();

    data.lives = Math.min(5, data.lives + amount);

    if (!this.save(data)) {
      return false;
    }

    return data.lives;
  },

  reset() {
    localStorage.removeItem(this.KEY);
  }
};

window.Storage = Storage;

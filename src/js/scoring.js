
const Scoring = {
  calculate(moves, limit, reward) {
    const efficiency = Math.max(
      0,
      Math.round((limit - moves) * 5)
    );

    return {
      base: reward,
      efficiency,
      total: reward + efficiency
    };
  },

  async recordCompletion(score, moves) {
    if (!window.Auth || !Auth.user) {
      console.warn(
        "COLOR SORT: Resultado não enviado. Usuário não autenticado."
      );
      return false;
    }

    const { error } = await supabaseClient.rpc(
      "record_level_completion",
      {
        p_score: Number(score),
        p_moves: Number(moves)
      }
    );

    if (error) {
      console.error(
        "COLOR SORT: Erro ao registrar resultado:",
        error.message
      );
      return false;
    }

    console.log("COLOR SORT: Resultado registrado no Supabase!");

    return true;
  }
};

window.Scoring = Scoring;

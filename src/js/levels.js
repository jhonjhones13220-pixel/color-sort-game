
const COLORS = {
  blue: { name: "Azul", value: "#42c9ff" },
  pink: { name: "Rosa", value: "#ff4f91" },
  yellow: { name: "Amarelo", value: "#ffd34e" },
  purple: { name: "Roxo", value: "#a879ff" },
  green: { name: "Verde", value: "#4ce0ad" },
  orange: { name: "Laranja", value: "#ff984e" }
};

const ALL_COLORS = Object.keys(COLORS);
const TUBE_CAPACITY = 4;
const VALIDATION_MAX_STATES = 250000;
const GENERATION_MAX_STATES = 30000;
const GENERATED_LEVEL_CACHE = new Map();

const LEVELS = [
  {
    number: 1,
    name: "Primeiros passos",
    difficulty: "FÁCIL",
    colors: ["blue", "pink", "yellow", "purple"],
    tubes: [
      ["blue", "blue", "blue", "pink"],
      ["pink", "pink", "pink", "blue"],
      ["yellow", "yellow", "yellow", "yellow"],
      ["purple", "purple", "purple", "purple"],
      [],
      []
    ],
    movesLimit: 7,
    reward: 100
  },
  {
    number: 2,
    name: "Aprendendo a combinar",
    difficulty: "FÁCIL",
    colors: ["blue", "pink", "yellow", "purple"],
    tubes: [
      ["blue", "blue", "pink", "pink"],
      ["pink", "pink", "blue", "blue"],
      ["yellow", "yellow", "yellow", "yellow"],
      ["purple", "purple", "purple", "purple"],
      [],
      []
    ],
    movesLimit: 7,
    reward: 120
  },
  {
    number: 3,
    name: "Novas cores",
    difficulty: "FÁCIL",
    colors: ["blue", "pink", "yellow", "purple", "green"],
    tubes: [
      ["blue", "blue", "blue", "pink"],
      ["pink", "pink", "pink", "blue"],
      ["yellow", "yellow", "yellow", "yellow"],
      ["purple", "purple", "purple", "purple"],
      ["green", "green", "green", "green"],
      [],
      []
    ],
    movesLimit: 8,
    reward: 160
  }
];

// --------------------------------------------------
// PROGRESSÃO DE DIFICULDADE
// --------------------------------------------------

function getDifficultyProfile(number) {
  const profiles = {
    early: [
      10, 11, 12, 10, 11, 12, 11
    ],
    medium: [
      12, 13, 14, 12, 13,
      14, 13, 12, 14, 13
    ],
    advanced: [
      13, 14, 15, 13, 16,
      14, 15, 12, 14, 16
    ],
    expert: [
      15, 16, 14, 17, 13,
      15, 16, 14, 17, 13
    ],
    relief: [
      15, 13, 16, 14, 17,
      13, 15, 16, 14, 12
    ],
    final: [
      16, 14, 17, 15, 13,
      16, 18, 14, 15, 13
    ]
  };

  let values;

  if (number <= 10) {
    values = profiles.early;
  } else if (number <= 20) {
    values = profiles.medium;
  } else if (number <= 40) {
    values = profiles.advanced;
  } else if (number <= 60) {
    values = profiles.expert;
  } else if (number <= 80) {
    values = profiles.relief;
  } else {
    values = profiles.final;
  }

  const target = values[
    (number - 1) % values.length
  ];

  return {
    target,
    minimum: Math.max(8, target - 1),
    maximum: target + 1
  };
}

function getDifficultyByMoves(moves) {
  if (moves <= 10) return "FÁCIL";
  if (moves <= 12) return "MÉDIO";
  if (moves <= 14) return "DIFÍCIL";
  if (moves <= 16) return "MUITO DIFÍCIL";
  return "INSANO";
}

function getColorCount(number) {
  if (number <= 10) return 4;
  if (number <= 30) return 5;
  return 6;
}

function getLevelName(number) {
  const names = [
    "Primeiros passos",
    "Mistura intensa",
    "Novas cores",
    "Desafio crescente",
    "Laboratório de cores",
    "Combinação perfeita",
    "Mente estratégica",
    "Cores em conflito",
    "Teste de precisão",
    "Mestre dos tubos"
  ];

  return number <= names.length
    ? names[number - 1]
    : `Desafio ${String(number).padStart(3, "0")}`;
}

function calculateMovesLimit(minimumMoves) {
  const margin = Math.max(
    3,
    Math.ceil(minimumMoves * 0.2)
  );

  return minimumMoves + margin;
}

// --------------------------------------------------
// GERADOR ALEATÓRIO DETERMINÍSTICO
// --------------------------------------------------

function createRandomGenerator(seed) {
  let value = seed >>> 0;

  return function () {
    value += 0x6D2B79F5;
    let result = value;

    result = Math.imul(
      result ^ (result >>> 15),
      result | 1
    );

    result ^= result + Math.imul(
      result ^ (result >>> 7),
      result | 61
    );

    return (
      ((result ^ (result >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function shuffleArray(array, random) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

function block(color, amount) {
  return Array(amount).fill(color);
}

function getScrambleTarget(number) {
  if (number <= 10) return 16 + (number % 5);
  if (number <= 20) return 20 + (number % 5);
  if (number <= 40) return 25 + (number % 8);
  if (number <= 60) return 30 + (number % 9);
  if (number <= 80) return 35 + (number % 9);

  return 40 + (number % 12);
}

// --------------------------------------------------
// MOVIMENTOS E EMBARALHAMENTO
// --------------------------------------------------

function getTopGroupSize(tube) {
  if (!tube.length) return 0;

  const color = tube[tube.length - 1];
  let count = 0;

  for (let i = tube.length - 1; i >= 0; i--) {
    if (tube[i] !== color) break;
    count++;
  }

  return count;
}

function applyReverseMove(tubes, from, to, amount) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= tubes.length ||
    to >= tubes.length
  ) {
    return false;
  }

  const source = tubes[from];
  const destination = tubes[to];

  if (!source.length) return false;

  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    destination.length + amount > TUBE_CAPACITY
  ) {
    return false;
  }

  const color = source[source.length - 1];
  const groupSize = getTopGroupSize(source);

  if (amount > groupSize) return false;

  if (
    amount === groupSize &&
    groupSize < source.length
  ) {
    return false;
  }

  if (
    destination.length > 0 &&
    destination[destination.length - 1] === color
  ) {
    return false;
  }

  for (let i = 0; i < amount; i++) {
    source.pop();
    destination.push(color);
  }

  return true;
}

function createScrambleAttempt(colors, target, random) {
  const tubes = colors.map(color =>
    block(color, TUBE_CAPACITY)
  );

  tubes.push([]);
  tubes.push([]);

  const reverseMoves = [];
  let attempts = 0;
  const maxAttempts = target * 180;

  while (
    reverseMoves.length < target &&
    attempts < maxAttempts
  ) {
    attempts++;

    const candidates = [];

    for (let from = 0; from < tubes.length; from++) {
      const source = tubes[from];

      if (!source.length) continue;

      const color = source[source.length - 1];
      const groupSize = getTopGroupSize(source);

      for (let to = 0; to < tubes.length; to++) {
        if (from === to) continue;

        const destination = tubes[to];
        const freeSpace = TUBE_CAPACITY - destination.length;

        if (freeSpace <= 0) continue;

        if (
          destination.length > 0 &&
          destination[destination.length - 1] === color
        ) {
          continue;
        }

        let maximumAmount = Math.min(
          groupSize,
          freeSpace
        );

        if (groupSize < source.length) {
          maximumAmount = Math.min(
            maximumAmount,
            groupSize - 1
          );
        }

        if (maximumAmount < 1) continue;

        const previous = reverseMoves[
          reverseMoves.length - 1
        ];

        if (
          previous &&
          previous.from === to &&
          previous.to === from
        ) {
          continue;
        }

        candidates.push({
          from,
          to,
          maximumAmount
        });
      }
    }

    if (!candidates.length) break;

    const candidate = candidates[
      Math.floor(random() * candidates.length)
    ];

    const amount = 1 + Math.floor(
      random() * candidate.maximumAmount
    );

    const color =
      tubes[candidate.from][
        tubes[candidate.from].length - 1
      ];

    if (
      applyReverseMove(
        tubes,
        candidate.from,
        candidate.to,
        amount
      )
    ) {
      reverseMoves.push({
        from: candidate.from,
        to: candidate.to,
        color,
        amount
      });
    }
  }

  return {
    tubes: tubes.map(tube => [...tube]),
    reverseMoves,
    emptyCount: tubes.filter(
      tube => tube.length === 0
    ).length
  };
}

// --------------------------------------------------
// COMPLEXIDADE DO TABULEIRO
// --------------------------------------------------

function getLevelComplexity(tubes) {
  let mixedTubes = 0;
  let colorTransitions = 0;
  let occupiedTubes = 0;
  let partialTubes = 0;

  for (const tube of tubes) {
    if (tube.length === 0) continue;

    occupiedTubes++;

    if (tube.length < TUBE_CAPACITY) {
      partialTubes++;
    }

    const distinctColors = new Set(tube);

    if (distinctColors.size > 1) {
      mixedTubes++;
    }

    for (let i = 1; i < tube.length; i++) {
      if (tube[i] !== tube[i - 1]) {
        colorTransitions++;
      }
    }
  }

  return {
    mixedTubes,
    colorTransitions,
    occupiedTubes,
    partialTubes,
    score:
      mixedTubes * 5 +
      colorTransitions * 3 +
      partialTubes
  };
}

// --------------------------------------------------
// CONSTRUÇÃO E SELEÇÃO DE CANDIDATOS
// --------------------------------------------------

function buildLevelCandidate(number, colors, result) {
  const solution = result.reverseMoves
    .slice()
    .reverse()
    .map(move => ({
      from: move.to,
      to: move.from
    }));

  const complexity = getLevelComplexity(result.tubes);

  return {
    number,
    name: getLevelName(number),
    difficulty: "EM ANÁLISE",
    colors: [...colors],
    tubes: result.tubes.map(tube => [...tube]),
    movesLimit: calculateMovesLimit(solution.length),
    reward: 100 + number * 20,
    solution,
    scrambleMoves: result.reverseMoves.length,
    minimumMoves: null,
    searchCompleted: false,
    complexity
  };
}

function scoreLevelCandidate(candidate, profile) {
  const moves = candidate.minimumMoves;

  const distance = Math.abs(
    moves - profile.target
  );

  const outsideRange =
    moves < profile.minimum ||
    moves > profile.maximum;

  return (
    distance * 100 +
    (outsideRange ? 1000 : 0) -
    candidate.complexity.score * 0.1
  );
}

function generateLevel(number) {
  if (GENERATED_LEVEL_CACHE.has(number)) {
    return cloneLevel(
      GENERATED_LEVEL_CACHE.get(number)
    );
  }

  const colorCount = getColorCount(number);

  const random = createRandomGenerator(
    number * 7919 + 20261124
  );

  const colors = shuffleArray(
    ALL_COLORS.slice(0, colorCount),
    random
  );

  const target = getScrambleTarget(number);
  const profile = getDifficultyProfile(number);

  const candidateCount = 120;
  const candidates = [];

  for (
    let attempt = 0;
    attempt < candidateCount;
    attempt++
  ) {
    const result = createScrambleAttempt(
      colors,
      target,
      random
    );

    if (result.emptyCount !== 2) continue;
    if (result.reverseMoves.length < 8) continue;
    if (isLevelSolved(result.tubes)) continue;

    const candidate = buildLevelCandidate(
      number,
      colors,
      result
    );

    const structure = validateLevelStructure(candidate);

    if (!structure.valid) continue;

    const knownSolution = simulateLevelSolution(candidate);

    if (!knownSolution.solved) continue;
    if (knownSolution.moves === 0) continue;

    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    throw new Error(
      `Não foi possível gerar uma fase válida para a fase ${number}.`
    );
  }

  candidates.sort((a, b) => {
    if (b.scrambleMoves !== a.scrambleMoves) {
      return b.scrambleMoves - a.scrambleMoves;
    }

    return (
      b.complexity.score - a.complexity.score
    );
  });

  const searchCandidates = candidates.slice(0, 12);

  let bestCandidate = null;
  let bestScore = Infinity;

  for (const candidate of searchCandidates) {
    const shortest = findShortestLevelSolution(
      candidate,
      GENERATION_MAX_STATES
    );

    if (!shortest.solved) continue;
    if (shortest.moves <= 0) continue;

    candidate.minimumMoves = shortest.moves;
    candidate.searchCompleted = true;
    candidate.solution = shortest.solution;
    candidate.difficulty = getDifficultyByMoves(
      shortest.moves
    );
    candidate.movesLimit = calculateMovesLimit(
      shortest.moves
    );

    const candidateScore = scoreLevelCandidate(
      candidate,
      profile
    );

    if (candidateScore < bestScore) {
      bestCandidate = candidate;
      bestScore = candidateScore;
    }
  }

  if (!bestCandidate) {
    throw new Error(
      `Não foi possível comprovar a solução mínima da fase ${number}. Tente gerar a fase novamente.`
    );
  }

  const finalStructure = validateLevelStructure(
    bestCandidate
  );

  const finalSolution = simulateLevelSolution(
    bestCandidate
  );

  if (
    !finalStructure.valid ||
    !finalSolution.solved ||
    !bestCandidate.searchCompleted ||
    finalSolution.moves !== bestCandidate.minimumMoves ||
    isLevelSolved(bestCandidate.tubes) ||
    finalSolution.moves > bestCandidate.movesLimit
  ) {
    throw new Error(
      `Falha na validação final da fase ${number}. A fase não será aceita.`
    );
  }

  GENERATED_LEVEL_CACHE.set(
    number,
    cloneLevel(bestCandidate)
  );

  return cloneLevel(bestCandidate);
}

// --------------------------------------------------
// CÓPIA SEGURA DE FASES
// --------------------------------------------------

function cloneLevel(level) {
  return {
    ...level,
    colors: [...level.colors],
    tubes: level.tubes.map(tube => [...tube]),
    solution: Array.isArray(level.solution)
      ? level.solution.map(move => ({ ...move }))
      : [],
    complexity: level.complexity
      ? { ...level.complexity }
      : undefined
  };
}

// --------------------------------------------------
// VALIDAÇÃO DA ESTRUTURA
// --------------------------------------------------

function validateLevelStructure(level) {
  const counts = {};
  const errors = [];

  for (const color of level.colors) {
    counts[color] = 0;
  }

  if (level.tubes.length !== level.colors.length + 2) {
    errors.push("Quantidade incorreta de tubos.");
  }

  for (let i = 0; i < level.tubes.length; i++) {
    const tube = level.tubes[i];

    if (!Array.isArray(tube)) {
      errors.push(`Tubo ${i + 1} não é válido.`);
      continue;
    }

    if (tube.length > TUBE_CAPACITY) {
      errors.push(
        `Tubo ${i + 1} ultrapassa a capacidade.`
      );
    }

    for (const color of tube) {
      if (!Object.prototype.hasOwnProperty.call(counts, color)) {
        errors.push(`Cor não declarada: ${color}`);
      } else {
        counts[color]++;
      }
    }
  }

  for (const color of level.colors) {
    if (counts[color] !== TUBE_CAPACITY) {
      errors.push(
        `${COLORS[color].name}: ${counts[color]} unidades em vez de 4.`
      );
    }
  }

  const emptyTubes = level.tubes.filter(
    tube => Array.isArray(tube) && tube.length === 0
  ).length;

  if (emptyTubes !== 2) {
    errors.push("A fase precisa ter dois tubos vazios.");
  }

  return {
    valid: errors.length === 0,
    errors,
    counts
  };
}

// --------------------------------------------------
// REGRAS DO JOGO
// --------------------------------------------------

function isLevelSolved(tubes) {
  return tubes.every(tube =>
    tube.length === 0 ||
    (
      tube.length === TUBE_CAPACITY &&
      tube.every(color => color === tube[0])
    )
  );
}

function applyLevelMove(tubes, from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= tubes.length ||
    to >= tubes.length ||
    from === to
  ) {
    return {
      valid: false,
      error: "Índices de tubos inválidos."
    };
  }

  const source = tubes[from];
  const destination = tubes[to];

  if (source.length === 0) {
    return {
      valid: false,
      error: "O tubo de origem está vazio."
    };
  }

  if (destination.length >= TUBE_CAPACITY) {
    return {
      valid: false,
      error: "O tubo de destino está cheio."
    };
  }

  const color = source[source.length - 1];

  if (
    destination.length > 0 &&
    destination[destination.length - 1] !== color
  ) {
    return {
      valid: false,
      error: "As cores dos tubos são incompatíveis."
    };
  }

  const groupSize = getTopGroupSize(source);

  const amount = Math.min(
    groupSize,
    TUBE_CAPACITY - destination.length
  );

  for (let i = 0; i < amount; i++) {
    source.pop();
    destination.push(color);
  }

  return {
    valid: true,
    amount,
    color
  };
}

// --------------------------------------------------
// SIMULAÇÃO DA SOLUÇÃO
// --------------------------------------------------

function simulateLevelSolution(level) {
  if (!Array.isArray(level.solution)) {
    return {
      solved: false,
      moves: 0,
      error: "Fase sem sequência de solução."
    };
  }

  const tubes = level.tubes.map(
    tube => [...tube]
  );

  for (let i = 0; i < level.solution.length; i++) {
    const move = level.solution[i];

    const result = applyLevelMove(
      tubes,
      move.from,
      move.to
    );

    if (!result.valid) {
      return {
        solved: false,
        moves: i,
        error: `Movimento ${i + 1}: ${result.error}`
      };
    }
  }

  const solved = isLevelSolved(tubes);

  return {
    solved,
    moves: level.solution.length,
    error: solved
      ? null
      : "A sequência não resolveu todos os tubos."
  };
}

// --------------------------------------------------
// BUSCA DA SOLUÇÃO MÍNIMA
// --------------------------------------------------

function getStateKey(tubes) {
  return tubes
    .map(tube => tube.join(","))
    .sort()
    .join("|");
}

function findShortestLevelSolution(
  level,
  maxStates = VALIDATION_MAX_STATES
) {
  if (
    !level ||
    !Array.isArray(level.tubes) ||
    level.tubes.length === 0
  ) {
    return {
      solved: false,
      moves: null,
      solution: [],
      explored: 0,
      error: "Estrutura da fase inválida."
    };
  }

  const stateLimit = Number.isFinite(maxStates)
    ? Math.max(1, Math.floor(maxStates))
    : VALIDATION_MAX_STATES;

  const start = level.tubes.map(
    tube => [...tube]
  );

  if (isLevelSolved(start)) {
    return {
      solved: true,
      moves: 0,
      solution: [],
      explored: 1,
      error: null
    };
  }

  const nodes = [{
    tubes: start,
    parent: -1,
    move: null,
    depth: 0
  }];

  const visited = new Map();

  visited.set(getStateKey(start), 0);

  let cursor = 0;
  let solvedIndex = -1;

  while (cursor < nodes.length) {
    if (nodes.length >= stateLimit) {
      return {
        solved: false,
        moves: null,
        solution: [],
        explored: nodes.length,
        error: `Limite de busca atingido (${stateLimit} estados).`
      };
    }

    const currentIndex = cursor;
    const current = nodes[cursor];

    cursor++;

    if (current.depth >= 100) continue;

    for (
      let from = 0;
      from < current.tubes.length;
      from++
    ) {
      const source = current.tubes[from];

      if (source.length === 0) continue;

      if (
        source.length === TUBE_CAPACITY &&
        source.every(color => color === source[0])
      ) {
        continue;
      }

      for (
        let to = 0;
        to < current.tubes.length;
        to++
      ) {
        if (from === to) continue;

        const destination = current.tubes[to];

        if (destination.length >= TUBE_CAPACITY) continue;

        const color = source[source.length - 1];

        if (
          destination.length > 0 &&
          destination[destination.length - 1] !== color
        ) {
          continue;
        }

        if (destination.length === 0) {
          let earlierEmpty = false;

          for (let i = 0; i < to; i++) {
            if (
              i !== from &&
              current.tubes[i].length === 0
            ) {
              earlierEmpty = true;
              break;
            }
          }

          if (earlierEmpty) continue;
        }

        const nextTubes = current.tubes.map(
          tube => [...tube]
        );

        const result = applyLevelMove(
          nextTubes,
          from,
          to
        );

        if (!result.valid) continue;

        const key = getStateKey(nextTubes);

        if (visited.has(key)) continue;

        const nextIndex = nodes.length;

        visited.set(key, nextIndex);

        nodes.push({
          tubes: nextTubes,
          parent: currentIndex,
          move: { from, to },
          depth: current.depth + 1
        });

        if (isLevelSolved(nextTubes)) {
          solvedIndex = nextIndex;
          break;
        }
      }

      if (solvedIndex !== -1) break;
    }

    if (solvedIndex !== -1) break;
  }

  if (solvedIndex === -1) {
    return {
      solved: false,
      moves: null,
      solution: [],
      explored: nodes.length,
      error: "Nenhuma solução encontrada dentro do limite de busca."
    };
  }

  const solution = [];
  let index = solvedIndex;

  while (nodes[index].parent !== -1) {
    solution.push(nodes[index].move);
    index = nodes[index].parent;
  }

  solution.reverse();

  return {
    solved: true,
    moves: solution.length,
    solution,
    explored: nodes.length,
    error: null
  };
}

// --------------------------------------------------
// CARREGAMENTO DAS FASES
// --------------------------------------------------

function getLevel(number) {
  const levelNumber = Math.max(
    1,
    Math.min(100, Math.floor(Number(number) || 1))
  );

  if (levelNumber <= 3) {
    const original = LEVELS[levelNumber - 1];

    const level = {
      ...original,
      tubes: original.tubes.map(tube => [...tube]),
      colors: [...original.colors],
      solution: []
    };

    const shortest = findShortestLevelSolution(
      level,
      VALIDATION_MAX_STATES
    );

    if (!shortest.solved) {
      throw new Error(
        `Não foi possível encontrar uma solução para a fase ${levelNumber}: ${shortest.error}`
      );
    }

    level.solution = shortest.solution;
    level.minimumMoves = shortest.moves;
    level.searchCompleted = true;
    level.difficulty = getDifficultyByMoves(shortest.moves);

    return level;
  }

  return generateLevel(levelNumber);
}

// --------------------------------------------------
// VALIDAÇÃO DE TODAS AS FASES
// --------------------------------------------------

function validateAllLevels(options = {}) {
  const results = [];

  let approved = 0;
  let rejected = 0;

  const startLevel = Math.max(
    1,
    Math.min(100, Math.floor(options.startLevel || 1))
  );

  const endLevel = Math.max(
    startLevel,
    Math.min(100, Math.floor(options.endLevel || 100))
  );

  for (
    let number = startLevel;
    number <= endLevel;
    number++
  ) {
    let level;

    try {
      level = getLevel(number);
    } catch (error) {
      rejected++;

      results.push({
        fase: number,
        resultado: "REPROVADA",
        erros: [error.message]
      });

      continue;
    }

    const structure = validateLevelStructure(level);
    const solutionResult = simulateLevelSolution(level);

    const errors = [...structure.errors];

    if (!solutionResult.solved) {
      errors.push(
        solutionResult.error || "Solução inválida."
      );
    }

    if (isLevelSolved(level.tubes)) {
      errors.push("A fase começa com o tabuleiro resolvido.");
    }

    if (
      level.searchCompleted &&
      level.minimumMoves !== solutionResult.moves
    ) {
      errors.push(
        "A quantidade de movimentos da solução não corresponde ao mínimo calculado."
      );
    }

    if (!level.searchCompleted) {
      errors.push(
        "A busca mínima não foi concluída."
      );
    }

    const valid =
      structure.valid &&
      solutionResult.solved &&
      level.searchCompleted &&
      level.minimumMoves === solutionResult.moves &&
      !isLevelSolved(level.tubes) &&
      solutionResult.moves <= level.movesLimit;

    if (valid) {
      approved++;
    } else {
      rejected++;
    }

    results.push({
      fase: number,
      dificuldade: level.difficulty,
      cores: level.colors.length,
      tubos: level.tubes.length,
      tubosVazios: level.tubes.filter(
        tube => tube.length === 0
      ).length,
      movimentosSolucaoConhecida: solutionResult.moves,
      movimentosMinimos: level.minimumMoves,
      buscaMinimaConcluida: level.searchCompleted,
      complexidade: level.complexity
        ? level.complexity.score
        : null,
      movimentosEmbaralhamento: level.scrambleMoves || "Manual",
      limite: level.movesLimit,
      estrutura: structure.valid ? "OK" : "ERRO",
      solucao: solutionResult.solved ? "OK" : "ERRO",
      resultado: valid ? "APROVADA" : "REPROVADA",
      erros: errors
    });
  }

  return {
    total: endLevel - startLevel + 1,
    approved,
    rejected,
    allValid: rejected === 0,
    results
  };
}

// --------------------------------------------------
// EXPORTAÇÕES
// --------------------------------------------------

window.COLORS = COLORS;
window.LEVELS = LEVELS;
window.getLevel = getLevel;
window.validateLevelStructure = validateLevelStructure;
window.applyLevelMove = applyLevelMove;
window.simulateLevelSolution = simulateLevelSolution;
window.findShortestLevelSolution = findShortestLevelSolution;
window.validateAllLevels = validateAllLevels;
window.isLevelSolved = isLevelSolved;
window.getLevelComplexity = getLevelComplexity;
window.getDifficultyProfile = getDifficultyProfile;

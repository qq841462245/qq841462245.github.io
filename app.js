const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const LEVEL_RANKS = [...RANKS];
const SEQUENCE_CHAIN = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const NATURAL_SEQUENCE_VALUE = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};
const SUITS = [
  { id: "spades", symbol: "♠", color: "black" },
  { id: "hearts", symbol: "♥", color: "red" },
  { id: "clubs", symbol: "♣", color: "black" },
  { id: "diamonds", symbol: "♦", color: "red" },
];
const JOKERS = [
  { rank: "SJ", label: "小王", short: "小" },
  { rank: "BJ", label: "大王", short: "大" },
];
const PLAYER_ORDER = [
  { id: 0, name: "你", seat: "South", team: 0 },
  { id: 1, name: "左家", seat: "West", team: 1 },
  { id: 2, name: "对家", seat: "North", team: 0 },
  { id: 3, name: "右家", seat: "East", team: 1 },
];
const PLAY_DIRECTION = -1;
const CHEAP_RESPONSE_LIMIT = 620;
const COSTLY_RESPONSE_LIMIT = 980;
const COMBO_NAMES = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  fullHouse: "三带二",
  straight: "顺子",
  doubleSeq: "连对",
  tripleSeq: "三顺",
  steel: "钢板",
  bomb: "炸弹",
  straightFlush: "同花顺",
  jokerBomb: "天王炸",
};
const TOTAL_BY_RANK = Object.fromEntries([...RANKS.map((rank) => [rank, 8]), ["SJ", 2], ["BJ", 2]]);
const els = {};
let match;
let state;

function init() {
  [
    "newGameBtn",
    "roundBadge",
    "levelBadge",
    "scoreBadge",
    "roundStatus",
    "memoryBoard",
    "moveLog",
    "playerNorth",
    "playerWest",
    "playerEast",
    "playerSouth",
    "centerPile",
    "selectionInfo",
    "hintBtn",
    "passBtn",
    "playBtn",
    "hand",
    "reviewPanel",
    "reviewContent",
    "closeReviewBtn",
    "toggleMemoryBtn",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  els.newGameBtn.addEventListener("click", handleGameButton);
  els.playBtn.addEventListener("click", playSelected);
  els.passBtn.addEventListener("click", passTurn);
  els.hintBtn.addEventListener("click", selectHint);
  els.closeReviewBtn.addEventListener("click", () => {
    els.reviewPanel.hidden = true;
  });
  els.toggleMemoryBtn.addEventListener("click", () => {
    state.showFullMemory = !state.showFullMemory;
    render();
  });

  resetMatch();
  startGame();
}

function resetMatch() {
  match = {
    currentLevel: "2",
    roundNo: 1,
    teamLevels: { 0: "2", 1: "2" },
    lastResult: null,
  };
}

function handleGameButton() {
  if (state?.over && state.nextRoundLevel) {
    continueMatch();
    return;
  }
  resetMatch();
  startGame();
}

function continueMatch() {
  match.currentLevel = state.nextRoundLevel;
  match.teamLevels[state.roundResult.winnerTeam] = state.nextRoundLevel;
  match.roundNo += 1;
  match.lastResult = state.roundResult;
  startGame();
}

function startGame() {
  const levelRank = match.currentLevel;
  const players = PLAYER_ORDER.map((player) => ({
    ...player,
    hand: [],
    lastAction: "待出牌",
    finished: false,
  }));
  const deck = shuffle(buildDeck());
  deck.forEach((card, index) => {
    players[index % 4].hand.push(card);
  });
  players.forEach((player) => {
    sortHand(player.hand, levelRank);
  });

  state = {
    levelRank,
    players,
    current: 0,
    selected: new Set(),
    lastPlay: null,
    passesSincePlay: 0,
    finishedOrder: [],
    history: [],
    userNotes: [],
    moveNo: 1,
    roundNo: match.roundNo,
    roundResult: null,
    nextRoundLevel: null,
    message: `第 ${match.roundNo} 局，你先手`,
    over: false,
    aiRunning: false,
    showFullMemory: false,
  };

  els.reviewPanel.hidden = true;
  render();
}

function buildDeck() {
  const cards = [];
  for (let deck = 0; deck < 2; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${rank}-${suit.id}-${deck}`,
          rank,
          suit: suit.id,
          suitSymbol: suit.symbol,
          color: suit.color,
          deck,
        });
      }
    }
    for (const joker of JOKERS) {
      cards.push({
        id: `${joker.rank}-${deck}`,
        rank: joker.rank,
        suit: "joker",
        suitSymbol: "",
        color: "joker",
        deck,
      });
    }
  }
  return cards;
}

function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function advanceLevel(rank, steps) {
  const start = LEVEL_RANKS.indexOf(rank);
  const next = Math.min(LEVEL_RANKS.length - 1, start + steps);
  return LEVEL_RANKS[next];
}

function rankValue(rank, levelRank = state.levelRank) {
  if (rank === "SJ") return 100;
  if (rank === "BJ") return 101;
  if (rank === levelRank) return 15;
  const order = RANKS.filter((item) => item !== levelRank);
  return order.indexOf(rank) + 2;
}

function sortHand(hand, levelRank = state.levelRank) {
  hand.sort((a, b) => {
    const valueDiff = rankValue(a.rank, levelRank) - rankValue(b.rank, levelRank);
    if (valueDiff !== 0) return valueDiff;
    return suitSort(a.suit) - suitSort(b.suit);
  });
}

function suitSort(suit) {
  return ["clubs", "diamonds", "spades", "hearts", "joker"].indexOf(suit);
}

function isJokerRank(rank) {
  return rank === "SJ" || rank === "BJ";
}

function isWild(card) {
  return card.rank === state.levelRank && card.suit === "hearts";
}

function classifyCards(cards) {
  if (!cards.length) return [];
  const variations = createWildVariations(cards);
  const byKey = new Map();
  for (const variation of variations) {
    const combos = detectNaturalCombos(variation);
    for (const combo of combos) {
      const key = [
        combo.type,
        combo.length,
        combo.mainValue,
        combo.bombPower || 0,
        combo.sequenceLength || 0,
      ].join(":");
      if (!byKey.has(key)) byKey.set(key, combo);
    }
  }
  return [...byKey.values()].sort((a, b) => comboScore(a) - comboScore(b));
}

function createWildVariations(cards) {
  const wilds = cards.filter(isWild);
  const fixed = cards.filter((card) => !isWild(card)).map(toAssignedCard);
  if (!wilds.length) return [fixed];

  const replacements = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      replacements.push({ rank, suit: suit.id, suitSymbol: suit.symbol, color: suit.color });
    }
  }

  const output = [];
  const walk = (index, acc) => {
    if (index === wilds.length) {
      output.push([...fixed, ...acc]);
      return;
    }
    for (const replacement of replacements) {
      const source = wilds[index];
      walk(index + 1, [
        ...acc,
        {
          ...source,
          ...replacement,
          id: source.id,
          wildAs: replacement.rank,
          isAssignedWild: true,
        },
      ]);
    }
  };
  walk(0, []);
  return output;
}

function toAssignedCard(card) {
  return { ...card, isAssignedWild: false };
}

function detectNaturalCombos(cards) {
  const length = cards.length;
  const ranks = cards.map((card) => card.rank);
  const groups = countBy(ranks);
  const groupEntries = Object.entries(groups).sort((a, b) => rankValue(a[0]) - rankValue(b[0]));
  const groupSizes = groupEntries.map((entry) => entry[1]).sort((a, b) => b - a);
  const uniqueRanks = Object.keys(groups);
  const hasJoker = ranks.some(isJokerRank);
  const combos = [];

  if (length === 4 && ranks.every(isJokerRank)) {
    combos.push(makeCombo("jokerBomb", cards, 999, 100));
    return combos;
  }

  if (!hasJoker && groupEntries.length === 1 && length >= 4) {
    combos.push(makeCombo("bomb", cards, rankValue(groupEntries[0][0]), length));
  }

  if (
    length === 5 &&
    !hasJoker &&
    cards.every((card) => card.suit === cards[0].suit) &&
    isConsecutive(uniqueRanks)
  ) {
    combos.push(makeCombo("straightFlush", cards, highSequenceValue(uniqueRanks), 5.5));
  }

  if (length === 1) {
    combos.push(makeCombo("single", cards, rankValue(ranks[0])));
  }

  if (length === 2 && groupEntries.length === 1 && !hasJoker) {
    combos.push(makeCombo("pair", cards, rankValue(groupEntries[0][0])));
  }

  if (length === 3 && groupEntries.length === 1 && !hasJoker) {
    combos.push(makeCombo("triple", cards, rankValue(groupEntries[0][0])));
  }

  if (length === 5 && !hasJoker && groupSizes[0] === 3 && groupSizes[1] === 2) {
    const tripleRank = groupEntries.find((entry) => entry[1] === 3)[0];
    combos.push(makeCombo("fullHouse", cards, rankValue(tripleRank)));
  }

  if (length === 5 && !hasJoker && uniqueRanks.length === 5 && isConsecutive(uniqueRanks)) {
    combos.push(makeCombo("straight", cards, highSequenceValue(uniqueRanks)));
  }

  if (length >= 6 && length % 2 === 0 && !hasJoker && groupEntries.every((entry) => entry[1] === 2)) {
    const pairRanks = groupEntries.map((entry) => entry[0]);
    if (pairRanks.length >= 3 && isConsecutive(pairRanks)) {
      const combo = makeCombo("doubleSeq", cards, highSequenceValue(pairRanks));
      combo.name = pairRanks.length === 3 ? "三连对" : `${pairRanks.length}连对`;
      combos.push({
        ...combo,
        sequenceLength: pairRanks.length,
      });
    }
  }

  if (length >= 6 && length % 3 === 0 && !hasJoker && groupEntries.every((entry) => entry[1] === 3)) {
    const tripleRanks = groupEntries.map((entry) => entry[0]);
    if (tripleRanks.length >= 2 && isConsecutive(tripleRanks)) {
      combos.push({
        ...makeCombo(tripleRanks.length === 2 ? "steel" : "tripleSeq", cards, highSequenceValue(tripleRanks)),
        sequenceLength: tripleRanks.length,
      });
    }
  }

  return combos;
}

function makeCombo(type, cards, mainValue, bombPower = 0) {
  return {
    type,
    name: COMBO_NAMES[type],
    length: cards.length,
    mainValue,
    bombPower,
  };
}

function countBy(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function isConsecutive(ranks) {
  return Boolean(findSequenceWindow(ranks));
}

function highSequenceValue(ranks) {
  const window = findSequenceWindow(ranks);
  if (!window) return -1;
  return NATURAL_SEQUENCE_VALUE[window[window.length - 1]];
}

function sequenceWindows(length) {
  const windows = [];
  for (let start = 0; start <= SEQUENCE_CHAIN.length - length; start += 1) {
    windows.push(SEQUENCE_CHAIN.slice(start, start + length));
  }
  return windows;
}

function findSequenceWindow(ranks) {
  if (ranks.some(isJokerRank)) return null;
  const uniqueRanks = [...new Set(ranks)];
  return sequenceWindows(uniqueRanks.length).find((window) =>
    window.length === uniqueRanks.length && uniqueRanks.every((rank) => window.includes(rank))
  ) || null;
}

function comboScore(combo) {
  const typeWeight = {
    single: 1,
    pair: 2,
    triple: 3,
    straight: 4,
    doubleSeq: 5,
    steel: 6,
    tripleSeq: 7,
    fullHouse: 8,
    bomb: 20,
    straightFlush: 21,
    jokerBomb: 30,
  }[combo.type];
  return typeWeight * 1000 + combo.length * 20 + combo.mainValue;
}

function chooseComboForContext(cards, targetCombo) {
  const combos = classifyCards(cards);
  if (!combos.length) return null;
  if (!targetCombo) {
    return combos.sort((a, b) => comboScore(a) - comboScore(b))[0];
  }
  return combos
    .filter((combo) => canBeat(combo, targetCombo))
    .sort((a, b) => comboScore(a) - comboScore(b))[0] || null;
}

function isBombLike(combo) {
  return combo && ["bomb", "straightFlush", "jokerBomb"].includes(combo.type);
}

function canBeat(candidate, target) {
  if (!target) return Boolean(candidate);
  if (!candidate) return false;
  const candidateBomb = isBombLike(candidate);
  const targetBomb = isBombLike(target);
  if (candidateBomb || targetBomb) {
    if (candidateBomb && !targetBomb) return true;
    if (!candidateBomb && targetBomb) return false;
    if (candidate.bombPower !== target.bombPower) return candidate.bombPower > target.bombPower;
    return candidate.mainValue > target.mainValue;
  }
  if (candidate.type !== target.type || candidate.length !== target.length) return false;
  if ((candidate.sequenceLength || 0) !== (target.sequenceLength || 0)) return false;
  return candidate.mainValue > target.mainValue;
}

function playSelected() {
  if (state.over || state.current !== 0) return;
  const selectedCards = state.players[0].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  if (!combo) {
    state.message = state.lastPlay ? "这手牌压不上" : "这组牌型不成立";
    render();
    return;
  }

  noteUserPlay(selectedCards, combo);
  commitPlay(0, selectedCards, combo);
  state.selected.clear();
  render();
  runAiUntilHuman();
}

function passTurn() {
  if (state.over || state.current !== 0 || !state.lastPlay) return;
  const response = bestResponseFor(0, state.lastPlay.combo, false);
  state.userNotes.push({
    kind: "pass",
    moveNo: state.moveNo,
    target: state.lastPlay.combo,
    targetOwner: state.lastPlay.player,
    targetOwnerName: state.players[state.lastPlay.player].name,
    targetText: state.lastPlay.cards.map(cardText).join(" "),
    targetRemaining: state.players[state.lastPlay.player].hand.length,
    couldBeat: response ? response.combo : null,
    danger: playerDanger(state.lastPlay.player),
  });
  commitPass(0);
  render();
  runAiUntilHuman();
}

function selectHint() {
  if (state.over || state.current !== 0) return;
  const hint = state.lastPlay ? bestResponseFor(0, state.lastPlay.combo, true) : bestLeadFor(0);
  if (!hint) {
    state.message = state.lastPlay ? "建议过牌" : "暂时没有推荐牌";
    render();
    return;
  }
  state.selected = new Set(hint.cards.map((card) => card.id));
  state.message = `建议：${hint.combo.name}`;
  render();
}

function noteUserPlay(cards, combo) {
  const hand = state.players[0].hand;
  const beforeCounts = countBy(hand.map((card) => card.rank));
  const brokeRanks = [...new Set(cards.map((card) => card.rank))]
    .filter((rank) => beforeCounts[rank] >= 2 && cards.filter((card) => card.rank === rank).length < beforeCounts[rank]);
  const targetOwner = state.lastPlay?.player;
  const targetWasDanger = typeof targetOwner === "number" ? playerDanger(targetOwner) : false;
  state.userNotes.push({
    kind: "play",
    moveNo: state.moveNo,
    combo,
    cardsText: cards.map(cardText).join(" "),
    brokeRanks,
    partnerOvertake: sameTeam(0, targetOwner),
    bombOnNormal: isBombLike(combo) && state.lastPlay && !isBombLike(state.lastPlay.combo),
    danger: targetWasDanger,
    targetOwner,
    targetOwnerName: typeof targetOwner === "number" ? state.players[targetOwner].name : "",
    targetText: state.lastPlay ? state.lastPlay.cards.map(cardText).join(" ") : "",
    targetComboName: state.lastPlay?.combo.name || "",
    partnerRemainingBefore: state.players[2].hand.length,
    rightRemainingBefore: state.players[3].hand.length,
    leftRemainingBefore: state.players[1].hand.length,
    remainingBefore: hand.length,
  });
}

function commitPlay(playerId, cards, combo) {
  const player = state.players[playerId];
  const cardIds = new Set(cards.map((card) => card.id));
  player.hand = player.hand.filter((card) => !cardIds.has(card.id));
  player.lastAction = `${combo.name} ${cards.map(cardText).join(" ")}`;
  state.history.unshift({
    moveNo: state.moveNo,
    playerId,
    action: "play",
    cards,
    combo,
    targetPlayer: state.lastPlay?.player ?? null,
    targetCombo: state.lastPlay?.combo ?? null,
    targetCards: state.lastPlay?.cards ?? [],
    handLeft: player.hand.length,
  });
  state.lastPlay = {
    player: playerId,
    cards,
    combo,
    moveNo: state.moveNo,
  };
  state.passesSincePlay = 0;
  state.message = `${player.name} 出了 ${combo.name}`;
  state.moveNo += 1;

  if (player.hand.length === 0 && !player.finished) {
    player.finished = true;
    state.finishedOrder.push(playerId);
    player.lastAction = `${finishName(state.finishedOrder.length)}`;
    state.message = `${player.name} ${finishName(state.finishedOrder.length)}`;
  }

  if (checkRoundOver()) return;
  state.current = nextActiveAfter(playerId);
}

function commitPass(playerId) {
  const player = state.players[playerId];
  player.lastAction = "过牌";
  state.history.unshift({
    moveNo: state.moveNo,
    playerId,
    action: "pass",
    cards: [],
    combo: null,
    targetPlayer: state.lastPlay?.player ?? null,
    targetCombo: state.lastPlay?.combo ?? null,
    targetCards: state.lastPlay?.cards ?? [],
    handLeft: player.hand.length,
  });
  state.moveNo += 1;
  state.passesSincePlay += 1;
  state.message = `${player.name} 过牌`;

  if (state.passesSincePlay >= Math.max(1, activePlayers().length - 1)) {
    const starter = state.lastPlay?.player;
    state.lastPlay = null;
    state.passesSincePlay = 0;
    const leadPlayer = state.players[starter]?.finished ? activePartnerOf(starter) ?? nextActiveAfter(starter) : starter;
    state.current = leadPlayer ?? nextActiveAfter(playerId);
    state.message = `${state.players[state.current].name} 获得出牌权`;
  } else {
    state.current = nextActiveAfter(playerId);
  }
  checkRoundOver();
}

function checkRoundOver() {
  const active = activePlayers();
  if (isDoubleTop() || state.finishedOrder.length >= 3 || active.length <= 1) {
    completeRound();
    return true;
  }
  return false;
}

function isDoubleTop() {
  return state.finishedOrder.length >= 2 && sameTeam(state.finishedOrder[0], state.finishedOrder[1]);
}

function completeRound() {
  for (const player of activePlayers()) {
    if (!state.finishedOrder.includes(player.id)) state.finishedOrder.push(player.id);
    player.finished = true;
    player.lastAction = finishName(state.finishedOrder.indexOf(player.id) + 1);
  }
  state.roundResult = computeRoundResult();
  state.nextRoundLevel = advanceLevel(state.levelRank, state.roundResult.advance);
  state.over = true;
  state.current = null;
  state.message = `本局结束：${state.roundResult.name}，下局打 ${state.nextRoundLevel}`;
  renderReview();
}

function computeRoundResult() {
  const firstPlayerId = state.finishedOrder[0];
  const winnerTeam = state.players[firstPlayerId].team;
  const partnerPlace = state.finishedOrder.findIndex((playerId, index) => index > 0 && state.players[playerId].team === winnerTeam) + 1;
  const advance = partnerPlace === 2 ? 3 : partnerPlace === 3 ? 2 : 1;
  const name = partnerPlace === 2 ? "双上" : partnerPlace === 3 ? "一三名" : "头末名";
  return {
    winnerTeam,
    partnerPlace,
    advance,
    name,
  };
}

function activePlayers() {
  return state.players.filter((player) => !player.finished);
}

function partnerOf(playerId) {
  return (playerId + 2) % 4;
}

function activePartnerOf(playerId) {
  const partnerId = partnerOf(playerId);
  return state.players[partnerId]?.finished ? null : partnerId;
}

function sameTeam(playerA, playerB) {
  return (
    typeof playerA === "number" &&
    typeof playerB === "number" &&
    state.players[playerA]?.team === state.players[playerB]?.team
  );
}

function nextActiveAfter(playerId) {
  for (let offset = 1; offset <= 4; offset += 1) {
    const next = (playerId + PLAY_DIRECTION * offset + 4) % 4;
    if (!state.players[next].finished) return next;
  }
  return null;
}

async function runAiUntilHuman() {
  if (state.aiRunning) return;
  state.aiRunning = true;
  while (!state.over && state.current !== 0) {
    render();
    await delay(520);
    const playerId = state.current;
    const move = state.lastPlay ? bestResponseFor(playerId, state.lastPlay.combo, false) : bestLeadFor(playerId);
    if (move) {
      commitPlay(playerId, move.cards, move.combo);
    } else {
      commitPass(playerId);
    }
  }
  state.aiRunning = false;
  render();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bestLeadFor(playerId) {
  const player = state.players[playerId];
  const candidates = generateCandidateSelections(player.hand)
    .filter((candidate) => !isBombLike(candidate.combo))
    .sort((a, b) => leadScore(a, playerId) - leadScore(b, playerId));
  return candidates[0] || generateCandidateSelections(player.hand).sort((a, b) => comboScore(a.combo) - comboScore(b.combo))[0] || null;
}

function leadScore(candidate, playerId) {
  const player = state.players[playerId];
  const handLength = player.hand.length;
  const partner = state.players[partnerOf(playerId)];
  const combo = candidate.combo;
  const endgameBias = handLength <= 8 ? -combo.length * 180 : combo.length <= 1 ? -40 : -combo.length * 35;
  const partnerShortBias = partner && !partner.finished && partner.hand.length <= 5 && combo.type === "single" ? 70 : 0;
  const typeBias = {
    straight: -90,
    doubleSeq: -100,
    steel: -105,
    tripleSeq: -105,
    fullHouse: -70,
    triple: -35,
    pair: -25,
    single: 0,
  }[combo.type] || 0;
  return combo.mainValue * 12 + endgameBias + typeBias + partnerShortBias + structurePenalty(player.hand, candidate.cards, combo);
}

function bestResponseFor(playerId, targetCombo, allowBomb) {
  const player = state.players[playerId];
  const targetPlayerId = state.lastPlay?.player;
  const candidates = generateCandidateSelections(player.hand, targetCombo)
    .filter((candidate) => canBeat(candidate.combo, targetCombo))
    .sort((a, b) => responseCost(a, playerId, targetCombo) - responseCost(b, playerId, targetCombo));
  if (!candidates.length) return null;

  if (sameTeam(playerId, targetPlayerId)) return null;

  const finishingMove = candidates.find((candidate) => isFinishingMove(playerId, candidate));
  if (finishingMove) return finishingMove;

  const mustFight = mustBeatOpponent(playerId, targetPlayerId, targetCombo);
  const controlSingle = bestControlSingleResponse(candidates, playerId, targetPlayerId, targetCombo);
  if (controlSingle) return controlSingle;
  const normal = candidates.filter((candidate) => !isBombLike(candidate.combo) || isBombLike(targetCombo));
  const bestNormal = normal[0];
  if (bestNormal) {
    const normalCost = responseCost(bestNormal, playerId, targetCombo);
    if (mustFight || normalCost <= CHEAP_RESPONSE_LIMIT || (allowBomb && normalCost <= COSTLY_RESPONSE_LIMIT)) {
      if (!mustFight && teammateCanCoverNext(playerId, targetCombo, normalCost)) return null;
      return bestNormal;
    }
  }

  const bestBomb = candidates.find((candidate) => isBombLike(candidate.combo));
  if (!bestBomb) return null;
  const bombCost = responseCost(bestBomb, playerId, targetCombo);
  if (mustFight || isBombLike(targetCombo) || (allowBomb && bombCost <= COSTLY_RESPONSE_LIMIT)) return bestBomb;
  return null;
}

function isFinishingMove(playerId, candidate) {
  return candidate.cards.length === state.players[playerId].hand.length;
}

function bestControlSingleResponse(candidates, playerId, targetPlayerId, targetCombo) {
  if (typeof targetPlayerId !== "number" || sameTeam(playerId, targetPlayerId)) return null;
  if (!targetCombo || targetCombo.type !== "single") return null;
  const targetCard = state.lastPlay?.cards?.[0];
  if (!targetCard || targetCard.rank !== "SJ") return null;
  return candidates.find(
    (candidate) =>
      candidate.combo.type === "single" &&
      candidate.cards.length === 1 &&
      candidate.cards[0].rank === "BJ"
  ) || null;
}

function mustBeatOpponent(playerId, targetPlayerId, targetCombo) {
  if (typeof targetPlayerId !== "number" || sameTeam(playerId, targetPlayerId)) return false;
  const player = state.players[playerId];
  const targetPlayer = state.players[targetPlayerId];
  if (!targetPlayer || targetPlayer.finished) return false;
  if (targetPlayer.hand.length <= 3) return true;
  if (targetPlayer.hand.length <= 5 && targetCombo.length >= 2) return true;
  if (player.hand.length <= 5) return true;
  const nextPlayerId = nextActiveAfter(playerId);
  const nextPlayer = state.players[nextPlayerId];
  return Boolean(nextPlayer && !sameTeam(playerId, nextPlayerId) && nextPlayer.hand.length <= 3);
}

function teammateCanCoverNext(playerId, targetCombo, ourCost) {
  const nextPlayerId = nextActiveAfter(playerId);
  if (!sameTeam(playerId, nextPlayerId)) return false;
  const partner = state.players[nextPlayerId];
  if (!partner || partner.finished) return false;
  const partnerResponses = generateCandidateSelections(partner.hand, targetCombo)
    .filter((candidate) => canBeat(candidate.combo, targetCombo))
    .filter((candidate) => !isBombLike(candidate.combo) || isBombLike(targetCombo))
    .sort((a, b) => responseCost(a, nextPlayerId, targetCombo) - responseCost(b, nextPlayerId, targetCombo));
  if (!partnerResponses.length) return false;
  return responseCost(partnerResponses[0], nextPlayerId, targetCombo) + 120 < ourCost;
}

function responseCost(candidate, playerId, targetCombo) {
  const player = state.players[playerId];
  const combo = candidate.combo;
  let cost = combo.mainValue * 12 - combo.length * 34;
  cost += structurePenalty(player.hand, candidate.cards, combo);
  cost += candidate.cards.reduce((sum, card) => sum + controlCardCost(card), 0);
  if (isBombLike(combo)) cost += 1200 + combo.bombPower * 70;
  if (isBombLike(targetCombo) && isBombLike(combo)) cost -= 900;
  if (isFinishingMove(playerId, candidate)) cost -= 5000;
  if (candidate.cards.length >= Math.max(1, player.hand.length - 1)) cost -= 900;
  return cost;
}

function controlCardCost(card) {
  if (card.rank === "BJ") return 1050;
  if (card.rank === "SJ") return 920;
  let cost = 0;
  if (card.rank === state.levelRank) cost += 180;
  if (card.rank === "2") cost += 135;
  if (card.rank === "A") cost += 70;
  if (card.rank === "K") cost += 40;
  if (isWild(card)) cost += 240;
  return cost;
}

function structurePenalty(hand, cards, combo) {
  const handCounts = countBy(hand.map((card) => card.rank));
  const playCounts = countBy(cards.map((card) => card.rank));
  return Object.entries(playCounts).reduce((penalty, [rank, used]) => {
    const held = handCounts[rank] || 0;
    if (held >= 4 && used < held && !isBombLike(combo)) return penalty + 260;
    if (held >= 3 && used > 0 && used < 3) return penalty + 130;
    if (held >= 2 && used === 1 && combo.type === "single") return penalty + 85;
    return penalty;
  }, 0);
}

function playerDanger(playerId) {
  if (typeof playerId !== "number") return false;
  const player = state.players[playerId];
  return !player.finished && player.hand.length <= 5;
}

function generateCandidateSelections(hand, targetCombo = null) {
  const candidates = [];
  const add = (cards) => {
    const combo = chooseComboForContext(cards, targetCombo);
    if (!combo) return;
    const key = cards.map((card) => card.id).sort().join("|");
    if (!candidates.some((candidate) => candidate.key === key)) {
      candidates.push({ key, cards, combo });
    }
  };

  const sorted = [...hand].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
  sorted.forEach((card) => add([card]));

  const byRank = groupCardsByRank(sorted.filter((card) => !isJokerRank(card.rank)));
  for (const [rank, cards] of byRank.entries()) {
    for (let size = 2; size <= Math.min(cards.length, 8); size += 1) {
      if (size === 2 || size === 3 || size >= 4) add(cards.slice(0, size));
    }
    if (cards.length >= 4) {
      for (let size = 4; size <= cards.length; size += 1) add(cards.slice(0, size));
    }
  }

  const pairRanks = [...byRank.entries()].filter((entry) => entry[1].length >= 2);
  const tripleRanks = [...byRank.entries()].filter((entry) => entry[1].length >= 3);
  for (const [tripleRank, tripleCards] of tripleRanks) {
    for (const [pairRank, pairCards] of pairRanks) {
      if (pairRank !== tripleRank) add([...tripleCards.slice(0, 3), ...pairCards.slice(0, 2)]);
    }
  }

  addSequences(byRank, 1, 5, add);
  addSequences(byRank, 2, targetCombo?.type === "doubleSeq" ? targetCombo.sequenceLength : 3, add);
  addSequences(byRank, 3, targetCombo?.type === "steel" || targetCombo?.type === "tripleSeq" ? targetCombo.sequenceLength : 2, add);
  addStraightFlushes(sorted, add);

  const jokers = sorted.filter((card) => isJokerRank(card.rank));
  if (jokers.length === 4) add(jokers);

  return candidates;
}

function groupCardsByRank(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!map.has(card.rank)) map.set(card.rank, []);
    map.get(card.rank).push(card);
  }
  for (const group of map.values()) {
    group.sort((a, b) => suitSort(a.suit) - suitSort(b.suit));
  }
  return map;
}

function addSequences(byRank, countPerRank, sequenceLength, add) {
  if (!sequenceLength || sequenceLength < 2) return;
  if (countPerRank === 1 && sequenceLength !== 5) return;
  if (countPerRank === 2 && sequenceLength < 3) return;
  for (const ranks of sequenceWindows(sequenceLength)) {
    if (ranks.every((rank) => (byRank.get(rank)?.length || 0) >= countPerRank)) {
      add(ranks.flatMap((rank) => byRank.get(rank).slice(0, countPerRank)));
    }
  }
}

function addStraightFlushes(hand, add) {
  for (const suit of SUITS) {
    const suited = hand.filter((card) => card.suit === suit.id);
    const byRank = groupCardsByRank(suited);
    for (const ranks of sequenceWindows(5)) {
      if (ranks.every((rank) => byRank.has(rank))) {
        add(ranks.map((rank) => byRank.get(rank)[0]));
      }
    }
  }
}

function render() {
  renderHeader();
  renderSeats();
  renderCenter();
  renderHand();
  renderButtons();
  renderMemory();
  renderLog();
}

function renderHeader() {
  const currentName = state.current === null ? "无" : state.players[state.current].name;
  els.roundStatus.textContent = `${state.message} · 逆时针 · 当前级牌 ${state.levelRank} · 当前轮到 ${currentName}`;
  els.roundBadge.textContent = `第 ${match.roundNo} 局`;
  els.levelBadge.textContent = `打 ${state.levelRank}`;
  const teamText = `我方 ${match.teamLevels[0]} · 对方 ${match.teamLevels[1]}`;
  els.scoreBadge.textContent = state.roundResult
    ? `${state.roundResult.name}，升 ${state.roundResult.advance} 级`
    : teamText;
  els.newGameBtn.textContent = state.over && state.nextRoundLevel ? `继续下一局：打 ${state.nextRoundLevel}` : "重开训练";
}

function renderSeats() {
  renderSeat(els.playerNorth, state.players[2]);
  renderSeat(els.playerWest, state.players[1]);
  renderSeat(els.playerEast, state.players[3]);
  renderSeat(els.playerSouth, state.players[0], true);
}

function renderSeat(container, player, isUser = false) {
  container.classList.toggle("current", state.current === player.id);
  const teamText = player.team === 0 ? "我方" : "对方";
  const finish = player.finished ? finishName(state.finishedOrder.indexOf(player.id) + 1) : `${player.hand.length} 张`;
  const stack = isUser ? "" : renderBackStack(Math.min(9, Math.ceil(player.hand.length / 3)));
  const lastCards = state.lastPlay?.player === player.id ? renderCards(state.lastPlay.cards, true, true) : "";
  container.innerHTML = `
    <div class="seat-head">
      <span class="seat-name">${player.name}</span>
      <span class="seat-meta">${teamText} · ${finish}</span>
    </div>
    <div class="seat-action">${escapeHtml(player.lastAction)}</div>
    <div class="card-stack">${stack}</div>
    <div class="last-cards">${lastCards}</div>
  `;
}

function renderBackStack(count) {
  return Array.from({ length: count }, () => '<span class="back-card"></span>').join("");
}

function renderCenter() {
  if (!state.lastPlay) {
    els.centerPile.innerHTML = `<div class="empty-state">自由出牌</div>`;
    return;
  }
  const player = state.players[state.lastPlay.player];
  els.centerPile.innerHTML = `
    <div>
      <div class="pile-title">${player.name} · ${state.lastPlay.combo.name}</div>
      <div class="pile-cards">${renderCards(state.lastPlay.cards, true, false)}</div>
    </div>
  `;
}

function renderHand() {
  els.hand.innerHTML = state.players[0].hand
    .map((card) => renderCard(card, true, false, state.selected.has(card.id), true))
    .join("");
  els.hand.querySelectorAll(".card").forEach((button) => {
    button.addEventListener("click", () => toggleSelect(button.dataset.cardId));
  });

  const selectedCards = state.players[0].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  if (!selectedCards.length) {
    els.selectionInfo.textContent = "请选择手牌";
  } else if (combo) {
    els.selectionInfo.textContent = `${selectedCards.length} 张 · ${combo.name}`;
  } else {
    els.selectionInfo.textContent = `${selectedCards.length} 张 · 牌型不成立`;
  }
}

function toggleSelect(cardId) {
  if (state.current !== 0 || state.over) return;
  if (state.selected.has(cardId)) {
    state.selected.delete(cardId);
  } else {
    state.selected.add(cardId);
  }
  render();
}

function renderButtons() {
  const userTurn = state.current === 0 && !state.over;
  const selectedCards = state.players[0].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  els.playBtn.disabled = !userTurn || !combo;
  els.passBtn.disabled = !userTurn || !state.lastPlay;
  els.hintBtn.disabled = !userTurn;
}

function renderMemory() {
  const played = countBy(
    state.history
      .filter((entry) => entry.action === "play")
      .flatMap((entry) => entry.cards.map((card) => card.rank))
  );
  const own = countBy(state.players[0].hand.map((card) => card.rank));
  const ranks = state.showFullMemory ? [...RANKS, "SJ", "BJ"] : ["A", "2", state.levelRank, "SJ", "BJ"];
  const uniqueRanks = [...new Set(ranks)];
  els.memoryBoard.innerHTML = uniqueRanks
    .map((rank) => {
      const total = TOTAL_BY_RANK[rank];
      const seen = (played[rank] || 0) + (own[rank] || 0);
      const unseen = Math.max(0, total - seen);
      const ratio = total ? seen / total : 0;
      const hot = unseen >= (rank === "SJ" || rank === "BJ" ? 1 : 4);
      return `
        <div class="memory-row ${hot ? "hot" : ""}">
          <span class="memory-rank">${escapeHtml(rankName(rank))}</span>
          <span class="memory-track"><span class="memory-fill" style="width:${Math.round(ratio * 100)}%"></span></span>
          <span class="memory-count">${unseen}</span>
        </div>
      `;
    })
    .join("");
}

function renderLog() {
  const entries = [...state.history].reverse();
  els.moveLog.innerHTML = entries
    .map((entry) => {
      const player = state.players[entry.playerId];
      if (entry.action === "pass") {
        const target = entry.targetCombo ? `，不要 ${entry.targetCombo.name}` : "";
        return `<li><span class="log-no">第 ${entry.moveNo} 手</span> <strong>${player.name}</strong> 过牌${target}</li>`;
      }
      return `<li><span class="log-no">第 ${entry.moveNo} 手</span> <strong>${player.name}</strong> ${entry.combo.name}：${entry.cards.map(cardText).join(" ")}</li>`;
    })
    .join("");
}

function renderCards(cards, faceUp = true, small = false) {
  return cards.map((card) => renderCard(card, faceUp, small, false, false)).join("");
}

function renderCard(card, faceUp = true, small = false, selected = false, asButton = false) {
  if (!faceUp) return '<span class="back-card"></span>';
  const tag = asButton ? "button" : "span";
  const type = asButton ? 'type="button"' : "";
  const data = asButton ? `data-card-id="${card.id}" aria-label="${cardText(card)}"` : "";
  const selectedClass = selected ? "selected" : "";
  const wildClass = isWild(card) ? "wild" : "";
  const jokerClass = isJokerRank(card.rank) ? "joker" : card.color;
  const rankLabel = isJokerRank(card.rank) ? (card.rank === "SJ" ? "小王" : "大王") : card.rank;
  const suitLabel = isJokerRank(card.rank) ? "JOKER" : card.suitSymbol;
  const wildBadge = isWild(card) ? '<span class="wild-badge">配</span>' : "";
  return `
    <${tag} ${type} ${data} class="card ${small ? "small" : ""} ${jokerClass} ${wildClass} ${selectedClass}">
      <span class="rank">${rankLabel}</span>
      <span class="suit">${suitLabel}</span>
      <span class="rank">${rankLabel}</span>
      ${wildBadge}
    </${tag}>
  `;
}

function cardText(card) {
  if (card.rank === "SJ") return "小王";
  if (card.rank === "BJ") return "大王";
  return `${card.rank}${card.suitSymbol}`;
}

function rankName(rank) {
  if (rank === "SJ") return "小王";
  if (rank === "BJ") return "大王";
  return rank;
}

function finishName(position) {
  return ["头游", "二游", "三游", "末游"][position - 1] || `第${position}名`;
}

function renderReview() {
  const rankItems = state.finishedOrder
    .map((playerId, index) => `<li>${finishName(index + 1)}：${state.players[playerId].name}</li>`)
    .join("");
  const diagnostics = buildDiagnostics();
  const signals = buildSignalReview();
  const kingReads = buildKingReadReview();
  const typeSignals = buildTypeSignalReview();
  const moveSummary = state.history
    .filter((entry) => entry.playerId === 0 && entry.action === "play")
    .reverse()
    .map((entry) => `<li>第 ${entry.moveNo} 手：${entry.combo.name}：${entry.cards.map(cardText).join(" ")}</li>`)
    .join("");
  els.reviewContent.innerHTML = `
    <div class="review-kpi">
      <span class="status-chip">${state.roundResult.name}</span>
      <span class="status-chip">本局打 ${state.levelRank}</span>
      <span class="status-chip">下局打 ${state.nextRoundLevel}</span>
    </div>
    <h3>名次</h3>
    <ol>${rankItems}</ol>
    <h3>明确失误</h3>
    <ul class="diagnostic-list">${diagnostics.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>本局信号推断</h3>
    <ul class="signal-list">${signals.map((item) => `<li>${item}</li>`).join("")}</ul>
    ${kingReads.length ? `<h3>王牌判断</h3><ul class="signal-list">${kingReads.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    <h3>牌型表达</h3>
    <ul class="signal-list">${typeSignals.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h3>你的出牌线</h3>
    <ol>${moveSummary || "<li>本局没有主动出牌记录</li>"}</ol>
    <div class="review-actions">
      <button id="nextRoundBtn" class="primary-btn" type="button">继续下一局：打 ${state.nextRoundLevel}</button>
    </div>
  `;
  document.getElementById("nextRoundBtn")?.addEventListener("click", continueMatch);
  els.reviewPanel.hidden = false;
}

function buildDiagnostics() {
  const notes = state.userNotes;
  const passWithAnswer = notes.filter((note) => note.kind === "pass" && note.couldBeat);
  const missedBlocks = passWithAnswer.filter((note) => note.danger);
  const riskyBombs = notes.filter((note) => note.kind === "play" && note.bombOnNormal && !note.danger);
  const splitGroups = notes.filter((note) => note.kind === "play" && note.brokeRanks.length && note.combo.type === "single");
  const partnerOvertakes = notes.filter((note) => note.kind === "play" && note.partnerOvertake);
  const soloFirst = notes.filter((note) => note.kind === "play" && note.partnerRemainingBefore <= 5 && note.remainingBefore > note.partnerRemainingBefore + 4);
  const plays = notes.filter((note) => note.kind === "play");
  const bombs = plays.filter((note) => isBombLike(note.combo));
  const rank = state.finishedOrder.indexOf(0) + 1;
  const diagnostics = [];

  if (rank > 2) {
    diagnostics.push("<strong>整体问题：</strong>这一局你方没有拿到前两名。以后到中后段先看每个人还剩几张，谁只剩 5 张以内，就要优先考虑拦住他，而不是只清自己的牌。");
  } else {
    diagnostics.push("<strong>整体情况：</strong>这一局你方名次不错。复盘重点不只是赢没赢，而是看哪些手牌可以更早帮对家接牌。");
  }

  if (missedBlocks.length) {
    const sample = missedBlocks[0];
    diagnostics.push(`<strong>第 ${sample.moveNo} 手过牌有风险：</strong>${sample.targetOwnerName} 出 ${sample.target.name}（${sample.targetText}）后只剩 ${sample.targetRemaining} 张，你其实可以用 ${sample.couldBeat.name} 压住。错在只想着省牌；正确逻辑是：对手快走完时，先拦住，再看能不能把牌权交给对家。`);
  } else if (passWithAnswer.length) {
    const sample = passWithAnswer[0];
    diagnostics.push(`<strong>第 ${sample.moveNo} 手可压未压：</strong>${sample.targetOwnerName} 出 ${sample.target.name}（${sample.targetText}），你可以用 ${sample.couldBeat.name} 接，但选择了过。正确逻辑是：如果接完能继续出成组牌，或者能把下一个牌权送给对家，就应该接；如果接完只剩散牌，才考虑放。`);
  } else {
    diagnostics.push("<strong>过牌：</strong>没有发现明显“该接却没接”的回合。下一步要练的是：过牌时顺手记住谁不要这种牌型。");
  }

  if (partnerOvertakes.length) {
    const sample = partnerOvertakes[0];
    diagnostics.push(`<strong>第 ${sample.moveNo} 手压了对家：</strong>对家刚出 ${sample.targetComboName}（${sample.targetText}），你又出 ${sample.combo.name}（${sample.cardsText}）压回来。错在抢了自己队友的牌权；正确逻辑是：除非你这一手能直接走完，否则默认让对家继续控牌。`);
  }

  if (soloFirst.length) {
    const sample = soloFirst[0];
    diagnostics.push(`<strong>第 ${sample.moveNo} 手只顾自己：</strong>当时对家只剩 ${sample.partnerRemainingBefore} 张，你出了 ${sample.combo.name}（${sample.cardsText}）。正确逻辑是：先回想对家前面不要过什么、主动出过什么，再选择他可能接得上的牌型，而不是先清自己的散牌。`);
  }

  if (riskyBombs.length) {
    const sample = riskyBombs[0];
    diagnostics.push(`<strong>第 ${sample.moveNo} 手炸弹偏早：</strong>你用 ${sample.combo.name}（${sample.cardsText}）压普通牌。错在把最强的抢牌权工具提前交掉；正确逻辑是：炸弹优先留给三种情况：对手快走完、保护对家走完、你自己炸完能连续走。`);
  } else if (bombs.length) {
    diagnostics.push("<strong>炸弹：</strong>没有发现明显早炸。继续记住：炸弹不是“能炸就炸”，而是“必须拿回牌权时再炸”。");
  }

  if (splitGroups.length) {
    const sample = splitGroups[0];
    const ranks = [...new Set(splitGroups.flatMap((note) => note.brokeRanks))].join("、");
    diagnostics.push(`<strong>第 ${sample.moveNo} 手拆牌要小心：</strong>你出了单张（${sample.cardsText}），拆到了 ${ranks} 的对子或三张。正确逻辑是：拆之前先问自己，拆完剩下的牌还能不能成对子、三带二或连对；如果不能，通常不该拆。`);
  }

  const memoryTip = memoryInsight();
  if (memoryTip) diagnostics.push(`<strong>记牌：</strong>${memoryTip}`);
  return diagnostics;
}

function buildSignalReview() {
  const chronological = [...state.history].reverse();
  const partnerPasses = signalPassEntries(chronological, 2);
  const rightPasses = signalPassEntries(chronological, 3);
  const leftPasses = signalPassEntries(chronological, 1);
  const partnerPlays = signalPlayEntries(chronological, 2);
  const signals = [];
  const partnerPassSummary = summarizePassTypes(partnerPasses);
  const rightPassSummary = summarizePassTypes(rightPasses);
  const leftPassSummary = summarizePassTypes(leftPasses);

  if (partnerPassSummary) {
    const sample = partnerPasses[0];
    signals.push(`<strong>对家不想接什么：</strong>对家从第 ${sample.moveNo} 手开始，重复不要 ${partnerPassSummary}。这才算比较有用的信号。你拿到牌权时，不要反复给他这种牌型，要改看他主动出过什么。`);
  } else {
    signals.push("<strong>对家不想接什么：</strong>本局没有看到对家重复不要同一种普通牌型。读对家时，重点看他主动出过什么。");
  }

  if (partnerPlays.length) {
    const sample = partnerPlays[0];
    signals.push(`<strong>对家可能要什么：</strong>对家第 ${sample.moveNo} 手起主动出过 ${summarizePlayTypes(partnerPlays)}。他主动出的牌型，通常就是他手里比较顺的方向。你下次有选择时，优先出同类或相近牌型，让他低成本接上。`);
  }

  if (rightPassSummary) {
    const sample = rightPasses[0];
    signals.push(`<strong>右家（你的下家）不要什么：</strong>右家从第 ${sample.moveNo} 手开始，重复不要 ${rightPassSummary}。你出牌后先轮到右家，所以如果他反复不要某种牌型，你可以继续打这一路，让他难受。`);
  }

  if (leftPassSummary) {
    const sample = leftPasses[0];
    signals.push(`<strong>左家（你的上家）不要什么：</strong>左家从第 ${sample.moveNo} 手开始，重复不要 ${leftPassSummary}。这说明牌权转回你之前，他在这些牌型上不强；但你出牌要先过右家，所以还要先看右家能不能接。`);
  }

  return signals;
}

function signalPassEntries(entries, playerId) {
  return entries.filter(
    (entry) =>
      entry.action === "pass" &&
      entry.playerId === playerId &&
      entry.targetCombo &&
      !isObviousPassSignal(entry.targetCombo)
  );
}

function signalPlayEntries(entries, playerId) {
  return entries.filter(
    (entry) =>
      entry.action === "play" &&
      entry.playerId === playerId &&
      entry.combo &&
      !isObviousPassSignal(entry.combo)
  );
}

function isObviousPassSignal(combo) {
  return isBombLike(combo) || combo.type === "jokerBomb" || combo.type === "straightFlush";
}

function buildKingReadReview() {
  const chronological = [...state.history].reverse();
  const reads = [];
  const userKingSingles = chronological.filter(
    (entry) =>
      entry.action === "play" &&
      entry.playerId === 0 &&
      entry.combo?.type === "single" &&
      entry.cards.length === 1 &&
      (entry.cards[0].rank === "SJ" || entry.cards[0].rank === "BJ")
  );

  for (const play of userKingSingles.slice(0, 3)) {
    const later = chronological.filter((entry) => entry.moveNo > play.moveNo);
    const responses = [];
    for (const entry of later) {
      if (entry.action === "play" && entry.playerId !== 0 && entry.targetPlayer !== 0) break;
      if (entry.action === "pass" && entry.targetPlayer === 0) responses.push(entry);
      if (entry.action === "play" && entry.playerId !== 0) {
        responses.push(entry);
        break;
      }
    }
    const opponentPasses = responses.filter((entry) => entry.action === "pass" && !sameTeam(0, entry.playerId));
    const opponentBeat = responses.find((entry) => entry.action === "play" && !sameTeam(0, entry.playerId));
    if (play.cards[0].rank === "SJ" && opponentPasses.length && !opponentBeat) {
      reads.push(`<strong>第 ${play.moveNo} 手你出小王：</strong>${opponentPasses.map((entry) => state.players[entry.playerId].name).join("、")}都没拿大王压。正常牌桌里，对手有大王通常会压小王拿回单张牌权，除非他非常确定你后面单张不多、或者他想让你继续放单给他队友。更稳的判断是：先认为他们大王概率下降，但不要直接推出“大王都在对家”。下一轮继续看他们是否还放你的单张。`);
    } else if (play.cards[0].rank === "SJ" && opponentBeat) {
      reads.push(`<strong>第 ${play.moveNo} 手你出小王：</strong>${state.players[opponentBeat.playerId].name}用 ${opponentBeat.cards.map(cardText).join(" ")} 压了。这说明他要拿回单张牌权，后面你不能再轻易按“单张一路通”来打。`);
    } else if (play.cards[0].rank === "BJ") {
      reads.push(`<strong>第 ${play.moveNo} 手你出大王：</strong>大王没人能压。它不是用来试探的小牌，最好用在你需要稳拿牌权、保护对家走完，或者你自己能接着走一串牌的时候。`);
    }
  }

  return reads;
}

function buildTypeSignalReview() {
  const userTypes = [...new Set(
    state.history
      .filter((entry) => entry.action === "play" && entry.playerId === 0)
      .map((entry) => entry.combo.type)
  )];
  const relevantTypes = userTypes.length ? userTypes : ["single", "pair", "straight", "fullHouse"];
  const explanations = {
    single: "<strong>单张：</strong>单张最容易暴露谁手里有大牌。右家不要单张，说明你可以继续用单张卡他；对家不要单张，说明别再拿单张喂他，除非你知道他能接 2 或王。",
    pair: "<strong>对子：</strong>对子是在问别人“你有没有成对的大牌”。对家主动出对子，说明他对子可能比较顺；右家或左家多次不要对子，你后面可以继续打对子压他们。",
    straight: "<strong>顺子：</strong>顺子是在一次性清 5 张牌。别人不要顺子，通常是手里断了；对家出顺子时，你不要抢他的牌权，应该让他把这一串清掉。",
    doubleSeq: "<strong>连对/三连对：</strong>连对是在看谁手里对子连得上。AA2233 这种也是有效三连对。谁不要连对，说明他的对子不连；你后面可以用连对让他继续难受。",
    fullHouse: "<strong>三带二：</strong>三带二要同时有三张和对子。别人不要三带二，可能是没有三张，也可能是没有对子配。记住谁不要，后面别轻易切到他舒服的单张。",
    steel: "<strong>钢板：</strong>钢板是两组三张连在一起。别人不要钢板，多半是真的接不上；对家能出钢板，说明他手里成组牌多，你要帮他保住这个方向。",
    tripleSeq: "<strong>三顺：</strong>三顺和钢板类似，都是一次清很多成组牌。没人接时，说明桌上其他人成组牌不整齐，后面对子、三带二可能更容易通。",
    triple: "<strong>三张：</strong>三张是在试别人有没有更大的三张，或者在准备三带二。谁不要三张，说明他三张不强；但还要看他后面能不能接三带二。",
    bomb: "<strong>炸弹：</strong>炸弹不是普通跟牌。它应该用在：对手快走完、保护对家走完、或者你炸完能连续走完。",
    straightFlush: "<strong>同花顺：</strong>同花顺是大控制牌。除非能改变名次，不要当普通顺子随手交掉。",
    jokerBomb: "<strong>天王炸：</strong>天王炸是最后保险。它的意思是“这手必须拿回来”，不是“我能压就压”。",
  };
  return relevantTypes.map((type) => explanations[type]).filter(Boolean);
}

function summarizePassTypes(entries) {
  const counts = countBy(entries.map((entry) => entry.targetCombo.name));
  return Object.entries(counts)
    .filter((entry) => entry[1] >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} ${count} 次`)
    .join("、");
}

function summarizePlayTypes(entries) {
  const counts = countBy(entries.map((entry) => entry.combo.name));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} ${count} 次`)
    .join("、");
}

function memoryInsight() {
  const played = countBy(
    state.history
      .filter((entry) => entry.action === "play")
      .flatMap((entry) => entry.cards.map((card) => card.rank))
  );
  const own = countBy(state.players[0].hand.map((card) => card.rank));
  const highRanks = [...new Set(["A", "2", state.levelRank, "SJ", "BJ"])];
  const unseen = highRanks
    .map((rank) => [rank, TOTAL_BY_RANK[rank] - (played[rank] || 0) - (own[rank] || 0)])
    .filter((entry) => entry[1] > 0);
  if (!unseen.length) return "";
  return `终局仍有 ${unseen.map(([rank, count]) => `${count} 张 ${rankName(rank)}`).join("、")} 在外。中盘看到这些牌迟迟不出，要默认有人握着大牌。`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", init);

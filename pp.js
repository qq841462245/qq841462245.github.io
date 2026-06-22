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
  { id: "spades", symbol: "?", color: "black" },
  { id: "hearts", symbol: "?", color: "red" },
  { id: "clubs", symbol: "?", color: "black" },
  { id: "diamonds", symbol: "?", color: "red" },
];
const JOKERS = [
  { rank: "SJ", label: "??", short: "?" },
  { rank: "BJ", label: "??", short: "?" },
];
const PLAYER_ORDER = [
  { id: 0, name: "?", seat: "South", team: 0 },
  { id: 1, name: "??", seat: "West", team: 1 },
  { id: 2, name: "??", seat: "North", team: 0 },
  { id: 3, name: "??", seat: "East", team: 1 },
];
const PLAY_DIRECTION = -1;
const CHEAP_RESPONSE_LIMIT = 620;
const COSTLY_RESPONSE_LIMIT = 980;
const COMBO_NAMES = {
  single: "??",
  pair: "??",
  triple: "??",
  fullHouse: "???",
  straight: "??",
  doubleSeq: "??",
  tripleSeq: "??",
  steel: "??",
  bomb: "??",
  straightFlush: "???",
  jokerBomb: "???",
};
const TOTAL_BY_RANK = Object.fromEntries([...RANKS.map((rank) => [rank, 8]), ["SJ", 2], ["BJ", 2]]);
const TRAINING_MODES = {
  novice: "????",
  advanced: "????",
};
const MULTIPLAYER_STORAGE_PREFIX = "guandanRoom:";
const ROOM_SEATS = ["??", "??", "??", "??"];
const AVATAR_OPTIONS = [
  { id: "swordsman", name: "????", mark: "?", tone: "sky" },
  { id: "miko", name: "????", mark: "?", tone: "rose" },
  { id: "wanderer", name: "????", mark: "?", tone: "mint" },
  { id: "mecha", name: "????", mark: "?", tone: "steel" },
  { id: "detective", name: "????", mark: "?", tone: "gold" },
  { id: "mage", name: "????", mark: "?", tone: "violet" },
];
const els = {};
let match;
let state;
let trainingMode = localStorage.getItem("guandanTrainingMode") || "novice";
let screenMode = "home";
let selectedAvatar = localStorage.getItem("guandanAvatar") || AVATAR_OPTIONS[0].id;
let multiplayerRoom = null;
let localSeatId = 0;
if (!AVATAR_OPTIONS.some((avatar) => avatar.id === selectedAvatar)) selectedAvatar = AVATAR_OPTIONS[0].id;

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
    "coachTip",
    "hintBtn",
    "passBtn",
    "playBtn",
    "hand",
    "reviewPanel",
    "reviewContent",
    "closeReviewBtn",
    "toggleMemoryBtn",
    "noviceModeBtn",
    "advancedModeBtn",
    "homeScreen",
    "gameScreen",
    "startNoviceBtn",
    "startAdvancedBtn",
    "backHomeBtn",
    "playerNameInput",
    "avatarGrid",
    "roomCodeInput",
    "createRoomBtn",
    "joinRoomBtn",
    "multiplayerRoomPanel",
    "roomCodeLabel",
    "copyRoomBtn",
    "roomSeatGrid",
    "startRoomBtn",
    "multiplayerNotice",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  els.startNoviceBtn.addEventListener("click", () => showSinglePlayer("novice"));
  els.startAdvancedBtn.addEventListener("click", () => showSinglePlayer("advanced"));
  els.backHomeBtn.addEventListener("click", showHome);
  els.createRoomBtn.addEventListener("click", createMultiplayerRoom);
  els.joinRoomBtn.addEventListener("click", joinMultiplayerRoom);
  els.copyRoomBtn.addEventListener("click", copyRoomLink);
  els.startRoomBtn.addEventListener("click", startMultiplayerRoom);
  window.addEventListener("storage", handleRoomStorage);
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
  els.noviceModeBtn.addEventListener("click", () => setTrainingMode("novice"));
  els.advancedModeBtn.addEventListener("click", () => setTrainingMode("advanced"));

  els.playerNameInput.value = localStorage.getItem("guandanPlayerName") || "";
  renderAvatarChoices();
  hydrateRoomFromUrl();
  resetMatch();
  startGame();
  showHome();
}

function showHome() {
  screenMode = "home";
  els.homeScreen.hidden = false;
  els.gameScreen.hidden = true;
  els.reviewPanel.hidden = true;
  renderMultiplayerRoom();
  renderHeader();
}

function showSinglePlayer(mode = trainingMode) {
  localSeatId = 0;
  screenMode = "single";
  els.homeScreen.hidden = true;
  els.gameScreen.hidden = false;
  trainingMode = mode;
  localStorage.setItem("guandanTrainingMode", mode);
  if (state?.multiplayer) {
    resetMatch();
    startGame();
    return;
  }
  setTrainingMode(mode);
  render();
}

function currentProfile() {
  const name = els.playerNameInput.value.trim() || "?????";
  localStorage.setItem("guandanPlayerName", name);
  localStorage.setItem("guandanAvatar", selectedAvatar);
  return {
    name,
    avatarId: selectedAvatar,
  };
}

function createMultiplayerRoom() {
  const room = {
    code: generateRoomCode(),
    seats: Array.from({ length: 4 }, () => null),
    status: "waiting",
    state: null,
    createdAt: Date.now(),
  };
  multiplayerRoom = room;
  screenMode = "multiLobby";
  els.homeScreen.hidden = false;
  els.gameScreen.hidden = true;
  localSeatId = 0;
  room.seats[localSeatId] = currentProfile();
  els.roomCodeInput.value = room.code;
  showRoomNotice("???????????");
  persistMultiplayerRoom();
  renderMultiplayerRoom();
  renderHeader();
}

function joinMultiplayerRoom() {
  const code = normalizeRoomCode(els.roomCodeInput.value);
  const room = code ? loadMultiplayerRoom(code) : null;
  if (!room) {
    showRoomNotice("?????????GitHub Pages ??????????????????????????????????????");
    return;
  }
  multiplayerRoom = room;
  screenMode = "multiLobby";
  els.homeScreen.hidden = false;
  els.gameScreen.hidden = true;
  const profile = currentProfile();
  const existingSeat = room.seats.findIndex((seat) => seat?.name === profile.name && seat?.avatarId === profile.avatarId);
  const seatId = existingSeat >= 0 ? existingSeat : room.seats.findIndex((seat) => !seat);
  if (seatId < 0) {
    showRoomNotice("??????????");
    return;
  }
  localSeatId = seatId;
  room.seats[seatId] = profile;
  showRoomNotice(`${ROOM_SEATS[seatId]} ?????`);
  persistMultiplayerRoom();
  renderMultiplayerRoom();
  if (room.status === "playing" && room.state) {
    enterMultiplayerGame(room);
  } else {
    renderHeader();
  }
}

function occupyRoomSeat(seatId) {
  if (!multiplayerRoom || multiplayerRoom.status !== "waiting") return;
  localSeatId = seatId;
  multiplayerRoom.seats[seatId] = currentProfile();
  showRoomNotice(`${ROOM_SEATS[seatId]} ?????`);
  persistMultiplayerRoom();
  renderMultiplayerRoom();
}

function startMultiplayerRoom() {
  if (!multiplayerRoom) return;
  if (!multiplayerRoom.seats.every(Boolean)) {
    showRoomNotice("??????????????????");
    return;
  }
  screenMode = "multi";
  resetMatch();
  startGame({
    multiplayer: true,
    roster: multiplayerRoom.seats.map((seat, index) => ({
      id: index,
      name: seat.name,
      avatarId: seat.avatarId,
      seat: PLAYER_ORDER[index].seat,
      team: PLAYER_ORDER[index].team,
    })),
  });
  multiplayerRoom.status = "playing";
  multiplayerRoom.state = serializeGameState();
  persistMultiplayerRoom();
  els.homeScreen.hidden = true;
  els.gameScreen.hidden = false;
  render();
}

function enterMultiplayerGame(room) {
  multiplayerRoom = room;
  screenMode = "multi";
  state = reviveGameState(room.state);
  match = state.matchSnapshot || match;
  els.homeScreen.hidden = true;
  els.gameScreen.hidden = false;
  els.reviewPanel.hidden = true;
  render();
}

function renderMultiplayerRoom() {
  if (!els.multiplayerRoomPanel) return;
  els.multiplayerRoomPanel.hidden = !multiplayerRoom;
  if (!multiplayerRoom) return;
  els.roomCodeLabel.textContent = `?? ${multiplayerRoom.code}`;
  els.roomSeatGrid.innerHTML = multiplayerRoom.seats
    .map((seat, index) => {
      const occupied = Boolean(seat);
      const avatar = occupied ? avatarById(seat.avatarId) : null;
      return `
        <button class="room-seat ${occupied ? "occupied" : ""} ${index === localSeatId ? "self" : ""}" type="button" data-seat="${index}" ${multiplayerRoom.status === "playing" ? "disabled" : ""}>
          <span class="room-seat-pos">${ROOM_SEATS[index]}</span>
          ${
            occupied
              ? `<span class="avatar-portrait ${avatar.tone}"><span class="avatar-hair"></span><span class="avatar-face">${avatar.mark}</span></span><strong>${escapeHtml(seat.name)}</strong>`
              : "<strong>??</strong>"
          }
        </button>
      `;
    })
    .join("");
  els.roomSeatGrid.querySelectorAll(".room-seat").forEach((button) => {
    button.addEventListener("click", () => occupyRoomSeat(Number(button.dataset.seat)));
  });
  const ready = multiplayerRoom.seats.every(Boolean);
  els.startRoomBtn.disabled = !ready || multiplayerRoom.status === "playing";
  els.startRoomBtn.textContent = ready ? "??????" : "???????";
}

function avatarById(id) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === id) || AVATAR_OPTIONS[0];
}

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRoomCode(code) {
  return String(code || "").trim().toUpperCase();
}

function roomStorageKey(code = multiplayerRoom?.code) {
  return `${MULTIPLAYER_STORAGE_PREFIX}${normalizeRoomCode(code)}`;
}

function loadMultiplayerRoom(code) {
  try {
    return JSON.parse(localStorage.getItem(roomStorageKey(code)) || "null");
  } catch {
    return null;
  }
}

function persistMultiplayerRoom() {
  if (!multiplayerRoom) return;
  localStorage.setItem(roomStorageKey(), JSON.stringify(multiplayerRoom));
}

function showRoomNotice(message) {
  els.multiplayerNotice.hidden = false;
  els.multiplayerNotice.textContent = message;
}

function copyRoomLink() {
  if (!multiplayerRoom) return;
  const url = new URL(window.location.href);
  url.searchParams.set("room", multiplayerRoom.code);
  navigator.clipboard?.writeText(url.toString());
  showRoomNotice("????????");
}

function hydrateRoomFromUrl() {
  const code = normalizeRoomCode(new URLSearchParams(window.location.search).get("room"));
  if (code) els.roomCodeInput.value = code;
}

function handleRoomStorage(event) {
  if (!multiplayerRoom || event.key !== roomStorageKey()) return;
  const room = event.newValue ? JSON.parse(event.newValue) : null;
  if (!room) return;
  multiplayerRoom = room;
  if (screenMode === "multi" && room.state) {
    state = reviveGameState(room.state);
    match = state.matchSnapshot || match;
    render();
    return;
  }
  if (screenMode === "multiLobby" && room.status === "playing" && room.state) {
    enterMultiplayerGame(room);
    return;
  }
  renderMultiplayerRoom();
}

function renderAvatarChoices() {
  els.avatarGrid.innerHTML = AVATAR_OPTIONS
    .map(
      (avatar) => `
        <button class="avatar-choice ${avatar.id === selectedAvatar ? "active" : ""}" type="button" data-avatar="${avatar.id}">
          <span class="avatar-portrait ${avatar.tone}">
            <span class="avatar-hair"></span>
            <span class="avatar-face">${avatar.mark}</span>
          </span>
          <span>${avatar.name}</span>
        </button>
      `
    )
    .join("");
  els.avatarGrid.querySelectorAll(".avatar-choice").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAvatar = button.dataset.avatar;
      localStorage.setItem("guandanAvatar", selectedAvatar);
      renderAvatarChoices();
    });
  });
}

function selectedAvatarOption() {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === selectedAvatar) || AVATAR_OPTIONS[0];
}

function setTrainingMode(mode) {
  trainingMode = mode;
  localStorage.setItem("guandanTrainingMode", mode);
  if (state) {
    state.mode = mode;
    state.coachTip = "";
    state.pendingAdviceKey = "";
    state.message = mode === "novice" ? "??????????????????" : "???????????????";
    render();
  }
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

function startGame(options = {}) {
  const levelRank = match.currentLevel;
  const roster = options.roster || PLAYER_ORDER;
  const isMultiplayer = Boolean(options.multiplayer);
  const players = roster.map((player) => ({
    ...player,
    hand: [],
    lastAction: "???",
    finished: false,
  }));
  const deck = shuffle(buildDeck());
  deck.forEach((card, index) => {
    players[index % 4].hand.push(card);
  });
  const tribute = isMultiplayer
    ? { records: [], leadPlayer: 0, message: "???????????" }
    : applyTribute(players, match.lastResult, levelRank);
  players.forEach((player) => {
    sortHand(player.hand, levelRank);
  });

  state = {
    levelRank,
    players,
    current: tribute.leadPlayer ?? 0,
    selected: new Set(),
    lastPlay: null,
    passesSincePlay: 0,
    finishedOrder: [],
    history: [],
    tributeRecords: tribute.records,
    userNotes: [],
    mode: isMultiplayer ? "multiplayer" : trainingMode,
    multiplayer: isMultiplayer,
    localSeatId,
    coachTip: "",
    pendingAdviceKey: "",
    moveNo: 1,
    roundNo: match.roundNo,
    roundResult: null,
    nextRoundLevel: null,
    message: tribute.message || `? ${match.roundNo} ??${players[tribute.leadPlayer ?? 0].name}??`,
    over: false,
    aiRunning: false,
    showFullMemory: false,
    matchSnapshot: { ...match },
  };

  els.reviewPanel.hidden = true;
  render();
}

function serializeGameState() {
  if (!state) return null;
  return {
    ...state,
    selected: [],
    aiRunning: false,
    matchSnapshot: { ...match },
  };
}

function reviveGameState(snapshot) {
  return {
    ...snapshot,
    selected: new Set(),
    aiRunning: false,
    localSeatId,
  };
}

function syncMultiplayerState() {
  if (!state?.multiplayer || !multiplayerRoom) return;
  multiplayerRoom.status = state.over ? "finished" : "playing";
  multiplayerRoom.state = serializeGameState();
  persistMultiplayerRoom();
}

function localPlayerId() {
  return state?.multiplayer ? localSeatId : 0;
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

function applyTribute(players, lastResult, levelRank) {
  if (!lastResult?.order?.length) {
    return { records: [], leadPlayer: 0, message: "" };
  }
  const order = lastResult.order;
  const records = [];

  if (lastResult.partnerPlace === 2) {
    const payers = [order[2], order[3]];
    const receivers = [order[0], order[1]];
    if (countBigJokers(players, payers) >= 2) {
      records.push({ type: "anti", text: "????????????????????????" });
      return { records, leadPlayer: order[0], message: "?????????" };
    }
    const entries = payers
      .map((payerId) => ({ payerId, card: highestTributeCard(players[payerId].hand, levelRank) }))
      .filter((entry) => entry.card)
      .sort((a, b) => {
        const strength = cardStrength(b.card, levelRank) - cardStrength(a.card, levelRank);
        if (strength !== 0) return strength;
        return tableDistance(order[0], a.payerId) - tableDistance(order[0], b.payerId);
      });
    entries.forEach((entry, index) => {
      exchangeTribute(players, entry.payerId, receivers[index], entry.card, levelRank, records);
    });
    const leadPlayer = entries[0]?.payerId ?? order[3];
    return { records, leadPlayer, message: `??????????? ${players[leadPlayer].name} ??` };
  }

  const payerId = order[3];
  const receiverId = order[0];
  if (countBigJokers(players, [payerId]) >= 2) {
    records.push({ type: "anti", text: `${players[payerId].name}???????????` });
    return { records, leadPlayer: receiverId, message: "?????????" };
  }
  const tributeCard = highestTributeCard(players[payerId].hand, levelRank);
  if (tributeCard) {
    exchangeTribute(players, payerId, receiverId, tributeCard, levelRank, records);
    return { records, leadPlayer: payerId, message: `?????${players[payerId].name}??` };
  }
  return { records, leadPlayer: 0, message: "" };
}

function countBigJokers(players, playerIds) {
  return playerIds.reduce((total, playerId) => total + players[playerId].hand.filter((card) => card.rank === "BJ").length, 0);
}

function highestTributeCard(hand, levelRank) {
  const candidates = hand.filter((card) => !isHeartLevelCard(card, levelRank));
  const pool = candidates.length ? candidates : hand;
  return [...pool].sort((a, b) => cardStrength(b, levelRank) - cardStrength(a, levelRank))[0] || null;
}

function lowestReturnCard(hand, levelRank, excludedIds = new Set()) {
  const candidates = hand.filter(
    (card) =>
      !excludedIds.has(card.id) &&
      !isJokerRank(card.rank) &&
      !isHeartLevelCard(card, levelRank) &&
      NATURAL_SEQUENCE_VALUE[card.rank] <= 10
  );
  const pool = candidates.length
    ? candidates
    : hand.filter((card) => !excludedIds.has(card.id) && !isJokerRank(card.rank));
  const fallback = pool.length ? pool : hand.filter((card) => !excludedIds.has(card.id));
  return [...fallback].sort((a, b) => returnCardScore(a, hand, levelRank, excludedIds) - returnCardScore(b, hand, levelRank, excludedIds))[0] || null;
}

function returnCardScore(card, hand, levelRank, excludedIds) {
  let score = cardStrength(card, levelRank);
  const sameRankCount = hand.filter((item) => !excludedIds.has(item.id) && item.rank === card.rank).length;
  if (sameRankCount >= 4) score += 240;
  if (sameRankCount === 3) score += 150;
  if (sameRankCount === 2) score += 90;
  if (cardHelpsSequence(card, hand, excludedIds)) score += 55;
  if (isJokerRank(card.rank)) score += 500;
  if (isHeartLevelCard(card, levelRank)) score += 500;
  if (card.rank === levelRank) score += 180;
  if (NATURAL_SEQUENCE_VALUE[card.rank] && NATURAL_SEQUENCE_VALUE[card.rank] <= 10) score -= 10;
  return score;
}

function cardHelpsSequence(card, hand, excludedIds) {
  if (isJokerRank(card.rank)) return false;
  const ranks = [...new Set(hand.filter((item) => !excludedIds.has(item.id) && item.id !== card.id).map((item) => item.rank))];
  const beforeRanks = [...new Set([...ranks, card.rank])];
  const beforeWindows = sequenceWindows(5).filter((window) => window.includes(card.rank) && window.every((rank) => beforeRanks.includes(rank))).length;
  const afterWindows = sequenceWindows(5).filter((window) => window.every((rank) => ranks.includes(rank))).length;
  return beforeWindows > afterWindows;
}

function exchangeTribute(players, payerId, receiverId, tributeCard, levelRank, records) {
  moveCard(players[payerId], players[receiverId], tributeCard.id);
  const returnCard = lowestReturnCard(players[receiverId].hand, levelRank, new Set([tributeCard.id]));
  if (returnCard) moveCard(players[receiverId], players[payerId], returnCard.id);
  records.push({
    type: "tribute",
    payerId,
    receiverId,
    tributeCard,
    returnCard,
  });
}

function moveCard(fromPlayer, toPlayer, cardId) {
  const index = fromPlayer.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return null;
  const [card] = fromPlayer.hand.splice(index, 1);
  toPlayer.hand.push(card);
  return card;
}

function isHeartLevelCard(card, levelRank) {
  return card.rank === levelRank && card.suit === "hearts";
}

function cardStrength(card, levelRank) {
  return rankValue(card.rank, levelRank) * 10 + Math.max(0, suitSort(card.suit));
}

function tableDistance(fromId, toId) {
  return (toId - fromId + 4) % 4;
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
      combo.name = pairRanks.length === 3 ? "???" : `${pairRanks.length}??`;
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
  const playerId = localPlayerId();
  if (state.over || state.current !== playerId) return;
  const selectedCards = state.players[playerId].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  if (!combo) {
    state.message = state.lastPlay ? "??????" : "???????";
    render();
    return;
  }

  const advice = state.mode === "novice" && playerId === 0 ? buildPlayAdvice(selectedCards, combo) : null;
  if (shouldPauseForAdvice(advice)) {
    showAdvice(advice);
    render();
    return;
  }

  clearAdvice();
  noteUserPlay(playerId, selectedCards, combo);
  commitPlay(playerId, selectedCards, combo);
  state.selected.clear();
  syncMultiplayerState();
  render();
  runAiUntilHuman();
}

function passTurn() {
  const playerId = localPlayerId();
  if (state.over || state.current !== playerId || !state.lastPlay) return;
  const response = bestResponseFor(playerId, state.lastPlay.combo, false);
  const advice = state.mode === "novice" && playerId === 0 ? buildPassAdvice(response) : null;
  if (shouldPauseForAdvice(advice)) {
    showAdvice(advice);
    render();
    return;
  }
  clearAdvice();
  if (!state.multiplayer && playerId === 0) {
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
  }
  commitPass(playerId);
  syncMultiplayerState();
  render();
  runAiUntilHuman();
}

function selectHint() {
  const playerId = localPlayerId();
  if (state.multiplayer || state.over || state.current !== playerId) return;
  const hint = state.lastPlay ? bestResponseFor(playerId, state.lastPlay.combo, true) : bestLeadFor(playerId);
  clearAdvice();
  if (!hint) {
    state.message = state.lastPlay ? "????" : "???????";
    render();
    return;
  }
  state.selected = new Set(hint.cards.map((card) => card.id));
  state.message = `???${hint.combo.name}`;
  render();
}

function noteUserPlay(playerId, cards, combo) {
  if (state.multiplayer || playerId !== 0) return;
  const hand = state.players[playerId].hand;
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
    partnerOvertake: sameTeam(playerId, targetOwner),
    bombOnNormal: isBombLike(combo) && state.lastPlay && !isBombLike(state.lastPlay.combo),
    danger: targetWasDanger,
    targetOwner,
    targetOwnerName: typeof targetOwner === "number" ? state.players[targetOwner].name : "",
    targetText: state.lastPlay ? state.lastPlay.cards.map(cardText).join(" ") : "",
    targetComboName: state.lastPlay?.combo.name || "",
    partnerRemainingBefore: state.players[partnerOf(playerId)].hand.length,
    rightRemainingBefore: state.players[(playerId + 3) % 4].hand.length,
    leftRemainingBefore: state.players[(playerId + 1) % 4].hand.length,
    remainingBefore: hand.length,
  });
}

function buildPlayAdvice(cards, combo) {
  const hand = state.players[0].hand;
  const targetOwner = state.lastPlay?.player;
  const targetCombo = state.lastPlay?.combo || null;
  const key = `play:${state.moveNo}:${cards.map((card) => card.id).sort().join("|")}`;
  const finishing = cards.length === hand.length;

  if (sameTeam(0, targetOwner) && !finishing) {
    return {
      key,
      message: `?????????? ${state.lastPlay.combo.name}??????????????????????????????????????`,
    };
  }

  const targetDanger = typeof targetOwner === "number" && !sameTeam(0, targetOwner) && playerDanger(targetOwner);
  if (state.lastPlay && isBombLike(combo) && !isBombLike(targetCombo) && !targetDanger && !finishing) {
    return {
      key,
      message: `???? ${combo.name} ???????????????????????????????????`,
    };
  }

  const beforeCounts = countBy(hand.map((card) => card.rank));
  const brokeRanks = [...new Set(cards.map((card) => card.rank))]
    .filter((rank) => beforeCounts[rank] >= 2 && cards.filter((card) => card.rank === rank).length < beforeCounts[rank]);
  if (combo.type === "single" && brokeRanks.length && !finishing) {
    return {
      key,
      message: `??????? ${brokeRanks.map(rankName).join("?")} ????????????????????????????????????`,
    };
  }

  const partner = state.players[2];
  if (!state.lastPlay && partner && !partner.finished && partner.hand.length <= 5 && cards.length <= 2 && hand.length > partner.hand.length + 4) {
    return {
      key,
      message: `???? ${partner.hand.length} ?????????????????????????????????????????????`,
    };
  }

  const suggested = state.lastPlay ? bestResponseFor(0, targetCombo, true) : bestLeadFor(0);
  if (suggested && !sameCardSet(suggested.cards, cards) && !isBombLike(combo)) {
    const chosenCost = state.lastPlay
      ? responseCost({ cards, combo }, 0, targetCombo)
      : leadScore({ cards, combo }, 0);
    const suggestedCost = state.lastPlay
      ? responseCost(suggested, 0, targetCombo)
      : leadScore(suggested, 0);
    if (chosenCost - suggestedCost >= 520) {
      return {
        key,
        message: `????????????????? ${suggested.combo.name}?${suggested.cards.map(cardText).join(" ")}?????????????????`,
      };
    }
  }

  return null;
}

function buildPassAdvice(response) {
  if (!response || !state.lastPlay || sameTeam(0, state.lastPlay.player)) return null;
  const key = `pass:${state.moveNo}:${state.lastPlay.moveNo}`;
  const targetPlayer = state.players[state.lastPlay.player];
  if (playerDanger(state.lastPlay.player)) {
    return {
      key,
      message: `${targetPlayer.name} ?? ${targetPlayer.hand.length} ?????? ${response.combo.name} ???????????????????????`,
    };
  }
  const cost = responseCost(response, 0, state.lastPlay.combo);
  if (!isBombLike(response.combo) && cost <= CHEAP_RESPONSE_LIMIT) {
    return {
      key,
      message: `?????????${response.combo.name}?${response.cards.map(cardText).join(" ")}????????????????????????`,
    };
  }
  return null;
}

function sameCardSet(a, b) {
  if (a.length !== b.length) return false;
  const left = a.map((card) => card.id).sort().join("|");
  const right = b.map((card) => card.id).sort().join("|");
  return left === right;
}

function shouldPauseForAdvice(advice) {
  if (!advice) return false;
  return state.pendingAdviceKey !== advice.key;
}

function showAdvice(advice) {
  state.pendingAdviceKey = advice.key;
  state.coachTip = advice.message;
  state.message = `${advice.message} ???????`;
}

function clearAdvice() {
  state.coachTip = "";
  state.pendingAdviceKey = "";
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
  state.message = `${player.name} ?? ${combo.name}`;
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
  player.lastAction = "??";
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
  state.message = `${player.name} ??`;

  if (state.passesSincePlay >= Math.max(1, activePlayers().length - 1)) {
    const starter = state.lastPlay?.player;
    state.lastPlay = null;
    state.passesSincePlay = 0;
    const leadPlayer = state.players[starter]?.finished ? activePartnerOf(starter) ?? nextActiveAfter(starter) : starter;
    state.current = leadPlayer ?? nextActiveAfter(playerId);
    state.message = `${state.players[state.current].name} ?????`;
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
  state.message = `?????${state.roundResult.name}???? ${state.nextRoundLevel}`;
  if (state.multiplayer) {
    renderMultiplayerResult();
    syncMultiplayerState();
  } else {
    renderReview();
  }
}

function renderMultiplayerResult() {
  const rankItems = state.finishedOrder
    .map((playerId, index) => `<li>${finishName(index + 1)}?${state.players[playerId].name}</li>`)
    .join("");
  els.reviewContent.innerHTML = `
    <div class="review-kpi">
      <span class="status-chip">${state.roundResult.name}</span>
      <span class="status-chip">??? ${state.levelRank}</span>
      <span class="status-chip">??? ${state.nextRoundLevel}</span>
    </div>
    <h3>??</h3>
    <ol>${rankItems}</ol>
  `;
  els.reviewPanel.hidden = false;
}

function computeRoundResult() {
  const firstPlayerId = state.finishedOrder[0];
  const winnerTeam = state.players[firstPlayerId].team;
  const partnerPlace = state.finishedOrder.findIndex((playerId, index) => index > 0 && state.players[playerId].team === winnerTeam) + 1;
  const advance = partnerPlace === 2 ? 3 : partnerPlace === 3 ? 2 : 1;
  const name = partnerPlace === 2 ? "??" : partnerPlace === 3 ? "???" : "???";
  return {
    winnerTeam,
    partnerPlace,
    advance,
    name,
    order: [...state.finishedOrder],
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
  if (state.multiplayer) return;
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
  renderCoachTip();
  renderButtons();
  renderMemory();
  renderLog();
}

function renderHeader() {
  const currentName = state.current === null ? "?" : state.players[state.current].name;
  els.roundStatus.textContent = screenMode === "home"
    ? "???????????"
    : screenMode === "multiLobby"
      ? `???? ${multiplayerRoom?.code || ""} ? ????`
      : `${state.message} ? ??? ? ???? ${state.levelRank} ? ???? ${currentName}`;
  els.roundBadge.textContent = `? ${match.roundNo} ?`;
  els.levelBadge.textContent = `? ${state.levelRank}`;
  const teamText = `?? ${match.teamLevels[0]} ? ?? ${match.teamLevels[1]}`;
  els.scoreBadge.textContent = state.roundResult
    ? `${state.roundResult.name}?? ${state.roundResult.advance} ?`
    : teamText;
  els.newGameBtn.textContent = state.over && state.nextRoundLevel ? `??????? ${state.nextRoundLevel}` : "????";
  els.noviceModeBtn.classList.toggle("active", state.mode === "novice");
  els.advancedModeBtn.classList.toggle("active", state.mode === "advanced");
  els.noviceModeBtn.setAttribute("aria-pressed", state.mode === "novice" ? "true" : "false");
  els.advancedModeBtn.setAttribute("aria-pressed", state.mode === "advanced" ? "true" : "false");
  els.noviceModeBtn.closest(".mode-toggle").hidden = screenMode !== "single";
  els.roundBadge.closest(".match-strip").hidden = screenMode !== "single";
  els.newGameBtn.hidden = screenMode !== "single";
  els.backHomeBtn.hidden = screenMode === "home";
}

function renderSeats() {
  const playerId = localPlayerId();
  renderSeat(els.playerNorth, state.players[2], playerId === 2);
  renderSeat(els.playerWest, state.players[1], playerId === 1);
  renderSeat(els.playerEast, state.players[3], playerId === 3);
  renderSeat(els.playerSouth, state.players[0], playerId === 0);
}

function renderSeat(container, player, isUser = false) {
  container.classList.toggle("current", state.current === player.id);
  container.classList.toggle("self", isUser);
  const teamText = player.team === 0 ? "??" : "??";
  const finish = player.finished ? finishName(state.finishedOrder.indexOf(player.id) + 1) : `${player.hand.length} ?`;
  const stack = isUser ? "" : renderBackStack(Math.min(9, Math.ceil(player.hand.length / 3)));
  const lastCards = state.lastPlay?.player === player.id ? renderCards(state.lastPlay.cards, true, true) : "";
  const avatar = player.avatarId ? avatarById(player.avatarId) : null;
  const avatarHtml = avatar
    ? `<span class="seat-avatar avatar-portrait ${avatar.tone}"><span class="avatar-hair"></span><span class="avatar-face">${avatar.mark}</span></span>`
    : "";
  container.innerHTML = `
    <div class="seat-head">
      <span class="seat-title">${avatarHtml}<span class="seat-name">${player.name}</span></span>
      <span class="seat-meta">${teamText} ? ${finish}</span>
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
    els.centerPile.innerHTML = `<div class="empty-state">????</div>`;
    return;
  }
  const player = state.players[state.lastPlay.player];
  els.centerPile.innerHTML = `
    <div>
      <div class="pile-title">${player.name} ? ${state.lastPlay.combo.name}</div>
      <div class="pile-cards">${renderCards(state.lastPlay.cards, true, false)}</div>
    </div>
  `;
}

function renderHand() {
  const playerId = localPlayerId();
  els.hand.innerHTML = state.players[playerId].hand
    .map((card) => renderCard(card, true, false, state.selected.has(card.id), true))
    .join("");
  els.hand.querySelectorAll(".card").forEach((button) => {
    button.addEventListener("click", () => toggleSelect(button.dataset.cardId));
  });

  const selectedCards = state.players[playerId].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  if (!selectedCards.length) {
    els.selectionInfo.textContent = "?????";
  } else if (combo) {
    els.selectionInfo.textContent = `${selectedCards.length} ? ? ${combo.name}`;
  } else {
    els.selectionInfo.textContent = `${selectedCards.length} ? ? ?????`;
  }
}

function renderCoachTip() {
  if (state.mode !== "novice" || state.multiplayer || !state.coachTip) {
    els.coachTip.hidden = true;
    els.coachTip.textContent = "";
    return;
  }
  els.coachTip.hidden = false;
  els.coachTip.textContent = state.coachTip;
}

function toggleSelect(cardId) {
  if (state.current !== localPlayerId() || state.over) return;
  clearAdvice();
  if (state.selected.has(cardId)) {
    state.selected.delete(cardId);
  } else {
    state.selected.add(cardId);
  }
  render();
}

function renderButtons() {
  const playerId = localPlayerId();
  const userTurn = state.current === playerId && !state.over;
  const selectedCards = state.players[playerId].hand.filter((card) => state.selected.has(card.id));
  const combo = chooseComboForContext(selectedCards, state.lastPlay?.combo || null);
  els.playBtn.disabled = !userTurn || !combo;
  els.passBtn.disabled = !userTurn || !state.lastPlay;
  els.hintBtn.disabled = !userTurn;
  els.hintBtn.hidden = Boolean(state.multiplayer);
}

function renderMemory() {
  const played = countBy(
    state.history
      .filter((entry) => entry.action === "play")
      .flatMap((entry) => entry.cards.map((card) => card.rank))
  );
  const own = countBy(state.players[localPlayerId()].hand.map((card) => card.rank));
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
  const tributeEntries = (state.tributeRecords || []).map(renderTributeRecord);
  const entries = [...state.history];
  const playEntries = entries
    .map((entry) => {
      const player = state.players[entry.playerId];
      if (entry.action === "pass") {
        const target = entry.targetCombo ? `??? ${entry.targetCombo.name}` : "";
        return `<li><span class="log-no">? ${entry.moveNo} ?</span> <strong>${player.name}</strong> ??${target}</li>`;
      }
      return `<li><span class="log-no">? ${entry.moveNo} ?</span> <strong>${player.name}</strong> ${entry.combo.name}?${entry.cards.map(cardText).join(" ")}</li>`;
    })
    .join("");
  els.moveLog.innerHTML = [...tributeEntries, playEntries].join("");
}

function renderTributeRecord(record) {
  if (record.type === "anti") {
    return `<li class="tribute-log"><span class="log-no">??</span> ${escapeHtml(record.text)}</li>`;
  }
  const payer = state.players[record.payerId];
  const receiver = state.players[record.receiverId];
  const returnText = record.returnCard ? `?${receiver.name} ? ${cardText(record.returnCard)}` : "";
  return `<li class="tribute-log"><span class="log-no">??</span> <strong>${payer.name}</strong> ? ${cardText(record.tributeCard)} ? <strong>${receiver.name}</strong>${returnText}</li>`;
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
  const colorClass = isJokerRank(card.rank) ? "joker" : state.mode === "novice" ? `four-${card.suit}` : card.color;
  const rankLabel = isJokerRank(card.rank) ? (card.rank === "SJ" ? "??" : "??") : card.rank;
  const suitLabel = isJokerRank(card.rank) ? "JOKER" : card.suitSymbol;
  const wildBadge = isWild(card) ? '<span class="wild-badge">?</span>' : "";
  return `
    <${tag} ${type} ${data} class="card ${small ? "small" : ""} ${colorClass} ${wildClass} ${selectedClass}">
      <span class="rank">${rankLabel}</span>
      <span class="suit">${suitLabel}</span>
      <span class="rank">${rankLabel}</span>
      ${wildBadge}
    </${tag}>
  `;
}

function cardText(card) {
  if (card.rank === "SJ") return "??";
  if (card.rank === "BJ") return "??";
  return `${card.rank}${card.suitSymbol}`;
}

function rankName(rank) {
  if (rank === "SJ") return "??";
  if (rank === "BJ") return "??";
  return rank;
}

function finishName(position) {
  return ["??", "??", "??", "??"][position - 1] || `?${position}?`;
}

function renderReview() {
  const rankItems = state.finishedOrder
    .map((playerId, index) => `<li>${finishName(index + 1)}?${state.players[playerId].name}</li>`)
    .join("");
  const diagnostics = buildDiagnostics();
  const signals = buildSignalReview();
  const kingReads = buildKingReadReview();
  const typeSignals = buildTypeSignalReview();
  const diagnosticsHtml = diagnostics.length
    ? `<h3>????</h3><ul class="diagnostic-list">${diagnostics.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const signalsHtml = signals.length
    ? `<h3>??????</h3><ul class="signal-list">${signals.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const kingReadsHtml = kingReads.length
    ? `<h3>????</h3><ul class="signal-list">${kingReads.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const typeSignalsHtml = typeSignals.length
    ? `<h3>????</h3><ul class="signal-list">${typeSignals.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const moveSummary = state.history
    .filter((entry) => entry.playerId === 0 && entry.action === "play")
    .reverse()
    .map((entry) => `<li>? ${entry.moveNo} ??${entry.combo.name}?${entry.cards.map(cardText).join(" ")}</li>`)
    .join("");
  els.reviewContent.innerHTML = `
    <div class="review-kpi">
      <span class="status-chip">${state.roundResult.name}</span>
      <span class="status-chip">??? ${state.levelRank}</span>
      <span class="status-chip">??? ${state.nextRoundLevel}</span>
    </div>
    <h3>??</h3>
    <ol>${rankItems}</ol>
    ${diagnosticsHtml}
    ${signalsHtml}
    ${kingReadsHtml}
    ${typeSignalsHtml}
    <h3>?????</h3>
    <ol>${moveSummary || "<li>??????????</li>"}</ol>
    <div class="review-actions">
      <button id="nextRoundBtn" class="primary-btn" type="button">??????? ${state.nextRoundLevel}</button>
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
  const rank = state.finishedOrder.indexOf(0) + 1;
  const diagnostics = [];

  if (rank > 2) {
    diagnostics.push("<strong>?????</strong>???????????????? 5 ??????????????");
  }

  if (missedBlocks.length) {
    const sample = missedBlocks[0];
    diagnostics.push(`<strong>? ${sample.moveNo} ???????</strong>${sample.targetOwnerName} ? ${sample.target.name}?${sample.targetText}???? ${sample.targetRemaining} ???????? ${sample.couldBeat.name} ?????????????????????????????????????????`);
  } else if (passWithAnswer.length) {
    const sample = passWithAnswer[0];
    diagnostics.push(`<strong>? ${sample.moveNo} ??????</strong>${sample.targetOwnerName} ? ${sample.target.name}?${sample.targetText}?????? ${sample.couldBeat.name} ???????????????????????????????????????????????????????????`);
  }

  if (partnerOvertakes.length) {
    const sample = partnerOvertakes[0];
    diagnostics.push(`<strong>? ${sample.moveNo} ??????</strong>???? ${sample.targetComboName}?${sample.targetText}????? ${sample.combo.name}?${sample.cardsText}???????????????????????????????????????????????`);
  }

  if (soloFirst.length) {
    const sample = soloFirst[0];
    diagnostics.push(`<strong>? ${sample.moveNo} ??????</strong>?????? ${sample.partnerRemainingBefore} ????? ${sample.combo.name}?${sample.cardsText}????????????????????????????????????????????????????`);
  }

  if (riskyBombs.length) {
    const sample = riskyBombs[0];
    diagnostics.push(`<strong>? ${sample.moveNo} ??????</strong>?? ${sample.combo.name}?${sample.cardsText}??????????????????????????????????????????????????????????????`);
  }

  if (splitGroups.length) {
    const sample = splitGroups[0];
    const ranks = [...new Set(splitGroups.flatMap((note) => note.brokeRanks))].join("?");
    diagnostics.push(`<strong>? ${sample.moveNo} ???????</strong>??????${sample.cardsText}????? ${ranks} ?????????????????????????????????????????????????????`);
  }

  const memoryTip = memoryInsight();
  if (memoryTip) diagnostics.push(`<strong>???</strong>${memoryTip}`);
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
    signals.push(`<strong>????????</strong>???? ${sample.moveNo} ???????? ${partnerPassSummary}?????????????????????????????????????????`);
  }

  if (partnerPlays.length) {
    const sample = partnerPlays[0];
    signals.push(`<strong>????????</strong>??? ${sample.moveNo} ?????? ${summarizePlayTypes(partnerPlays)}??????????????????????????????????????????????????`);
  }

  if (rightPassSummary) {
    const sample = rightPasses[0];
    signals.push(`<strong>?????????????</strong>???? ${sample.moveNo} ???????? ${rightPassSummary}????????????????????????????????????????`);
  }

  if (leftPassSummary) {
    const sample = leftPasses[0];
    signals.push(`<strong>?????????????</strong>???? ${sample.moveNo} ???????? ${leftPassSummary}?????????????????????????????????????????????`);
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
      reads.push(`<strong>? ${play.moveNo} ??????</strong>${opponentPasses.map((entry) => state.players[entry.playerId].name).join("?")}?????????????????????????????????????????????????????????????????????????????????????????????????????????????????`);
    } else if (play.cards[0].rank === "SJ" && opponentBeat) {
      reads.push(`<strong>? ${play.moveNo} ??????</strong>${state.players[opponentBeat.playerId].name}? ${opponentBeat.cards.map(cardText).join(" ")} ??????????????????????????????????`);
    } else if (play.cards[0].rank === "BJ") {
      reads.push(`<strong>? ${play.moveNo} ??????</strong>?????????????????????????????????????????????????????`);
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
    single: "<strong>???</strong>??????????????????????????????????????????????????????????? 2 ???",
    pair: "<strong>???</strong>????????????????????????????????????????????????????????????????",
    straight: "<strong>???</strong>???????? 5 ?????????????????????????????????????????????",
    doubleSeq: "<strong>??/????</strong>??????????????AA2233 ????????????????????????????????????????",
    fullHouse: "<strong>????</strong>???????????????????????????????????????????????????????????",
    steel: "<strong>???</strong>????????????????????????????????????????????????????????",
    tripleSeq: "<strong>???</strong>?????????????????????????????????????????????????????",
    triple: "<strong>???</strong>??????????????????????????????????????????????????????",
    bomb: "<strong>???</strong>???????????????????????????????????????",
    straightFlush: "<strong>????</strong>?????????????????????????????",
    jokerBomb: "<strong>????</strong>??????????????????????????????????",
  };
  return relevantTypes.map((type) => explanations[type]).filter(Boolean);
}

function summarizePassTypes(entries) {
  const counts = countBy(entries.map((entry) => entry.targetCombo.name));
  return Object.entries(counts)
    .filter((entry) => entry[1] >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} ${count} ?`)
    .join("?");
}

function summarizePlayTypes(entries) {
  const counts = countBy(entries.map((entry) => entry.combo.name));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name} ${count} ?`)
    .join("?");
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
  return `???? ${unseen.map(([rank, count]) => `${count} ? ${rankName(rank)}`).join("?")} ?????????????????????????`;
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

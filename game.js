/* Little Party RPG
 * Plain JavaScript prototype. Game rules, UI rendering, and canvas drawing
 * are intentionally kept in one readable file so the project is easy to edit.
 */

"use strict";

const CONFIG = {
  tickMs: 650,
  attackEveryTicks: 2,
  enemyAttackEveryTicks: 2,
  maxLevel: 100,
  maxRolls: 4,
  maxInventory: 80
};

const CLASS_DEFS = [
  { id: "cleric", name: "Cleric", role: "Healer", color: "#9ed9bd", mark: "C", weapon: "Staff", backline: true },
  { id: "mage", name: "Mage", role: "Spell damage", color: "#b5a2f4", mark: "M", weapon: "Wand", backline: false },
  { id: "archer", name: "Archer", role: "Physical damage", color: "#f0c878", mark: "A", weapon: "Bow", backline: false },
  { id: "knight", name: "Knight", role: "Front line", color: "#8cbaf2", mark: "K", weapon: "Sword", backline: false }
];

const ENEMY_DEFS = [
  { id: "slime", name: "Green Slime", level: 1, hp: 18, damage: 2, xp: 1, gold: 1, color: "#73cba0" },
  { id: "mushroom", name: "Mushroom", level: 3, hp: 29, damage: 3, xp: 2, gold: 2, color: "#e5a66b" },
  { id: "hornet", name: "Hornet", level: 6, hp: 45, damage: 4, xp: 3, gold: 3, color: "#e3cf70" },
  { id: "stone_golem", name: "Stone Golem", level: 10, hp: 78, damage: 6, xp: 5, gold: 5, color: "#9aa7b8" },
  { id: "wolf", name: "Forest Wolf", level: 15, hp: 112, damage: 8, xp: 7, gold: 7, color: "#c28b8b" },
  { id: "wisp", name: "Blue Wisp", level: 22, hp: 160, damage: 11, xp: 10, gold: 10, color: "#82c8ec" },
  { id: "ogre", name: "Ogre", level: 30, hp: 230, damage: 15, xp: 14, gold: 14, color: "#b5a0a0" },
  { id: "drake", name: "Young Drake", level: 42, hp: 330, damage: 20, xp: 19, gold: 19, color: "#df8e71" },
  { id: "gargoyle", name: "Gargoyle", level: 56, hp: 460, damage: 26, xp: 25, gold: 25, color: "#a9a3c8" },
  { id: "dragon", name: "Small Dragon", level: 72, hp: 630, damage: 34, xp: 33, gold: 33, color: "#df7777" },
  { id: "guardian", name: "Ancient Guardian", level: 90, hp: 850, damage: 43, xp: 43, gold: 43, color: "#d5c18c" }
];

const SLOT_DEFS = [
  { id: "weapon", label: "Weapon", types: ["Staff", "Wand", "Bow", "Sword", "2H Sword"] },
  { id: "shield", label: "Shield", types: ["Shield"] },
  { id: "helm", label: "Helm", types: ["Light Helm", "Medium Helm", "Heavy Helm"] },
  { id: "body", label: "Body", types: ["Light Body", "Medium Body", "Heavy Body"] },
  { id: "gloves", label: "Gloves", types: ["Light Gloves", "Medium Gloves", "Heavy Gloves"] },
  { id: "pants", label: "Pants", types: ["Light Pants", "Medium Pants", "Heavy Pants"] },
  { id: "ring1", label: "Ring 1", types: ["Ring"] },
  { id: "ring2", label: "Ring 2", types: ["Ring"] },
  { id: "necklace", label: "Necklace", types: ["Necklace"] }
];

const ROLL_DEFS = [
  { id: "physDamage", name: "Physical damage", kind: "flat", min: 1, max: 2, weight: 12, group: "weapon" },
  { id: "spellDamage", name: "Spell damage", kind: "flat", min: 1, max: 2, weight: 12, group: "weapon" },
  { id: "critRate", name: "Critical chance", kind: "percent", min: 1, max: 3, weight: 7, group: "weapon" },
  { id: "critDamage", name: "Critical damage", kind: "percent", min: 2, max: 5, weight: 7, group: "weapon" },
  { id: "healing", name: "Healing", kind: "flat", min: 1, max: 2, weight: 7, group: "weapon" },
  { id: "hp", name: "HP", kind: "flat", min: 2, max: 5, weight: 12, group: "armor" },
  { id: "evasion", name: "Evasion", kind: "flat", min: 1, max: 2, weight: 10, group: "armor" },
  { id: "armor", name: "Armor", kind: "flat", min: 1, max: 2, weight: 10, group: "armor" },
  { id: "hpPct", name: "HP", kind: "globalPercent", min: 1, max: 3, weight: 2, group: "percent" },
  { id: "evasionPct", name: "Evasion", kind: "globalPercent", min: 1, max: 3, weight: 2, group: "percent" },
  { id: "armorPct", name: "Armor", kind: "globalPercent", min: 1, max: 3, weight: 2, group: "percent" }
];

const $ = (id) => document.getElementById(id);

const state = {
  gold: 0,
  kills: 0,
  fightNumber: 1,
  selectedEnemyId: "slime",
  selectedCharacterId: "cleric",
  paused: false,
  tick: 0,
  fightTicks: 0,
  fightStartedAt: Date.now(),
  enemyHp: 18,
  enemyMaxHp: 18,
  enemyAttackTimer: 0,
  partyAttackTimer: 0,
  logLines: [],
  fightDamage: 0,
  fightHealing: 0,
  fightTaken: 0,
  fightMisses: 0,
  totalDamage: 0,
  totalHealing: 0,
  inventory: [],
  characters: []
};

function makeCharacter(def) {
  const character = {
    ...def,
    level: 1,
    xp: 0,
    hp: 20,
    maxHp: 20,
    alive: true,
    gear: {},
    fightDamage: 0,
    totalDamage: 0,
    totalHealing: 0
  };
  for (const slot of SLOT_DEFS) character.gear[slot.id] = null;
  return character;
}

state.characters = CLASS_DEFS.map(makeCharacter);

function makeItem(type, level = 1, guaranteedBase = true) {
  const item = {
    id: `item-${Math.random().toString(36).slice(2, 10)}`,
    type,
    level: Math.max(1, level),
    base: {},
    rolls: []
  };
  const tier = Math.max(1, Math.floor(item.level / 10) + 1);

  if (["Light Helm", "Light Body", "Light Gloves", "Light Pants"].includes(type)) item.base.hp = 1 + Math.floor(tier / 2);
  if (["Medium Helm", "Medium Body", "Medium Gloves", "Medium Pants"].includes(type)) item.base.evasion = 1 + Math.floor(tier / 3);
  if (["Heavy Helm", "Heavy Body", "Heavy Gloves", "Heavy Pants"].includes(type)) item.base.armor = 1 + Math.floor(tier / 3);
  if (type === "Staff") { item.base.healing = 2 + Math.floor(tier / 2); }
  if (type === "Wand") { item.base.spellDamage = 2 + Math.floor(tier / 2); }
  if (type === "Bow") { item.base.physDamage = 2 + Math.floor(tier / 2); item.base.critRate = 2; }
  if (type === "Sword") item.base.physDamage = 2 + Math.floor(tier / 2);
  if (type === "2H Sword") item.base.physDamage = 4 + tier;
  if (type === "Shield") item.base.hp = 2 + tier;
  if (type === "Ring" || type === "Necklace") item.base.hp = 1;
  if (!guaranteedBase) item.base = {};

  const rollCount = Math.floor(Math.random() * (Math.min(CONFIG.maxRolls, 1 + Math.floor(item.level / 8)) + 1));
  const available = ROLL_DEFS.filter(roll => roll.kind !== "globalPercent" || Math.random() < 0.08);
  for (let i = 0; i < rollCount; i++) {
    const roll = weightedPick(available);
    if (!roll) break;
    const rangeBoost = Math.floor((item.level - 1) / 15);
    const max = roll.max + Math.floor(rangeBoost / 2);
    const value = randomInt(roll.min, Math.max(roll.min, max));
    item.rolls.push({ stat: roll.id, name: roll.name, value, kind: roll.kind });
  }
  return item;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getEnemy() {
  return ENEMY_DEFS.find(enemy => enemy.id === state.selectedEnemyId) || ENEMY_DEFS[0];
}

function characterLevelForXp(xp) {
  let level = 1;
  let remaining = xp;
  while (level < CONFIG.maxLevel) {
    const needed = xpForNextLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  return level;
}

function xpForNextLevel(level) {
  return 5 + level * 3;
}

function xpToReachNextLevel(character) {
  let total = 0;
  for (let level = 1; level < character.level; level++) total += xpForNextLevel(level);
  return total;
}

function xpIntoCurrentLevel(character) {
  return character.xp - xpToReachNextLevel(character);
}

function statTotals(character) {
  const totals = {
    hp: 20 + character.level * 2,
    armor: 0,
    evasion: 0,
    physDamage: 1 + Math.floor(character.level / 8),
    spellDamage: 1 + Math.floor(character.level / 8),
    healing: character.id === "cleric" ? 2 + Math.floor(character.level / 8) : 0,
    critRate: 0,
    critDamage: 150,
    hpPct: 0,
    armorPct: 0,
    evasionPct: 0
  };

  for (const item of Object.values(character.gear)) {
    if (!item) continue;
    for (const [key, value] of Object.entries(item.base)) {
      if (key in totals) totals[key] += value;
    }
    for (const roll of item.rolls) {
      if (roll.stat in totals) {
        if (roll.kind === "percent" && roll.stat === "critDamage") totals[roll.stat] += roll.value;
        else totals[roll.stat] += roll.value;
      }
    }
  }

  totals.hp = Math.round(totals.hp * (1 + totals.hpPct / 100));
  totals.armor = Math.round(totals.armor * (1 + totals.armorPct / 100));
  totals.evasion = Math.min(40, totals.evasion + totals.evasionPct);
  totals.critRate = Math.min(60, totals.critRate);
  totals.critDamage = Math.max(150, totals.critDamage);
  return totals;
}

function slotForItem(item) {
  if (["Staff", "Wand", "Bow", "Sword", "2H Sword"].includes(item.type)) return "weapon";
  if (item.type === "Shield") return "shield";
  if (item.type === "Ring") return "ring1";
  if (item.type === "Necklace") return "necklace";
  if (item.type.endsWith(" Helm")) return "helm";
  if (item.type.endsWith(" Body")) return "body";
  if (item.type.endsWith(" Gloves")) return "gloves";
  if (item.type.endsWith(" Pants")) return "pants";
  return null;
}

function compatibleSlots(item) {
  if (item.type === "Ring") return ["ring1", "ring2"];
  return [slotForItem(item)].filter(Boolean);
}

function itemScore(item) {
  return Object.values(item.base).reduce((sum, value) => sum + value, 0)
    + item.rolls.reduce((sum, roll) => sum + roll.value * (roll.kind === "globalPercent" ? 1.4 : 1), 0);
}

function equippedScore(character, slot) {
  const item = character.gear[slot];
  return item ? itemScore(item) : -1;
}

function equipItem(itemId, characterId, preferredSlot = null) {
  const item = state.inventory.find(candidate => candidate.id === itemId);
  const character = state.characters.find(candidate => candidate.id === characterId);
  if (!item || !character) return;
  const slots = compatibleSlots(item);
  const slot = preferredSlot && slots.includes(preferredSlot)
    ? preferredSlot
    : slots.find(candidate => !character.gear[candidate]) || slots[0];
  if (!slot) return;

  const previous = character.gear[slot];
  character.gear[slot] = item;
  state.inventory = state.inventory.filter(candidate => candidate.id !== item.id);
  if (previous) state.inventory.unshift(previous);
  state.inventory = state.inventory.slice(0, CONFIG.maxInventory);
  recalculateParty();
  addLog(`${character.name} equipped ${itemName(item)} in ${SLOT_DEFS.find(def => def.id === slot).label}.`, "system");
  renderAll();
}

function unequipItem(characterId, slot) {
  const character = state.characters.find(candidate => candidate.id === characterId);
  if (!character || !character.gear[slot]) return;
  state.inventory.unshift(character.gear[slot]);
  character.gear[slot] = null;
  state.inventory = state.inventory.slice(0, CONFIG.maxInventory);
  recalculateParty();
  renderAll();
}

function recalculateParty() {
  for (const character of state.characters) {
    const oldMax = character.maxHp;
    const stats = statTotals(character);
    character.maxHp = stats.hp;
    if (character.hp > character.maxHp || oldMax !== character.maxHp) {
      character.hp = Math.min(character.maxHp, character.hp + Math.max(0, character.maxHp - oldMax));
    }
  }
}

function itemName(item) {
  const base = item.type;
  if (!item.rolls.length) return `${base} · Lv.${item.level}`;
  const prefix = item.rolls.length >= 3 ? "Well-rolled " : "";
  return `${prefix}${base} · Lv.${item.level}`;
}

function formatStat(stat, value, kind = "flat") {
  const names = {
    hp: "HP", hpPct: "HP", armor: "Armor", armorPct: "Armor", evasion: "Evasion", evasionPct: "Evasion",
    physDamage: "Physical damage", spellDamage: "Spell damage", healing: "Healing",
    critRate: "Crit chance", critDamage: "Crit damage"
  };
  if (stat === "critDamage") return `${names[stat]} +${value}%`;
  if (kind === "globalPercent" || kind === "percent" || stat.endsWith("Pct")) return `${names[stat] || stat} +${value}%`;
  return `${names[stat] || stat} +${value}`;
}

function itemStatLines(item) {
  const lines = [];
  for (const [stat, value] of Object.entries(item.base)) lines.push(formatStat(stat, value));
  for (const roll of item.rolls) lines.push(formatStat(roll.stat, roll.value, roll.kind));
  return lines.length ? lines.join("\n") : "No stats";
}

function itemCanRollForType(type, roll) {
  // The prototype intentionally allows any stat roll on any item.
  return true;
}

function addLog(message, kind = "") {
  const stamp = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
  state.logLines.push({ stamp, message, kind });
  if (state.logLines.length > 240) state.logLines.shift();
  const log = $("combatLog");
  if (!log) return;
  const line = document.createElement("div");
  line.className = `log-line ${kind}`;
  line.innerHTML = `<span class="time">${stamp}</span>${escapeHtml(message)}`;
  log.appendChild(line);
  if ($("autoScroll").checked) log.scrollTop = log.scrollHeight;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function resetFight(logStart = true) {
  const enemy = getEnemy();
  state.enemyMaxHp = enemy.hp + Math.max(0, enemy.level - 1) * 1.4;
  state.enemyHp = state.enemyMaxHp;
  state.enemyAttackTimer = 0;
  state.partyAttackTimer = 0;
  state.fightTicks = 0;
  state.fightStartedAt = Date.now();
  state.fightDamage = 0;
  state.fightHealing = 0;
  state.fightTaken = 0;
  state.fightMisses = 0;
  for (const character of state.characters) {
    character.hp = statTotals(character).hp;
    character.maxHp = character.hp;
    character.alive = true;
    character.fightDamage = 0;
  }
  if (logStart) addLog(`Fight ${state.fightNumber}: the party engages ${enemy.name} (Lv. ${enemy.level}).`, "system");
  updateBattleSummary();
  renderParty();
  drawArena();
}

function chooseEnemy(enemyId) {
  state.selectedEnemyId = enemyId;
  const enemy = getEnemy();
  $("enemyTitle").textContent = `${enemy.name} · Lv. ${enemy.level}`;
  renderEnemies();
  resetFight();
}

function addExperience(amount) {
  for (const character of state.characters) {
    if (character.level >= CONFIG.maxLevel) continue;
    const before = character.level;
    character.xp += amount;
    character.level = characterLevelForXp(character.xp);
    if (character.level > before) {
      addLog(`${character.name} reached level ${character.level}!`, "system");
    }
  }
}

function randomDrop(enemy) {
  const roll = Math.random();
  let type;
  if (roll < 0.28) type = "Ring";
  else if (roll < 0.40) type = "Necklace";
  else if (roll < 0.53) type = "Shield";
  else if (roll < 0.70) type = ["Staff", "Wand", "Bow", "Sword", "2H Sword"][randomInt(0, 4)];
  else {
    const weight = Math.random();
    const armor = weight < 0.34 ? "Light" : weight < 0.67 ? "Medium" : "Heavy";
    const slot = ["Helm", "Body", "Gloves", "Pants"][randomInt(0, 3)];
    type = `${armor} ${slot}`;
  }
  const itemLevel = Math.max(1, enemy.level + randomInt(-2, 2));
  return makeItem(type, itemLevel);
}

function resolveVictory() {
  const enemy = getEnemy();
  state.kills++;
  state.gold += enemy.gold;
  addExperience(enemy.xp);
  addLog(`${enemy.name} defeated! +${enemy.xp} XP and +${enemy.gold} gold.`, "system");

  const dropChance = Math.min(0.85, 0.55 + enemy.level / 250);
  if (Math.random() < dropChance) {
    const item = randomDrop(enemy);
    if (state.inventory.length < CONFIG.maxInventory) {
      state.inventory.unshift(item);
      addLog(`Loot: ${itemName(item)} — ${itemStatLines(item).replace(/\n/g, ", ")}.`, "loot");
    } else {
      addLog("Inventory full. The dropped item was left behind.", "system");
    }
  } else {
    addLog("No equipment dropped this time.", "system");
  }

  $("lastResult").textContent = "Victory";
  state.fightNumber++;
  updateTopStats();
  renderParty();
  renderEquipment();
  renderEnemies();
  updateFightStats();
  resetFight(false);
}

function resolveDefeat() {
  addLog("The party was overwhelmed. Everyone recovers and tries again.", "system");
  $("lastResult").textContent = "Retrying";
  state.fightNumber++;
  updateTopStats();
  resetFight(false);
}

function attackCharacter(character) {
  if (!character.alive || state.enemyHp <= 0) return;
  const stats = statTotals(character);
  let damage = 1;
  if (character.id === "cleric") {
    damage += Math.floor(stats.spellDamage / 2);
  } else if (character.id === "mage") {
    damage += stats.spellDamage;
  } else {
    damage += stats.physDamage;
  }
  let critical = false;
  if (Math.random() * 100 < stats.critRate) {
    damage = Math.max(1, Math.round(damage * stats.critDamage / 100));
    critical = true;
  }
  damage = Math.max(1, damage);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  state.fightDamage += damage;
  state.totalDamage += damage;
  character.fightDamage += damage;
  character.totalDamage += damage;
  addLog(`${character.name} ${critical ? "critically " : ""}hits ${getEnemy().name} for ${damage} damage${critical ? "!" : "."}`);
  if (state.enemyHp <= 0) resolveVictory();
}

function useClericHealing() {
  const cleric = state.characters.find(character => character.id === "cleric");
  if (!cleric || !cleric.alive) return;
  const stats = statTotals(cleric);
  const baseHeal = Math.max(1, stats.healing);
  const targets = state.characters.filter(character => character.alive && character.hp < character.maxHp);
  if (!targets.length) return;
  // Heal the most injured ally first. In this prototype healing is a small support action,
  // and characters are restored to full HP between fights.
  targets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  const target = targets[0];
  const healed = Math.min(baseHeal, target.maxHp - target.hp);
  target.hp += healed;
  state.fightHealing += healed;
  state.totalHealing += healed;
  cleric.totalHealing += healed;
  addLog(`Cleric heals ${target.name} for ${healed} HP.`, "heal");
}

function enemyAttack() {
  if (state.enemyHp <= 0) return;
  // Target from right to left: Knight, Archer, Mage, Cleric.
  const priority = ["knight", "archer", "mage", "cleric"];
  const target = priority.map(id => state.characters.find(character => character.id === id))
    .find(character => character && character.alive && character.hp > 0);
  if (!target) {
    resolveDefeat();
    return;
  }

  const enemy = getEnemy();
  const stats = statTotals(target);
  if (Math.random() * 100 < stats.evasion) {
    state.fightMisses++;
    addLog(`${target.name} evades ${enemy.name}'s attack.`, "system");
    return;
  }
  const raw = enemy.damage + Math.floor(enemy.level / 12);
  const damage = Math.max(1, raw - Math.floor(stats.armor * 0.5));
  target.hp = Math.max(0, target.hp - damage);
  state.fightTaken += damage;
  addLog(`${enemy.name} hits ${target.name} for ${damage} damage.`, "damage");
  if (target.hp <= 0) {
    target.alive = false;
    addLog(`${target.name} falls! The enemy will target the next character.`, "damage");
  }
  if (state.characters.every(character => !character.alive)) resolveDefeat();
}

function gameTick() {
  if (state.paused) return;
  const fightAtTickStart = state.fightNumber;
  state.tick++;
  state.fightTicks++;
  state.partyAttackTimer++;
  state.enemyAttackTimer++;

  if (state.partyAttackTimer >= CONFIG.attackEveryTicks) {
    state.partyAttackTimer = 0;
    // Cleric alternates between a small heal and an attack if healing is needed.
    const cleric = state.characters.find(character => character.id === "cleric");
    if (cleric && cleric.alive && state.characters.some(c => c.alive && c.hp < c.maxHp)) useClericHealing();
    else if (cleric && cleric.alive) attackCharacter(cleric);

    for (const character of state.characters) {
      if (character.id !== "cleric") attackCharacter(character);
      if (state.enemyHp <= 0 || state.fightNumber !== fightAtTickStart) break;
    }
  }

  if (state.fightNumber === fightAtTickStart && state.enemyHp > 0 && state.enemyAttackTimer >= CONFIG.enemyAttackEveryTicks) {
    state.enemyAttackTimer = 0;
    enemyAttack();
  }

  renderParty();
  drawArena();
  updateBattleSummary();
  updateFightStats();
}

function updateTopStats() {
  $("goldValue").textContent = state.gold;
  $("killCount").textContent = state.kills;
  $("partyLevel").textContent = Math.min(...state.characters.map(character => character.level));
}

function updateBattleSummary() {
  $("fightNumber").textContent = state.fightNumber;
  $("fightDuration").textContent = `${(state.fightTicks * CONFIG.tickMs / 1000).toFixed(1)}s`;
  $("nextReward").textContent = `XP +${getEnemy().xp} · Gold +${getEnemy().gold}`;
}

function updateFightStats() {
  $("fightStats").innerHTML = `
    <div class="stat-chip"><span>Party damage this fight</span><strong>${state.fightDamage}</strong></div>
    <div class="stat-chip"><span>Healing this fight</span><strong>${state.fightHealing}</strong></div>
    <div class="stat-chip"><span>Damage taken</span><strong>${state.fightTaken}</strong></div>
    <div class="stat-chip"><span>Attacks evaded</span><strong>${state.fightMisses}</strong></div>`;
}

function renderEnemies() {
  const host = $("enemyChoices");
  host.innerHTML = "";
  for (const enemy of ENEMY_DEFS) {
    const button = document.createElement("button");
    button.className = `enemy-choice ${enemy.id === state.selectedEnemyId ? "selected" : ""}`;
    button.innerHTML = `<span><span class="enemy-name">${enemy.name}</span><span class="enemy-info">${enemy.hp} HP · ${enemy.damage} damage · ${enemy.xp} XP</span></span><span class="level-pill">Lv. ${enemy.level}</span>`;
    button.addEventListener("click", () => chooseEnemy(enemy.id));
    host.appendChild(button);
  }
}

function renderParty() {
  const host = $("partyCards");
  host.innerHTML = "";
  for (const character of state.characters) {
    const stats = statTotals(character);
    const pct = Math.max(0, Math.min(100, character.hp / Math.max(1, character.maxHp) * 100));
    const card = document.createElement("button");
    card.type = "button";
    card.className = `party-card ${character.id === state.selectedCharacterId ? "selected" : ""}`;
    card.style.textAlign = "left";
    card.style.color = "var(--text)";
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div class="party-card-head">
        <div class="portrait" style="background:${character.color}">${character.mark}</div>
        <div><h3>${character.name}</h3><div class="subline">${character.role} · Lv. ${character.level}</div></div>
      </div>
      <div class="health-line"><span>${character.alive ? "HP" : "Down"}</span><span>${character.hp}/${character.maxHp}</span></div>
      <div class="health-track"><div class="health-fill ${pct < 30 ? "low" : ""}" style="width:${pct}%"></div></div>
      <div class="mini-stats">
        <div class="mini-stat"><span>Damage</span><strong>${character.fightDamage}</strong></div>
        <div class="mini-stat"><span>Armor</span><strong>${stats.armor}</strong></div>
        <div class="mini-stat"><span>Evasion</span><strong>${stats.evasion}%</strong></div>
        <div class="mini-stat"><span>Crit</span><strong>${stats.critRate}%</strong></div>
      </div>`;
    card.addEventListener("click", () => {
      state.selectedCharacterId = character.id;
      renderParty();
      renderEquipment();
    });
    host.appendChild(card);
  }
}

function renderEquipment() {
  const character = state.characters.find(candidate => candidate.id === state.selectedCharacterId) || state.characters[0];
  const tabs = $("characterTabs");
  tabs.innerHTML = "";
  for (const candidate of state.characters) {
    const button = document.createElement("button");
    button.textContent = `${candidate.name} · Lv.${candidate.level}`;
    button.className = candidate.id === character.id ? "active" : "";
    button.addEventListener("click", () => {
      state.selectedCharacterId = candidate.id;
      renderParty();
      renderEquipment();
    });
    tabs.appendChild(button);
  }

  const slots = $("equipmentSlots");
  slots.innerHTML = "";
  for (const slot of SLOT_DEFS) {
    const item = character.gear[slot.id];
    const card = document.createElement("div");
    card.className = "gear-slot";
    card.innerHTML = `
      <div class="slot-name">${slot.label}</div>
      <div class="gear-name">${item ? escapeHtml(itemName(item)) : "Empty"}</div>
      <div class="gear-stats">${item ? escapeHtml(itemStatLines(item)) : "No item equipped"}</div>
      ${item ? `<button class="secondary" data-unequip="${slot.id}">Unequip</button>` : ""}`;
    slots.appendChild(card);
    const unequip = card.querySelector("[data-unequip]");
    if (unequip) unequip.addEventListener("click", () => unequipItem(character.id, slot.id));
  }

  $("inventoryCount").textContent = `${state.inventory.length} item${state.inventory.length === 1 ? "" : "s"}`;
  const inventory = $("inventoryList");
  inventory.innerHTML = "";
  if (!state.inventory.length) {
    inventory.innerHTML = `<div class="empty-state">No drops yet. Defeat enemies to find equipment.</div>`;
    return;
  }

  for (const item of state.inventory) {
    const compatible = compatibleSlots(item);
    const card = document.createElement("div");
    card.className = "inventory-item";
    const canEquip = compatible.length > 0;
    card.innerHTML = `
      <div>
        <div class="item-name">${escapeHtml(itemName(item))}</div>
        <div class="item-type">${escapeHtml(item.type)} · ${item.rolls.length} roll${item.rolls.length === 1 ? "" : "s"}</div>
        <div class="item-stats">${escapeHtml(itemStatLines(item))}</div>
      </div>
      <button ${canEquip ? "" : "disabled"}>Equip</button>`;
    card.querySelector("button").addEventListener("click", () => {
      if (!canEquip) return;
      const preferred = compatible.find(slot => !character.gear[slot]) || compatible[0];
      equipItem(item.id, character.id, preferred);
    });
    inventory.appendChild(card);
  }
}

function drawBar(ctx, x, y, width, height, current, max, color) {
  ctx.fillStyle = "#2d3545";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, current / Math.max(1, max)), height);
  ctx.strokeStyle = "#465166";
  ctx.strokeRect(x, y, width, height);
}

function drawArena() {
  const canvas = $("arena");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  // Simple background and ground. The canvas is deliberately art-free for now.
  ctx.fillStyle = "#111925";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#172333";
  ctx.fillRect(0, height - 55, width, 55);
  ctx.strokeStyle = "#28364a";
  ctx.beginPath();
  ctx.moveTo(0, height - 55);
  ctx.lineTo(width, height - 55);
  ctx.stroke();

  const positions = [
    { x: 75, y: 190 },  // healer at the back
    { x: 185, y: 166 },
    { x: 295, y: 190 },
    { x: 405, y: 166 }  // knight in front
  ];
  state.characters.forEach((character, index) => {
    const pos = positions[index];
    const size = 42;
    ctx.globalAlpha = character.alive ? 1 : 0.35;
    ctx.fillStyle = character.color;
    ctx.fillRect(pos.x, pos.y, size, size);
    ctx.strokeStyle = character.id === state.selectedCharacterId ? "#ffffff" : "#3a4659";
    ctx.lineWidth = character.id === state.selectedCharacterId ? 3 : 1;
    ctx.strokeRect(pos.x, pos.y, size, size);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#111925";
    ctx.font = "bold 17px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(character.mark, pos.x + size / 2, pos.y + 27);
    ctx.fillStyle = "#e8edf7";
    ctx.font = "12px system-ui";
    ctx.fillText(character.name, pos.x + size / 2, pos.y - 17);
    drawBar(ctx, pos.x - 5, pos.y - 10, size + 10, 5, character.hp, character.maxHp, character.alive ? "#83d6b0" : "#a44e5a");
  });

  const enemy = getEnemy();
  const enemyX = 710;
  const enemyY = 170;
  const enemySize = 76;
  ctx.fillStyle = enemy.color;
  ctx.fillRect(enemyX, enemyY, enemySize, enemySize);
  ctx.strokeStyle = "#4a5668";
  ctx.lineWidth = 2;
  ctx.strokeRect(enemyX, enemyY, enemySize, enemySize);
  ctx.fillStyle = "#111925";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("!", enemyX + enemySize / 2, enemyY + 47);
  ctx.fillStyle = "#e8edf7";
  ctx.font = "13px system-ui";
  ctx.fillText(enemy.name, enemyX + enemySize / 2, enemyY - 24);
  drawBar(ctx, enemyX - 8, enemyY - 14, enemySize + 16, 7, state.enemyHp, state.enemyMaxHp, "#e67e83");
  ctx.fillStyle = "#9ca8bd";
  ctx.font = "11px system-ui";
  ctx.fillText(`${Math.ceil(state.enemyHp)} / ${Math.ceil(state.enemyMaxHp)} HP`, enemyX + enemySize / 2, enemyY + enemySize + 19);

  ctx.textAlign = "left";
  ctx.fillStyle = "#708099";
  ctx.font = "11px system-ui";
  ctx.fillText("BACK LINE", 40, 305);
  ctx.fillText("FRONT LINE", 335, 305);
  ctx.fillText(state.paused ? "PAUSED" : "AUTO-FIGHT", 18, 22);
}

function renderAll() {
  updateTopStats();
  updateBattleSummary();
  renderEnemies();
  renderParty();
  renderEquipment();
  updateFightStats();
  drawArena();
}

function startManualFight() {
  if (state.enemyHp < state.enemyMaxHp) {
    addLog("The current fight is already underway.", "system");
    return;
  }
  state.fightNumber++;
  resetFight();
}

function bindEvents() {
  $("pauseButton").addEventListener("click", () => {
    state.paused = !state.paused;
    $("pauseButton").textContent = state.paused ? "Resume" : "Pause";
    drawArena();
    addLog(state.paused ? "Auto battle paused." : "Auto battle resumed.", "system");
  });

  $("fightButton").addEventListener("click", () => {
    if (state.paused) {
      state.paused = false;
      $("pauseButton").textContent = "Pause";
    }
    if (state.enemyHp <= 0) resetFight();
    // Make the next party action happen promptly without skipping the current enemy.
    state.partyAttackTimer = CONFIG.attackEveryTicks - 1;
    addLog("Party focuses on the current enemy.", "system");
  });

  $("clearLogButton").addEventListener("click", () => {
    state.logLines = [];
    $("combatLog").innerHTML = "";
    addLog("Combat log cleared.", "system");
  });
}

function initStartingGear() {
  // Everybody starts with an unarmored wooden weapon. They are intentionally weak.
  const startingWeapons = {
    cleric: makeItem("Staff", 1, false),
    mage: makeItem("Wand", 1, false),
    archer: makeItem("Bow", 1, false),
    knight: makeItem("Sword", 1, false)
  };
  for (const character of state.characters) {
    character.gear.weapon = startingWeapons[character.id];
    character.gear.weapon.type = `Wooden ${startingWeapons[character.id].type}`;
    character.gear.weapon.base = character.id === "cleric" ? { healing: 1 } : { [character.id === "mage" ? "spellDamage" : "physDamage"]: 1 };
    character.gear.weapon.rolls = [];
  }
}

function startGame() {
  initStartingGear();
  recalculateParty();
  resetFight(false);
  bindEvents();
  renderAll();
  addLog("Your party is ready. The Green Slime is an easy first target.", "system");
  addLog("The Knight stands at the front; enemies attack from right to left.", "system");
  window.setInterval(gameTick, CONFIG.tickMs);
}

startGame();

const pet = document.getElementById("pet");
const container = document.getElementById("pet-container");
const head = document.querySelector(".head");
const face = document.querySelector(".face");
const bubble = document.getElementById("bubble");
const dragHandle = document.getElementById("drag-handle");
const eyes = [...document.querySelectorAll(".eye")];

// ---------- Settings ----------

const SHOW_BUBBLES = true;     // small speech bubbles
const ANNOY_WINDOW = 2000;     // ms window for rapid clicks
const ANNOY_TIME = 3500;       // ms it stays annoyed

// Voice (the language itself is set in voice.py: VOICE_LANGUAGE)
const VOICE_REPLY = true;          // speak replies out loud
const SHOW_HEARD = true;           // briefly show what it heard (good for testing)
const REQUIRE_WAKE_WORD = false;   // true = only react when you start with its name
const REPLY_TO_UNKNOWN = false;    // true = say "I didn't get that" for unknown sentences

// Behaviour changes as the pet grows (by total active minutes)
const STAGES = {
    baby: {near: 200, annoyClicks: 5, randMin: 7000, randMax: 12000, lean: 8},
    young: {near: 150, annoyClicks: 4, randMin: 12000, randMax: 20000, lean: 6},
    grown: {near: 120, annoyClicks: 4, randMin: 20000, randMax: 35000, lean: 5}
};

// ---------- Texts (English / Persian) ----------

let LANG = "en";

const STR = {
    en: {
        stages: {baby: "Baby", young: "Teen", grown: "Grown-up"},
        personalities: {
            attached: "Attached", friendly: "Friendly", neutral: "Neutral", distant: "Distant"
        },
        status: (stg, pers, aff, en) => `${stg} · ${pers} · bond ${Math.round(aff)}% · energy ${Math.round(en)}%`,
        heardQuote: (s) => `“${s}”`,

        growYoung: "I'm growing up!",
        growGrown: "I'm all grown up now",
        stillHere: "Hey... I'm still here",
        enough: "That's enough!",

        greetFirst: "Hi! I was just born",
        greetAgain: "Hi again!",
        greetBack: "Oh... you're back",
        greetLongTime: "I haven't seen you in ages!",
        greetMissed: "I missed you",
        greetForgot: "I thought you forgot me",
        greetWhere: "Where have you been all this time?",
        greetLow: "Hi...",

        voiceNeedsLibs: "I need a few libraries for voice (check the terminal)",
        voiceTip: "Talk to me! Try saying “come here”",

        yes: "Yes?",
        unknown: "Hmm, I didn't get that. Say “help” to see what I know.",
        unknownSpeech: "Hmm, I didn't get that.",

        unmute: "Okay! I'll talk again",
        mute: "Okay, I'll be quiet",
        sleep: "Good night... zzz",
        sleepSpeech: "Good night",
        wokeUp: "I'm awake!",
        alreadyAwake: "I'm already awake!",
        come: "I'm coming!",
        howTired: "I'm so sleepy...",
        howAttached: "I'm great! I love being next to you",
        howFriendly: "I'm good, thanks for asking",
        howNeutral: "I'm okay",
        howDistant: "Honestly, I'm a bit upset... you don't talk to me much",
        name: "I'm Blue Pet, the little guy who lives on your desktop",
        nameSpeech: "I'm Blue Pet, the little guy who lives on your desktop",
        help: "Try: come here, go away, go to sleep, wake up, how are you, what time is it, smile, cry",
        thanks: "You're welcome!",
        love: "I'm happy to be next to you, too!",
        praise: "Aw, thank you!",
        hello: "Hi! Welcome back",
        helloLow: "Hi...",
        bye: "Bye! Come back soon",
        home: "Okay, going away"
    },
    fa: {
        stages: {baby: "کودک", young: "نوجوان", grown: "بالغ"},
        personalities: {
            attached: "دلبسته", friendly: "صمیمی", neutral: "معمولی", distant: "دلخور"
        },
        status: (stg, pers, aff, en) =>
            `${stg} · ${pers} · پیوند ${fa(aff)}٪ · انرژی ${fa(en)}٪`,
        heardQuote: (s) => `«${s}»`,

        growYoung: "دارم بزرگ می‌شم!",
        growGrown: "حالا دیگه بزرگ شدم",
        stillHere: "هی... هنوز اینجام",
        enough: "بسه دیگه!",

        greetFirst: "سلام! من تازه به دنیا اومدم",
        greetAgain: "سلام دوباره!",
        greetBack: "اوه... برگشتی",
        greetLongTime: "خیلی وقت بود ندیده بودمت!",
        greetMissed: "دلم برات تنگ شده بود",
        greetForgot: "فکر کردم فراموشم کردی",
        greetWhere: "کجا بودی این‌همه وقت؟",
        greetLow: "سلام...",

        voiceNeedsLibs: "برای صدا چند کتابخانه لازمه (ترمینال رو ببین)",
        voiceTip: "باهام حرف بزن! مثلاً بگو «بیا»",

        yes: "بله؟",
        unknown: "نفهمیدم. بگو «راهنما» تا بگم چی بلدم",
        unknownSpeech: "نفهمیدم",

        unmute: "باشه! دوباره حرف می‌زنم",
        mute: "باشه، ساکت شدم",
        sleep: "شب بخیر... زززز",
        sleepSpeech: "شب بخیر",
        wokeUp: "بیدارم!",
        alreadyAwake: "من که بیدارم!",
        come: "اومدم!",
        howTired: "خیلی خوابم میاد...",
        howAttached: "عالیم! وقتی کنارمی خیلی خوشحالم",
        howFriendly: "خوبم، ممنون که پرسیدی",
        howNeutral: "بد نیستم",
        howDistant: "راستش یه کم دلخورم... کم باهام حرف می‌زنی",
        name: "من بلو پتم، ساکن کوچیک دسکتاپ تو",
        nameSpeech: "من بلو پت هستم، ساکن کوچیک دسکتاپ تو",
        help: "بگو بیا، برو، بخواب، بیدار شو، حالت چطوره، ساعت چنده، یا بخند و ناراحت شو",
        thanks: "خواهش می‌کنم",
        love: "منم از بودن کنار تو خوشحالم",
        praise: "ای جان! ممنون",
        hello: "سلام! خوش اومدی",
        helloLow: "سلام...",
        bye: "خداحافظ! زود برگرد",
        home: "باشه، می‌رم"
    }
};

function t(key, ...args) {
    const table = STR[LANG] || STR.en;
    const value = table[key];
    return typeof value === "function" ? value(...args) : value;
}

function fa(n) {
    return Math.round(n).toLocaleString("fa-IR");
}

// ---------- Saved state ----------

const DEFAULT_STATE = {
    affection: 40,        // 0..100  (how much you interact with it)
    energy: 80,           // 0..100
    activeMinutes: 0,     // total running time (its "age")
    interactions: 0,
    runs: 0,
    lastSeen: 0
};

let state = {...DEFAULT_STATE};
let booted = false;
let bridge = null;

function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

function num(v, def) {
    return Number.isFinite(v) ? v : def;
}

function rand(a, b) {
    return a + Math.random() * (b - a);
}

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function stage() {
    if (state.activeMinutes < 45) return "baby";
    if (state.activeMinutes < 400) return "young";
    return "grown";
}

function personality() {
    const a = state.affection;
    if (a >= 70) return "attached";
    if (a >= 45) return "friendly";
    if (a >= 25) return "neutral";
    return "distant";
}

function isNight() {
    const h = new Date().getHours();
    return h >= 23 || h < 6;
}

function loadState(done) {
    if (bridge) {
        bridge.loadState((text) => {
            try {
                done(JSON.parse(text));
            } catch (e) {
                done({});
            }
        });
    } else {
        try {
            done(JSON.parse(localStorage.getItem("bluePet") || "{}"));
        } catch (e) {
            done({});
        }
    }
}

function saveState() {
    if (!booted) return;
    state.lastSeen = Date.now();
    const text = JSON.stringify(state);
    if (bridge) bridge.saveState(text);
    else {
        try {
            localStorage.setItem("bluePet", text);
        } catch (e) {
        }
    }
}

let saveTimer = null;

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveState();
    }, 2000);
}

setInterval(saveState, 20000);
window.addEventListener("beforeunload", saveState);

// ---------- Speech bubble ----------

let bubbleTimer = null;

function say(text, ms = 2600) {
    if (!SHOW_BUBBLES) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms);
}

function showStatus() {
    say(
        t("status", t("stages")[stage()], t("personalities")[personality()],
            state.affection, state.energy),
        3500
    );
}

// ---------- Mood engine ----------
// Automatic mood comes from where the mouse is, energy and personality.
// "override" is a temporary reaction (click, greeting, voice...) that wins for a while.

const moods = [
    "normal", "happy", "sad", "teary", "crying",
    "angry", "surprised", "shy", "thinking", "excited",
    "curious", "annoyed", "sleepy", "listening"
];

let currentMood = "normal";
let override = null;           // { mood, until, tag }
let seqId = 0;
let sleeping = false;
let sleepForced = false;       // put to sleep by voice: only wakes by voice / touch
let sleepStart = 0;
let prevZone = "far";
let overSince = 0;
let overCounted = false;
let lastInteraction = Date.now();
let nextRandomAt = Date.now() + 10000;
let voiceSpeaking = false;

function applyClass() {
    pet.className = "pet " + currentMood + (voiceSpeaking ? " talking" : "");
}

function showMood(mood) {
    if (mood === currentMood) return;
    if (!moods.includes(mood) && mood !== "sleeping") return;
    currentMood = mood;
    applyClass();
}

function setOverride(mood, ms, tag) {
    override = {mood, until: Date.now() + ms, tag: tag || null};
    showMood(mood);
}

function isBusy() {
    return override !== null && Date.now() < override.until;
}

// Reaction started by the user or by the pet; cancels any running sequence
function pulse(mood, ms) {
    seqId++;
    setOverride(mood, ms);
}

// A few moods one after another
function sequence(steps) {
    const id = ++seqId;
    let tt = 0;
    steps.forEach(([mood, ms]) => {
        setTimeout(() => {
            if (seqId === id) setOverride(mood, ms);
        }, tt);
        tt += ms;
    });
}

function wakeUp() {
    sleeping = false;
    sleepForced = false;
}

function forceSleep() {
    sleeping = true;
    sleepForced = true;
    sleepStart = Date.now();
    override = null;
    seqId++;
    target.x = 0;
    target.y = 0;
}

// ---------- Mouse position ----------

const target = {x: 0, y: 0};   // -1..1
const current = {x: 0, y: 0};

let lastCursor = {x: null, y: null};
let lastMove = Date.now();

window.lookAt = function (cx, cy) {
    if (cx !== lastCursor.x || cy !== lastCursor.y) {
        lastCursor = {x: cx, y: cy};
        lastMove = Date.now();
    }

    const r = container.getBoundingClientRect();
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height * 0.45;

    const dx = cx - ox;
    const dy = cy - oy;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) {
        target.x = 0;
        target.y = 0;
    } else {
        const reach = Math.min(dist / 220, 1);
        target.x = (dx / dist) * reach;
        target.y = (dy / dist) * reach;
    }
};

// Fallback when running in a normal browser
document.addEventListener("mousemove", (e) => window.lookAt(e.clientX, e.clientY));

function getZone() {
    if (lastCursor.x === null) return "far";

    const r = head.getBoundingClientRect();
    const {x, y} = lastCursor;

    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return "over";

    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    return Math.hypot(dx, dy) < STAGES[stage()].near ? "near" : "far";
}

// ---------- Sleep / automatic mood ----------

function updateSleep(zone) {
    const now = Date.now();

    if (sleeping) {
        // Put to sleep by voice: ignores a nearby mouse, only wakes when touched
        const mouseWake = zone === "over" || (zone === "near" && !sleepForced);
        const restedWake = state.energy >= 85 &&
            now - sleepStart > (sleepForced ? 300000 : 30000);

        if (mouseWake) {
            wakeUp();
            lastMove = now;
            if (!isBusy()) setOverride(state.energy < 25 ? "sleepy" : "surprised", 1100);
        } else if (restedWake) {
            wakeUp();
            lastMove = now;
            if (!isBusy()) setOverride("happy", 1500);
        }
        return;
    }

    if (zone === "far" && !isBusy() &&
        (now - lastMove > 60000 || state.energy < 6)) {
        sleeping = true;
        sleepForced = false;
        sleepStart = now;
        target.x = 0;
        target.y = 0;
    }
}

function computeBase(zone) {
    if (sleeping) return "sleeping";

    const p = personality();
    const tired = state.energy < 22;

    if (zone === "over") {
        const secs = (Date.now() - overSince) / 1000;
        if (p === "attached") return "excited";
        if (p === "friendly") return "happy";
        if (p === "neutral") return secs > 1.2 ? "happy" : "curious";
        return secs > 2.5 ? "happy" : "shy";             // distant
    }

    if (zone === "near") {
        if (p === "distant") return tired ? "sleepy" : "normal";
        return "curious";
    }

    return tired ? "sleepy" : "normal";
}

function tickMood() {
    if (!booted) return;

    const zone = getZone();
    if (zone === "over" && prevZone !== "over") overSince = Date.now();
    prevZone = zone;

    updateSleep(zone);

    if (isBusy()) {
        showMood(override.mood);
        return;
    }
    override = null;
    showMood(computeBase(zone));
}

setInterval(tickMood, 150);

// ---------- Slow tick: energy, affection, growth, random moods ----------

function gain(x) {
    state.affection += x * (1 - state.affection / 140);
}

let prevStage = "baby";

function randomPool() {
    const p = personality();
    const st = stage();
    const ignored = (Date.now() - lastInteraction) / 60000 > 10;

    let pool;
    if (st === "baby") pool = ["curious", "excited", "surprised", "happy", "thinking"];
    else if (st === "young") pool = ["thinking", "happy", "curious", "shy"];
    else pool = ["thinking", "happy", "thinking", "sleepy"];

    if (ignored) pool.push("sad", "thinking");
    if (ignored && p === "attached") pool.push("teary", "sad");
    if (p === "distant") pool.push("sad", "shy");
    if (state.energy < 35) pool.push("sleepy", "sleepy", "sleepy");
    return pool;
}

setInterval(() => {
    if (!booted) return;

    const now = Date.now();
    const zone = getZone();

    state.activeMinutes += 1 / 60;

    // Energy
    if (sleeping) state.energy += 0.1;
    else state.energy -= isNight() ? 0.024 : 0.012;

    // Affection: attention raises it, being ignored lowers it
    if (zone === "over") {
        gain(0.12);
        lastInteraction = now;
        if (!overCounted) {
            overCounted = true;
            state.interactions++;
        }
    } else {
        overCounted = false;
        if (zone === "near") gain(0.02);
    }
    if ((now - lastInteraction) / 60000 > 10) state.affection -= 0.003;

    state.affection = clamp(state.affection, 0, 100);
    state.energy = clamp(state.energy, 0, 100);

    // Growing up
    const st = stage();
    if (st !== prevStage) {
        prevStage = st;
        say(st === "young" ? t("growYoung") : t("growGrown"));
        sequence([["excited", 2200]]);
    }

    // Random behaviour
    if (now >= nextRandomAt) {
        const cfg = STAGES[st];
        nextRandomAt = now + rand(cfg.randMin, cfg.randMax);

        if (!sleeping && !isBusy() && (currentMood === "normal" || currentMood === "sleepy")) {
            pulse(pick(randomPool()), 2500);

            const ignoredMin = (now - lastInteraction) / 60000;
            if (ignoredMin > 30 && personality() !== "distant" && Math.random() < 0.3) {
                say(t("stillHere"));
            }
        }
    }
}, 1000);

// ---------- Clicks ----------

const clicks = [];

function annoyLimit() {
    const base = STAGES[stage()].annoyClicks;
    const p = personality();
    if (p === "attached") return base + 1;
    if (p === "distant") return Math.max(3, base - 1);
    return base;
}

function clickPool() {
    if (state.energy < 20) return ["sleepy", "surprised", "sad"];

    switch (personality()) {
        case "attached":
            return ["excited", "happy", "happy", "shy"];
        case "friendly":
            return ["happy", "happy", "shy", "surprised"];
        case "neutral":
            return ["surprised", "happy", "thinking", "shy"];
        default:
            return ["surprised", "shy", "sad", "thinking"];
    }
}

function startAnnoyed(real) {
    wakeUp();
    seqId++;
    setOverride("annoyed", ANNOY_TIME);
    if (real) {
        state.affection = clamp(state.affection - 1.5, 0, 100);
        say(t("enough"));
        scheduleSave();
    }
}

function onPetClick() {
    if (!booted) return;

    const now = Date.now();
    lastInteraction = now;
    state.interactions++;
    wakeUp();

    if (isBusy() && override.mood === "annoyed") return;

    clicks.push(now);
    while (clicks.length && now - clicks[0] > ANNOY_WINDOW) clicks.shift();

    if (clicks.length >= annoyLimit()) {
        clicks.length = 0;
        startAnnoyed(true);
        return;
    }

    gain(clicks.length > 1 ? 0.4 : 1.2);
    pulse(pick(clickPool()), 1800);
    scheduleSave();
}

document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target === dragHandle) return;   // dragging is handled below
    onPetClick();
});

// Picking it up and moving it
dragHandle.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (bridge) bridge.startMove();
    if (!booted) return;

    wakeUp();
    lastInteraction = Date.now();
    gain(0.3);
    pulse("surprised", 1200);
    scheduleSave();
});

// ---------- Keyboard (only for testing moods) ----------

document.addEventListener("keydown", (event) => {
    if (!booted) return;

    const keys = {
        "2": "happy", "3": "sad", "4": "teary", "5": "crying",
        "6": "angry", "7": "surprised", "8": "shy", "9": "thinking", "0": "excited",
        "q": "curious", "e": "sleepy"
    };

    if (event.key === "s") {
        showStatus();
        return;
    }
    if (event.key === "w") {
        startAnnoyed(false);
        return;
    }

    if (event.key === "1") {
        seqId++;
        override = null;
        wakeUp();
        return;
    }

    if (keys[event.key]) {
        wakeUp();
        pulse(keys[event.key], 8000);
    }
});

// ---------- Eyes ----------

function gazeGoal() {
    if (currentMood === "thinking") return {x: 0.7, y: -0.7};
    if (currentMood === "annoyed") return {x: -0.8, y: 0.15};
    if (currentMood === "sleeping") return {x: 0, y: 0};

    let k = 1;
    const p = personality();
    if (p === "distant") k = 0.45;           // a bit cold, barely looks at you
    else if (p === "neutral") k = 0.85;
    if (currentMood === "sleepy") k *= 0.5;
    if (currentMood === "curious" || currentMood === "excited" || currentMood === "listening") k = 1;

    return {x: target.x * k, y: target.y * k};
}

function animateEyes() {
    const goal = gazeGoal();

    current.x += (goal.x - current.x) * 0.18;
    current.y += (goal.y - current.y) * 0.18;

    eyes.forEach((eye) => {
        const pupil = eye.firstElementChild;
        const maxX = Math.max((eye.clientWidth - pupil.offsetWidth) / 2 - 2, 0);
        const maxY = Math.max((eye.clientHeight - pupil.offsetHeight) / 2 - 2, 0);

        pupil.style.setProperty("--px", (current.x * maxX).toFixed(2) + "px");
        pupil.style.setProperty("--py", (current.y * maxY).toFixed(2) + "px");
    });

    const lean = currentMood === "curious" ? 8 : STAGES[stage()].lean;
    face.style.setProperty("--fx", (current.x * lean).toFixed(2) + "px");
    face.style.setProperty("--fy", (current.y * lean * 0.8).toFixed(2) + "px");

    requestAnimationFrame(animateEyes);
}

animateEyes();

// =====================================================================
//                              VOICE
// =====================================================================

let voice = {stt: false, tts: false, lang: "en", problems: []};
let voiceMuted = false;
let lastVoiceError = 0;

// ----- Text normalisation -----

function normalizeText(text) {
    let s = String(text || "").toLowerCase();

    if (LANG === "fa") {
        s = s
            .replace(/\u064A/g, "\u06CC")            // arabic yeh -> persian yeh
            .replace(/\u0643/g, "\u06A9")            // arabic kaf -> persian kaf
            .replace(/[\u0623\u0625]/g, "\u0627")
            .replace(/[\u06C0\u0629]/g, "\u0647")
            .replace(/[\u064B-\u065F\u0670]/g, "")   // diacritics
            .replace(/\u200c/g, " ")                 // half-space
            .replace(/[؟?!.,،؛:;"'«»()\-]/g, " ");
    } else {
        s = s
            .replace(/[’']/g, "")                    // what's -> whats
            .replace(/[^a-z0-9\s]/g, " ");
    }

    return s.replace(/\s+/g, " ").trim();
}

// ----- Names it answers to -----

const WAKE_WORDS = {
    en: ["hey blue pet", "hi blue pet", "ok blue pet", "okay blue pet",
        "hey blue", "hi blue", "ok blue", "okay blue", "hello blue",
        "blue pet", "blue", "blew", "blu"],
    fa: ["بلو پت", "بلو", "پت"]
};

let wakeNorm = [];

// returns the sentence without its name, or null if it didn't start with the name
function stripWake(norm) {
    for (const w of wakeNorm) {
        if (norm === w) return "";
        if (norm.startsWith(w + " ")) return norm.slice(w.length + 1).trim();
    }
    return null;
}

// ----- Speaking back -----

function speakReply(text) {
    if (!bridge || !voice.tts || voiceMuted || !VOICE_REPLY) return;
    if (!text) return;
    bridge.speak(text);
}

// text = what the bubble shows, speech = what it says out loud (defaults to text)
function reply(text, mood, speech, holdMs) {
    const ms = Math.min(9000, 1800 + text.length * 70);
    say(text, ms);
    if (mood) pulse(mood, Math.max(holdMs || 2200, ms));
    speakReply(speech === undefined ? text : speech);
}

// ----- Commands -----

const MOOD_COMMANDS = [
    {
        mood: "happy",
        words: {en: ["smile", "be happy", "laugh", "cheer up"], fa: ["بخند", "خوشحال شو", "شاد باش"]},
        text: {en: "Hee hee!", fa: "هی هی!"}
    },
    {
        mood: "sad",
        words: {en: ["be sad", "look sad", "sad face"], fa: ["ناراحت شو", "غمگین شو"]},
        text: {en: "I feel so sad...", fa: "بغض کردم"}
    },
    {
        mood: "crying",
        words: {en: ["cry", "start crying", "cry now"], fa: ["گریه کن"]},
        text: {en: "Waaah, I'm crying", fa: "وای، دارم گریه می‌کنم"}
    },
    {
        mood: "angry",
        words: {en: ["be angry", "get angry", "look angry", "angry face"], fa: ["عصبانی شو"]},
        text: {en: "Grr! I'm angry!", fa: "عصبانی شدم!"}
    },
    {
        mood: "surprised",
        words: {en: ["be surprised", "look surprised", "surprise", "surprised face"], fa: ["تعجب کن", "جا بخور"]},
        text: {en: "Whoa!", fa: "وای!"}
    },
    {
        mood: "shy",
        words: {en: ["be shy", "look shy", "shy"], fa: ["خجالت بکش", "خجالتی شو"]},
        text: {en: "I'm shy...", fa: "خجالت می‌کشم"}
    },
    {
        mood: "thinking",
        words: {en: ["think", "think about it", "hmm"], fa: ["فکر کن"]},
        text: {en: "Hmm... let me think", fa: "هوم... بذار فکر کنم"}
    },
    {
        mood: "excited",
        words: {en: ["be excited", "get excited", "excited"], fa: ["هیجان زده شو", "هیجانزده شو"]},
        text: {en: "Yay!", fa: "ایول!"}
    },
    {
        mood: "curious",
        words: {en: ["be curious", "look curious", "curious"], fa: ["کنجکاو شو"]},
        text: {en: "What's that?", fa: "چی شده؟"}
    }
];

const COMMANDS = [
    {
        id: "mute",
        words: {
            en: ["be quiet", "quiet", "shut up", "stop talking", "dont talk", "mute", "silence"],
            fa: ["ساکت شو", "ساکت", "حرف نزن", "صدات رو قطع کن"]
        },
        run() {
            voiceMuted = true;
            if (bridge) bridge.stopSpeaking();
            reply(t("mute"), "shy", "");
        }
    },
    {
        id: "unmute",
        words: {
            en: ["talk to me", "start talking", "unmute", "speak to me", "you can talk"],
            fa: ["حرف بزن", "صحبت کن", "صدات رو باز کن", "صدات رو وصل کن"]
        },
        run() {
            voiceMuted = false;
            reply(t("unmute"), "happy");
        }
    },
    {
        id: "sleep",
        words: {
            en: ["go to sleep", "sleep", "good night", "goodnight", "take a nap", "nap", "time to sleep"],
            fa: ["بخواب", "برو بخواب", "شب بخیر", "استراحت کن"]
        },
        run() {
            reply(t("sleep"), "sleepy", t("sleepSpeech"));
            setTimeout(forceSleep, 2400);
        }
    },
    {
        id: "wake",
        words: {
            en: ["wake up", "wake", "get up", "rise and shine"],
            fa: ["بیدار شو", "بیدار", "پاشو", "پا شو", "بلند شو"]
        },
        run() {
            const was = sleeping;
            wakeUp();
            if (was) reply(t("wokeUp"), "surprised");
            else reply(t("alreadyAwake"), "happy");
        }
    },
    {
        id: "come",
        words: {
            en: ["come here", "come", "come to me", "come over", "over here"],
            fa: ["بیا", "بیا اینجا", "بیا پیشم", "بیا پیش من", "بیا کنارم"]
        },
        run() {
            reply(t("come"), "excited");
            if (bridge) bridge.moveToCursor();
        }
    },
    {
        id: "how",
        words: {
            en: ["how are you", "how are you doing", "how you doing", "hows it going",
                "how is it going", "how do you feel", "whats up", "are you ok", "are you okay",
                "you okay", "hows life"],
            fa: ["حالت چطوره", "حالت چطور", "چطوری", "حالت خوبه", "احوالت", "چه خبر"]
        },
        run() {
            const p = personality();
            if (state.energy < 20) reply(t("howTired"), "sleepy");
            else if (p === "attached") reply(t("howAttached"), "excited");
            else if (p === "friendly") reply(t("howFriendly"), "happy");
            else if (p === "neutral") reply(t("howNeutral"), "thinking");
            else reply(t("howDistant"), "sad");
        }
    },
    {
        id: "name",
        words: {
            en: ["whats your name", "what is your name", "who are you", "your name"],
            fa: ["اسمت چیه", "اسمت چی", "اسم تو چیه", "تو کی هستی", "کی هستی"]
        },
        run() {
            reply(t("name"), "happy", t("nameSpeech"));
        }
    },
    {
        id: "time",
        words: {
            en: ["what time is it", "whats the time", "what is the time", "tell me the time",
                "current time", "time please"],
            fa: ["ساعت چنده", "ساعت چند", "ساعت چنده الان", "چه ساعتیه", "ساعت رو بگو"]
        },
        run() {
            const d = new Date();
            if (LANG === "fa") {
                const h = d.getHours();
                const m = d.getMinutes();
                const shown = d.toLocaleTimeString("fa-IR", {
                    hour: "2-digit", minute: "2-digit", hour12: false
                });
                const spoken = m === 0 ? `ساعت ${h} است` : `ساعت ${h} و ${m} دقیقه است`;
                reply(`ساعت ${shown} است`, "thinking", spoken);
            } else {
                const shown = d.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"});
                reply(`It's ${shown}`, "thinking");
            }
        }
    },
    {
        id: "help",
        words: {
            en: ["help", "what can you do", "commands", "what do you know", "what can you understand"],
            fa: ["راهنما", "کمک", "چیکار بلدی", "چه کار بلدی", "چه کارایی بلدی",
                "چیکار میتونی بکنی", "چیکار می تونی بکنی", "چه کار میتونی بکنی"]
        },
        run() {
            reply(t("help"), "happy");
        }
    },
    {
        id: "thanks",
        words: {
            en: ["thanks", "thank you", "thanks a lot", "thank you so much", "appreciate it"],
            fa: ["ممنون", "مرسی", "تشکر", "دستت درد نکنه", "مچکرم"]
        },
        run() {
            gain(0.5);
            reply(t("thanks"), "happy");
        }
    },
    {
        id: "love",
        words: {
            en: ["i love you", "love you", "i like you"],
            fa: ["دوستت دارم", "دوست دارم"]
        },
        run() {
            gain(1.5);
            reply(t("love"), "happy");
        }
    },
    {
        id: "hello",
        words: {
            en: ["hello", "hi", "hey", "hey there", "hi there", "yo",
                "good morning", "good afternoon", "good evening"],
            fa: ["سلام", "درود", "های"]
        },
        run() {
            if (personality() === "distant") reply(t("helloLow"), "shy");
            else reply(t("hello"), "happy");
        }
    },
    {
        id: "bye",
        words: {
            en: ["goodbye", "good bye", "bye", "bye bye", "see you", "see you later", "see ya", "farewell"],
            fa: ["خداحافظ", "بای", "فعلا"]
        },
        run() {
            reply(t("bye"), personality() === "distant" ? "normal" : "sad");
        }
    },
    {
        id: "praise",
        words: {
            en: ["good job", "great job", "well done", "good boy", "good girl", "good pet",
                "nice", "awesome", "amazing", "cute", "youre cute", "you are cute",
                "youre awesome", "you are awesome"],
            fa: ["آفرین", "احسنت", "دمت گرم", "عالی", "قشنگی", "ناز"]
        },
        run() {
            gain(1.2);
            reply(t("praise"), "excited");
        }
    },
    ...MOOD_COMMANDS.map((m) => ({
        id: "mood",
        words: m.words,
        run() {
            reply(m.text[LANG] || m.text.en, m.mood, undefined, 4000);
        }
    })),
    {
        id: "home",
        words: {
            en: ["go away", "go back", "go home", "go to your corner", "go"],
            fa: ["برو", "برو کنار", "برگرد", "برو سر جات"]
        },
        run() {
            reply(t("home"), "shy");
            if (bridge) bridge.goHome();
        }
    }
];

function setLanguage(lang) {
    LANG = STR[lang] ? lang : "en";
    bubble.style.direction = LANG === "fa" ? "rtl" : "ltr";

    wakeNorm = (WAKE_WORDS[LANG] || [])
        .map(normalizeText)
        .sort((a, b) => b.length - a.length);

    COMMANDS.forEach((c) => {
        c.norm = (c.words[LANG] || []).map(normalizeText);
    });
}

function findCommand(norm) {
    const padded = " " + norm + " ";
    return COMMANDS.find((c) => c.norm.some((w) => padded.includes(" " + w + " "))) || null;
}

function handleVoiceText(raw) {
    console.log("[voice] heard:", raw);

    let norm = normalizeText(raw);
    if (!norm) return;

    const stripped = stripWake(norm);
    const addressed = stripped !== null;
    if (addressed) norm = stripped;
    if (REQUIRE_WAKE_WORD && !addressed) return;

    if (SHOW_HEARD) say(t("heardQuote", raw.trim()), 1500);

    // Only its name: "Blue?"
    if (addressed && !norm) {
        wakeUp();
        reply(t("yes"), "curious");
        return;
    }

    const cmd = findCommand(norm);
    if (!cmd) {
        if (REPLY_TO_UNKNOWN) reply(t("unknown"), "thinking", t("unknownSpeech"));
        return;
    }

    // Put to sleep by voice: it only answers to "wake up"
    if (sleeping && sleepForced && cmd.id !== "wake") return;
    // Light sleep: talking to it wakes it up
    if (sleeping && cmd.id !== "wake") wakeUp();

    lastInteraction = Date.now();
    state.interactions++;
    gain(0.3);
    scheduleSave();

    cmd.run(norm);
}

// ----- Events from Python (microphone + speaker) -----

function clearVoiceMood() {
    if (override && override.tag === "voice") override = null;
}

window.voiceEvent = function (kind, data) {
    data = data || {};

    switch (kind) {
        case "speech_start":
            // You started talking: wide eyes, glowing head
            if (booted && !sleeping && !voiceSpeaking && !isBusy()) {
                setOverride("listening", 12000, "voice");
            }
            break;

        case "processing":
            // Sentence finished: it is thinking
            if (override && override.tag === "voice") {
                setOverride("thinking", 10000, "voice");
            }
            break;

        case "heard":
            clearVoiceMood();
            if (booted) handleVoiceText(data.text || "");
            break;

        case "not_understood":
        case "cancelled":
            clearVoiceMood();
            break;

        case "error": {
            clearVoiceMood();
            const now = Date.now();
            if (data.message && now - lastVoiceError > 30000) {
                lastVoiceError = now;
                say(data.message, 3500);
            }
            break;
        }

        case "speaking":
            voiceSpeaking = true;
            applyClass();
            break;

        case "speaking_done":
            voiceSpeaking = false;
            applyClass();
            break;
    }
};

// ---------- Greeting when the app starts ----------

function greet(first, gapMin) {
    const aff = state.affection;
    const hours = gapMin / 60;

    if (first) {
        sequence([["surprised", 1500], ["curious", 2000], ["happy", 1800]]);
        say(t("greetFirst"), 3500);
    } else if (gapMin < 5) {
        pulse("happy", 1500);
    } else if (hours < 6) {
        if (aff >= 45) {
            sequence([["happy", 2200]]);
            say(t("greetAgain"));
        } else {
            sequence([["shy", 2200]]);
            say(t("greetBack"));
        }
    } else if (hours < 48) {
        if (aff >= 60) {
            sequence([["excited", 2400]]);
            say(t("greetLongTime"));
        } else if (aff >= 30) {
            sequence([["teary", 2000], ["happy", 2000]]);
            say(t("greetMissed"));
        } else {
            sequence([["sad", 2600]]);
            say(t("greetForgot"));
        }
    } else {
        if (aff >= 50) {
            sequence([["teary", 2400], ["happy", 2200]]);
            say(t("greetWhere"), 3500);
        } else {
            sequence([["sad", 2600], ["shy", 1800]]);
            say(t("greetLow"), 3000);
        }
    }
}

// ---------- Start ----------

function boot() {
    loadState((saved) => {
        const s = saved && typeof saved === "object" ? saved : {};
        state = {
            affection: clamp(num(s.affection, DEFAULT_STATE.affection), 0, 100),
            energy: clamp(num(s.energy, DEFAULT_STATE.energy), 0, 100),
            activeMinutes: Math.max(0, num(s.activeMinutes, 0)),
            interactions: Math.max(0, num(s.interactions, 0)),
            runs: Math.max(0, num(s.runs, 0)),
            lastSeen: num(s.lastSeen, 0)
        };

        const now = Date.now();
        const first = state.runs === 0;
        const gapMin = state.lastSeen ? Math.max(0, (now - state.lastSeen) / 60000) : 0;

        state.runs++;

        if (!first) {
            // Being away: it missed you a little, and it rested
            state.affection = clamp(state.affection - Math.min((gapMin / 60) * 0.8, 15), 0, 100);
            state.energy = clamp(state.energy + gapMin * 1.5, 0, 100);
        }

        lastInteraction = now;
        lastMove = now;
        prevStage = stage();
        nextRandomAt = now + rand(8000, 14000);
        booted = true;

        greet(first, gapMin);
        saveState();

        // Voice hints
        setTimeout(() => {
            if (!voice.stt) {
                if (voice.problems && voice.problems.length) {
                    say(t("voiceNeedsLibs"), 4000);
                }
            } else if (first) {
                say(t("voiceTip"), 3500);
            }
        }, 6500);
    });
}

if (typeof QWebChannel !== "undefined" && typeof qt !== "undefined") {
    new QWebChannel(qt.webChannelTransport, (channel) => {
        bridge = channel.objects.bridge;

        bridge.voiceStatus((text) => {
            try {
                voice = JSON.parse(text);
            } catch (e) {
            }
            setLanguage(voice.lang || "en");
            boot();
        });
    });
} else {
    setLanguage("en");
    boot();
}
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
        help: "Try: come here, go away, go to sleep, wake up, how are you, what time is it, smile, cry, add task, take a note, start studying, calculate",
        thanks: "You're welcome!",
        love: "I'm happy to be next to you, too!",
        praise: "Aw, thank you!",
        hello: "Hi! Welcome back",
        helloLow: "Hi...",
        bye: "Bye! Come back soon",
        home: "Okay, going away",

        // Student Desk
        toolError: "Sorry, my desk tools aren't working right now",
        deskOpened: "Here's your desk",
        deskClosed: "Okay, closing the desk",
        taskPrompt: "Okay, type your task",
        taskAdded: (x) => `Task added: ${x}`,
        tasksOpen: (n) => (n === 0 ? "You have no open tasks" : n === 1 ? "You have 1 open task" : `You have ${n} open tasks`),
        notePrompt: "Okay, write your note",
        noteSaved: (x) => `Note saved: ${x}`,
        studyStarted: (x) => (x ? `Study timer started for ${x}. Good luck!` : "Study timer started. Good luck!"),
        studyAlready: "The study timer is already running",
        studyStopped: (x) => `Nice work! You studied for ${x}`,
        studyNone: "The study timer isn't running",
        calcPrompt: "Okay, type what to calculate",
        calcResult: (x, r) => `${x} = ${r}`,
        calcSpeech: (r) => `The answer is ${r}`,
        calcFail: "I couldn't calculate that",
        studyStartedAsk: (x) => (x ? `Study timer started for ${x}. Good luck! Do you want me to show the timer?` : "Study timer started. Good luck! Do you want me to show the timer?"),
        studyAlreadyAsk: "The study timer is already running. Do you want me to show the timer?",
        focusStarted: (n) => `Focus mode on for ${n} minutes. I'll tell you when it's break time. Do you want me to show the timer?`,
        focusDone: "Time's up! Great focus. Take a short break",
        timerShown: "Okay, the timer is on me",
        timerHidden: "Okay, I'll keep the timer hidden",
        studyTimeNow: (a, b) => `You've been studying for ${a}. ${b} today in total`,
        studyTimeToday: (x) => `Today you studied for ${x}`,
        studyNoneToday: "You haven't studied yet today"
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
        help: "بگو بیا، برو، بخواب، بیدار شو، حالت چطوره، ساعت چنده، تسک جدید، یادداشت کن، شروع مطالعه، حساب کن، یا بخند و ناراحت شو",
        thanks: "خواهش می‌کنم",
        love: "منم از بودن کنار تو خوشحالم",
        praise: "ای جان! ممنون",
        hello: "سلام! خوش اومدی",
        helloLow: "سلام...",
        bye: "خداحافظ! زود برگرد",
        home: "باشه، می‌رم",

        // Student Desk
        toolError: "ببخشید، ابزارهای میزم الان کار نمی‌کنند",
        deskOpened: "بفرما، میز دانشجو",
        deskClosed: "باشه، میز رو می‌بندم",
        taskPrompt: "باشه، وظیفه‌ات رو بنویس",
        taskAdded: (x) => `وظیفه اضافه شد: ${x}`,
        tasksOpen: (n) => (n === 0 ? "وظیفهٔ بازی نداری" : `${fa(n)} وظیفهٔ باز داری`),
        notePrompt: "باشه، یادداشتت رو بنویس",
        noteSaved: (x) => `یادداشت ذخیره شد: ${x}`,
        studyStarted: (x) => (x ? `تایمر مطالعهٔ ${x} شروع شد. موفق باشی!` : "تایمر مطالعه شروع شد. موفق باشی!"),
        studyAlready: "تایمر مطالعه از قبل روشنه",
        studyStopped: (x) => `آفرین! ${x} مطالعه کردی`,
        studyNone: "تایمر مطالعه روشن نیست",
        calcPrompt: "باشه، چیزی که می‌خوای حساب کنم رو بنویس",
        calcResult: (x, r) => `${x} = ${r}`,
        calcSpeech: (r) => `جواب می‌شود ${r}`,
        calcFail: "نتونستم حساب کنم",
        studyStartedAsk: (x) => (x ? `تایمر مطالعهٔ ${x} شروع شد. موفق باشی! می‌خوای تایمر رو نشونت بدم؟` : "تایمر مطالعه شروع شد. موفق باشی! می‌خوای تایمر رو نشونت بدم؟"),
        studyAlreadyAsk: "تایمر مطالعه از قبل روشنه. می‌خوای تایمر رو نشونت بدم؟",
        focusStarted: (n) => `حالت تمرکز برای ${fa(n)} دقیقه روشن شد. وقت استراحت بهت می‌گم. می‌خوای تایمر رو نشونت بدم؟`,
        focusDone: "وقت تمومه! عالی تمرکز کردی. یه استراحت کوتاه کن",
        timerShown: "باشه، تایمر روی من نشون داده می‌شه",
        timerHidden: "باشه، تایمر پنهان می‌مونه",
        studyTimeNow: (a, b) => `${a} است که داری مطالعه می‌کنی. امروز در کل ${b}`,
        studyTimeToday: (x) => `امروز ${x} مطالعه کردی`,
        studyNoneToday: "امروز هنوز مطالعه نکردی"
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
    if (event.target.closest && event.target.closest("#desk")) return;   // clicks inside the panel
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
    if (deskOpen || isTyping(event.target)) return;    // never while typing / using the desk

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
//                          STUDENT DESK
// =====================================================================
// Notes, Tasks, Study tracker, Calculator and Clipboard history.
// The data lives in Python (offline_tools.py, SQLite); this is only the interface.

const deskEl = document.getElementById("desk");
const deskHead = document.getElementById("desk-head");
const deskToast = document.getElementById("desk-toast");
const deskTabs = [...document.querySelectorAll("#desk-tabs .tab")];
const deskPanels = [...document.querySelectorAll(".tab-panel")];
const TAB_NAMES = deskTabs.map((b) => b.dataset.tab);

let deskOpen = false;
let deskTab = "notes";

const $ = (id) => document.getElementById(id);

const DESK_STR = {
    en: {
        deskTitle: "Student Desk", close: "Close (Esc)",
        tabNotes: "Notes", tabTasks: "Tasks", tabStudy: "Study", tabCalc: "Calc", tabClip: "Clipboard",
        noBridge: "Tools only work inside the Blue Pet app",
        saved: "Saved", today: "Today", tomorrow: "Tomorrow",
        // notes
        noteTitlePh: "Title (optional)", noteBodyPh: "Write your note here…",
        noteSave: "Save", noteNew: "New note", noteHint: "Ctrl+Enter to save",
        noteSearchPh: "Search notes…", notesEmpty: "No notes yet. Write one above!",
        untitled: "Untitled", noteDelete: "Delete", sure: "Sure?",
        // tasks
        taskPh: "New task…", taskAdd: "Add", dueLabel: "Due date", clearDone: "Clear completed",
        tasksEmpty: "Nothing to do. Enjoy!", taskCount: (n, m) => `${n} open · ${m} done`,
        taskEmptyErr: "Write the task first", overdue: "Overdue",
        // study
        studyPh: "What are you studying? (optional)", studyStart: "Start", studyStop: "Stop",
        studyRunning: (s) => `Studying: ${s}`, studyIdle: "Timer stopped", general: "General",
        todayLabel: "Today", weekLabel: "Last 7 days", nothingYet: "Nothing yet",
        badgeToggle: "Show timer on the pet",
        weekTotal: (x) => `Total: ${x}`, hm: (h, m) => (h ? `${h}h ${m}m` : `${m}m`), lessMin: "<1m",
        // calc
        calcPh: "2*(3+4)", calcHint: "Trig functions use radians: sin(radians(30))",
        // clipboard
        clipSearchPh: "Search copied text…", clipHint: "Click an item to copy it again",
        clipClear: "Clear all", clipOn: "Recording: on", clipOff: "Recording: paused",
        clipEmpty: "Nothing copied yet", clipCopied: "Copied again — paste it anywhere",
        copiedLong: (n) => `${n} characters`
    },
    fa: {
        deskTitle: "میز دانشجو", close: "بستن (Esc)",
        tabNotes: "یادداشت", tabTasks: "وظایف", tabStudy: "مطالعه", tabCalc: "ماشین‌حساب", tabClip: "کلیپ‌بورد",
        noBridge: "ابزارها فقط داخل برنامهٔ Blue Pet کار می‌کنند",
        saved: "ذخیره شد", today: "امروز", tomorrow: "فردا",
        noteTitlePh: "عنوان (اختیاری)", noteBodyPh: "یادداشتت رو اینجا بنویس…",
        noteSave: "ذخیره", noteNew: "یادداشت جدید", noteHint: "Ctrl+Enter برای ذخیره",
        noteSearchPh: "جستجو در یادداشت‌ها…", notesEmpty: "هنوز یادداشتی نداری. بالا یکی بنویس!",
        untitled: "بدون عنوان", noteDelete: "حذف", sure: "مطمئنی؟",
        taskPh: "وظیفهٔ جدید…", taskAdd: "افزودن", dueLabel: "مهلت انجام", clearDone: "پاک‌کردن انجام‌شده‌ها",
        tasksEmpty: "کاری نداری. حال کن!", taskCount: (n, m) => `${fa(n)} باز · ${fa(m)} انجام‌شده`,
        taskEmptyErr: "اول وظیفه رو بنویس", overdue: "گذشته",
        studyPh: "چی می‌خونی؟ (اختیاری)", studyStart: "شروع", studyStop: "توقف",
        studyRunning: (s) => `در حال مطالعه: ${s}`, studyIdle: "تایمر متوقف است", general: "عمومی",
        todayLabel: "امروز", weekLabel: "۷ روز اخیر", nothingYet: "هنوز چیزی ثبت نشده",
        badgeToggle: "نمایش تایمر روی پت",
        weekTotal: (x) => `مجموع: ${x}`,
        hm: (h, m) => (h ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(m)} دقیقه`), lessMin: "کمتر از یک دقیقه",
        calcPh: "2*(3+4)", calcHint: "توابع مثلثاتی رادیان می‌گیرند: sin(radians(30))",
        clipSearchPh: "جستجو در متن‌های کپی‌شده…", clipHint: "روی یک مورد کلیک کن تا دوباره کپی شود",
        clipClear: "پاک‌کردن همه", clipOn: "ضبط: روشن", clipOff: "ضبط: متوقف",
        clipEmpty: "هنوز چیزی کپی نشده", clipCopied: "دوباره کپی شد — هرجا خواستی Paste کن",
        copiedLong: (n) => `${fa(n)} نویسه`
    }
};

function d(key, ...args) {
    const table = DESK_STR[LANG] || DESK_STR.en;
    const value = table[key] !== undefined ? table[key] : DESK_STR.en[key];
    return typeof value === "function" ? value(...args) : value;
}

function applyDeskLanguage() {
    deskEl.dir = LANG === "fa" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = d(n.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((n) => (n.placeholder = d(n.dataset.i18nPh)));
    document.querySelectorAll("[data-i18n-title]").forEach((n) => (n.title = d(n.dataset.i18nTitle)));
    if (deskOpen) showTab(deskTab);
    else renderStudyButton();
}

// ----- small helpers -----

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
}

function tool(name, ...args) {
    return new Promise((resolve) => {
        if (!bridge || !bridge.callTool) {
            resolve({ok: false, error: d("noBridge")});
            return;
        }
        try {
            bridge.callTool(name, JSON.stringify(args), (text) => {
                try {
                    resolve(JSON.parse(text));
                } catch (e) {
                    resolve({ok: false, error: String(e)});
                }
            });
        } catch (e) {
            resolve({ok: false, error: String(e)});
        }
    });
}

let toastTimer = null;

function toast(text, bad) {
    deskToast.textContent = text;
    deskToast.classList.toggle("bad", !!bad);
    deskToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => deskToast.classList.remove("show"), 2200);
}

// Two-step button: the first click asks "Sure?", the second one runs the action
function confirmClick(button, action) {
    let armed = false;
    let timer = null;
    let label = "";
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!armed) {
            armed = true;
            label = button.textContent;
            button.textContent = d("sure");
            button.classList.add("confirm");
            timer = setTimeout(() => {
                armed = false;
                button.textContent = label;
                button.classList.remove("confirm");
            }, 3000);
        } else {
            clearTimeout(timer);
            action();
        }
    });
}

const locale = () => (LANG === "fa" ? "fa-IR" : "en-US");

function formatStamp(seconds) {
    return new Date(seconds * 1000).toLocaleString(locale(), {dateStyle: "short", timeStyle: "short"});
}

function localDateString(date) {
    const p = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function parseLocalDate(text) {
    const [y, m, day] = text.split("-").map(Number);
    return new Date(y, m - 1, day);
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    if (total < 60) return total === 0 ? d("hm", 0, 0) : d("lessMin");
    return d("hm", Math.floor(total / 3600), Math.floor((total % 3600) / 60));
}

// ----- opening / closing -----

function isTyping(target) {
    return !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" || target.isContentEditable);
}

function showTab(name) {
    if (!TAB_NAMES.includes(name)) name = "notes";
    deskTab = name;
    deskTabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    deskPanels.forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));

    if (name === "notes") loadNotes();
    else if (name === "tasks") loadTasks();
    else if (name === "study") loadStudy();
    else if (name === "calc") setTimeout(() => calcInput.focus(), 0);
    else if (name === "clipboard") loadClipboard();
}

function setDeskOpen(open, tab) {
    if (tab && TAB_NAMES.includes(tab)) deskTab = tab;

    if (open === deskOpen) {
        if (open && tab) showTab(tab);
        return;
    }
    deskOpen = open;
    deskEl.hidden = !open;
    document.body.classList.toggle("desk-open", open);
    if (bridge && bridge.setDeskOpen) bridge.setDeskOpen(open);
    if (open) showTab(deskTab);
    else if (document.activeElement && deskEl.contains(document.activeElement)) {
        document.activeElement.blur();
    }
}

function openDesk(tab) {
    setDeskOpen(true, tab);
}

function refreshDesk(tab) {
    if (deskOpen && deskTab === tab) showTab(tab);
}

deskTabs.forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
$("desk-close").addEventListener("click", () => setDeskOpen(false));

// The header is a handle for moving the window
deskHead.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    if (bridge) bridge.startMove();
});

// P opens the panel, Escape closes it
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && deskOpen) {
        event.preventDefault();
        setDeskOpen(false);
        return;
    }
    if (event.code === "KeyP" && !deskOpen && booted && !isTyping(event.target) &&
        !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openDesk();
    }
});

// ===================================================================== Notes

const noteTitle = $("note-title");
const noteBody = $("note-body");
const noteSearch = $("note-search");
const notesList = $("notes-list");
let notesCache = [];
let editingNoteId = null;

async function loadNotes() {
    const r = await tool("notes_list", noteSearch.value);
    if (!r.ok) return toast(r.error, true);
    notesCache = r.data;
    renderNotes();
}

function renderNotes() {
    notesList.replaceChildren();
    if (!notesCache.length) {
        notesList.append(el("div", "empty", d("notesEmpty")));
        return;
    }
    for (const note of notesCache) {
        const item = el("div", "item clickable" + (note.id === editingNoteId ? " selected" : ""));
        const main = el("div", "main");
        main.append(
            el("div", "name", note.title || d("untitled")),
            el("div", "sub", note.body.replace(/\s+/g, " ").slice(0, 90) || "—"),
            el("div", "sub", formatStamp(note.updated_at))
        );
        const del = el("button", "x-btn", d("noteDelete"));
        del.type = "button";
        confirmClick(del, async () => {
            const r = await tool("note_delete", note.id);
            if (!r.ok) return toast(r.error, true);
            if (editingNoteId === note.id) newNote();
            loadNotes();
        });
        item.append(main, del);
        item.addEventListener("click", () => {
            editingNoteId = note.id;
            noteTitle.value = note.title;
            noteBody.value = note.body;
            renderNotes();
        });
        notesList.append(item);
    }
}

function newNote() {
    editingNoteId = null;
    noteTitle.value = "";
    noteBody.value = "";
    renderNotes();
    noteBody.focus();
}

async function saveNote() {
    const r = await tool("note_save", editingNoteId, noteTitle.value, noteBody.value);
    if (!r.ok) {
        toast(r.error, true);
        return;
    }
    editingNoteId = r.data.id;
    toast(d("saved"));
    loadNotes();
}

$("note-save").addEventListener("click", saveNote);
$("note-new").addEventListener("click", newNote);
noteSearch.addEventListener("input", loadNotes);
noteBody.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveNote();
    }
});

// ===================================================================== Tasks

const taskTitle = $("task-title");
const taskDue = $("task-due");
const tasksList = $("tasks-list");
let tasksCache = [];

async function loadTasks() {
    const r = await tool("tasks_list");
    if (!r.ok) return toast(r.error, true);
    tasksCache = r.data;
    renderTasks();
}

function dueBadge(task) {
    if (!task.due) return null;
    const today = localDateString(new Date());
    const tomorrow = localDateString(new Date(Date.now() + 86400000));
    const shown = parseLocalDate(task.due).toLocaleDateString(locale(), {month: "short", day: "numeric"});

    if (task.done) return el("span", "badge", shown);
    if (task.due < today) return el("span", "badge overdue", `${d("overdue")} · ${shown}`);
    if (task.due === today) return el("span", "badge today", d("today"));
    if (task.due === tomorrow) return el("span", "badge", d("tomorrow"));
    return el("span", "badge", shown);
}

function renderTasks() {
    tasksList.replaceChildren();
    const open = tasksCache.filter((x) => !x.done).length;
    $("task-count").textContent = d("taskCount", open, tasksCache.length - open);

    if (!tasksCache.length) {
        tasksList.append(el("div", "empty", d("tasksEmpty")));
        return;
    }
    for (const task of tasksCache) {
        const item = el("div", "item task" + (task.done ? " done" : ""));

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!task.done;
        box.addEventListener("change", async () => {
            const r = await tool("task_toggle", task.id);
            if (!r.ok) toast(r.error, true);
            else if (r.data.done) {
                gain(0.4);
                scheduleSave();
            }
            loadTasks();
        });

        const main = el("div", "main");
        main.append(el("div", "name", task.title));
        item.append(box, main);

        const badge = dueBadge(task);
        if (badge) item.append(badge);

        const del = el("button", "x-btn", "✕");
        del.type = "button";
        del.addEventListener("click", async () => {
            const r = await tool("task_delete", task.id);
            if (!r.ok) toast(r.error, true);
            loadTasks();
        });
        item.append(del);
        tasksList.append(item);
    }
}

async function addTask() {
    const title = taskTitle.value.trim();
    if (!title) return toast(d("taskEmptyErr"), true);
    const r = await tool("task_add", title, taskDue.value || null);
    if (!r.ok) return toast(r.error, true);
    taskTitle.value = "";
    taskDue.value = "";
    loadTasks();
}

$("task-add").addEventListener("click", addTask);
taskTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
});
$("task-clear").addEventListener("click", async () => {
    const r = await tool("tasks_clear_done");
    if (!r.ok) toast(r.error, true);
    loadTasks();
});

// ===================================================================== Study tracker

const studySubject = $("study-subject");
const studyToggle = $("study-toggle");
let study = {active: false, subject: "", elapsed: 0};
let studyFetchedAt = Date.now();
let studyTicks = 0;

function studyElapsed() {
    return study.active ? study.elapsed + (Date.now() - studyFetchedAt) / 1000 : 0;
}

function clockText(seconds) {
    const s = Math.floor(seconds);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function renderStudyButton() {
    studyToggle.textContent = study.active ? d("studyStop") : d("studyStart");
    studyToggle.classList.toggle("danger", study.active);
    studyToggle.classList.toggle("primary", !study.active);
}

function renderStudyClock() {
    $("study-clock").textContent = clockText(studyElapsed());
    $("study-state").textContent = study.active
        ? d("studyRunning", study.subject || d("general"))
        : d("studyIdle");
    renderStudyButton();
}

function setStudy(data) {
    study = {active: !!data.active, subject: data.subject || "", elapsed: data.elapsed || 0};
    studyFetchedAt = Date.now();
    if (study.active && !studySubject.value) studySubject.value = study.subject;
    if (!study.active) badgeWanted = false;
    renderStudyClock();
    updateStudyBadge();
}

function renderSubjects(container, subjects) {
    container.replaceChildren();
    if (!subjects.length) {
        container.append(el("div", "muted", d("nothingYet")));
        return;
    }
    for (const s of subjects) {
        const line = el("div", "subject-line");
        line.append(el("span", "", s.subject || d("general")), el("span", "", formatDuration(s.seconds)));
        container.append(line);
    }
}

function renderReport(report) {
    const today = $("study-today");
    today.replaceChildren(el("div", "", formatDuration(report.today.seconds)));
    const sub = el("div");
    renderSubjects(sub, report.today.subjects);
    today.append(sub);

    $("study-week").textContent = d("weekTotal", formatDuration(report.range.seconds));

    const bars = $("study-bars");
    bars.replaceChildren();
    const max = Math.max(1, ...report.range.days.map((x) => x.seconds));
    for (const day of report.range.days) {
        const col = el("div", "bar-col");
        col.title = `${day.date} · ${formatDuration(day.seconds)}`;
        const bar = el("div", "bar" + (day.seconds === 0 ? " zero" : ""));
        bar.style.height = Math.round((day.seconds / max) * 100) + "%";
        const label = parseLocalDate(day.date).toLocaleDateString(locale(), {weekday: "short"});
        col.append(bar, el("div", "bar-label", label));
        bars.append(col);
    }
}

async function loadStudy() {
    const [status, report] = await Promise.all([tool("study_status"), tool("study_report", 7)]);
    if (status.ok) setStudy(status.data);
    if (report.ok) renderReport(report.data);
}

studyToggle.addEventListener("click", async () => {
    if (study.active) {
        clearTimeout(focusTimer);
        const r = await tool("study_stop");
        if (!r.ok) toast(r.error, true);
    } else {
        const r = await tool("study_start", studySubject.value);
        if (!r.ok) toast(r.error, true);
    }
    loadStudy();
});

// Live clock (only while the panel shows the Study tab)
setInterval(() => {
    if (!deskOpen || deskTab !== "study") return;
    renderStudyClock();
    if (study.active && ++studyTicks % 30 === 0) loadStudy();
}, 1000);

// ----- Study timer shown on the pet (the pet asks before showing it) -----

const studyBadge = $("study-badge");
let badgeWanted = false;

function updateStudyBadge() {
    const show = badgeWanted && study.active;
    studyBadge.hidden = !show;
    if (show) studyBadge.textContent = clockText(studyElapsed());
    $("study-badge-toggle").classList.toggle("primary", badgeWanted);
}

function showStudyBadge(on) {
    badgeWanted = !!on;
    updateStudyBadge();
}

$("study-badge-toggle").addEventListener("click", () => showStudyBadge(!badgeWanted));

let badgeTicks = 0;
setInterval(async () => {
    updateStudyBadge();
    if ((badgeWanted || study.active) && ++badgeTicks % 30 === 0) {
        const r = await tool("study_status");
        if (r.ok) setStudy(r.data);
    }
}, 1000);

// ===================================================================== Calculator

const calcInput = $("calc-input");
const calcResult = $("calc-result");
const calcKeys = $("calc-keys");
const calcHistory = $("calc-history");
let calcHist = [];
let calcFresh = false;      // the last thing done was "="
let calcLast = "";

const CALC_KEYS = [
    ["C", "clear", "fn"], ["(", "(", "op"], [")", ")", "op"], ["⌫", "back", "fn"], ["÷", "/", "op"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["sqrt", "sqrt(", "fn"], ["×", "*", "op"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["^", "^", "op"], ["−", "-", "op"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["%", "%", "op"], ["+", "+", "op"],
    ["0", "0"], [".", "."], ["π", "pi", "fn"], ["sin", "sin(", "fn"], ["=", "equals", "primary"]
];
const CALC_OPERATORS = ["/", "*", "^", "-", "%", "+"];

function showCalc(text, isError) {
    calcResult.textContent = text;
    calcResult.classList.toggle("error", !!isError);
}

function insertCalc(text) {
    const start = calcInput.selectionStart;
    const end = calcInput.selectionEnd;
    calcInput.setRangeText(text, start, end, "end");
    calcInput.focus();
}

function pressCalcKey(value) {
    if (value === "clear") {
        calcInput.value = "";
        showCalc("\u00a0");
        calcFresh = false;
    } else if (value === "back") {
        calcInput.value = calcInput.value.slice(0, -1);
    } else if (value === "equals") {
        runCalc();
    } else {
        if (calcFresh) {
            calcInput.value = CALC_OPERATORS.includes(value) ? calcLast : "";
            calcFresh = false;
        }
        insertCalc(value);
    }
}

CALC_KEYS.forEach(([label, value, kind]) => {
    const b = el("button", "btn" + (kind ? " " + kind : ""), label);
    b.type = "button";
    b.addEventListener("click", () => pressCalcKey(value));
    calcKeys.append(b);
});

async function runCalc(expression) {
    const text = (expression !== undefined ? expression : calcInput.value).trim();
    if (!text) return null;
    const r = await tool("calculate", text);
    if (!r.ok) {
        showCalc(r.error, true);
        return null;
    }
    calcLast = r.data.result;
    calcFresh = true;
    showCalc(`= ${r.data.result}`);
    calcHist.unshift({expression: r.data.expression, result: r.data.result});
    calcHist = calcHist.slice(0, 20);
    renderCalcHistory();
    return r.data;
}

function renderCalcHistory() {
    calcHistory.replaceChildren();
    for (const h of calcHist) {
        const item = el("div", "item clickable");
        item.style.direction = "ltr";
        item.append(el("div", "main sub", `${h.expression} = ${h.result}`));
        item.addEventListener("click", () => {
            calcInput.value = h.result;
            calcFresh = false;
            calcInput.focus();
        });
        calcHistory.append(item);
    }
}

calcInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCalc();
    else calcFresh = false;
});

// ===================================================================== Clipboard history

const clipList = $("clip-list");
const clipSearch = $("clip-search");
const clipToggle = $("clip-toggle");
let clipEnabled = true;

function renderClipToggle() {
    clipToggle.textContent = clipEnabled ? d("clipOn") : d("clipOff");
}

async function loadClipboard() {
    const r = await tool("clipboard_list", clipSearch.value);
    if (!r.ok) return toast(r.error, true);
    clipEnabled = r.data.enabled;
    renderClipToggle();

    clipList.replaceChildren();
    if (!r.data.items.length) {
        clipList.append(el("div", "empty", d("clipEmpty")));
        return;
    }
    for (const clip of r.data.items) {
        const item = el("div", "item clickable");
        const main = el("div", "main");
        const text = el("div", "clip-text", clip.text);
        text.style.direction = "auto";
        const info = clip.length > clip.text.length ? ` · ${d("copiedLong", clip.length)}` : "";
        main.append(text, el("div", "sub", formatStamp(clip.created_at) + info));

        const del = el("button", "x-btn", "✕");
        del.type = "button";
        del.addEventListener("click", async (event) => {
            event.stopPropagation();
            const res = await tool("clipboard_delete", clip.id);
            if (!res.ok) toast(res.error, true);
            loadClipboard();
        });

        item.append(main, del);
        item.addEventListener("click", async () => {
            const res = await tool("clipboard_activate", clip.id);
            if (!res.ok) return toast(res.error, true);
            toast(d("clipCopied"));
            setTimeout(loadClipboard, 150);
        });
        clipList.append(item);
    }
}

clipSearch.addEventListener("input", loadClipboard);
clipToggle.addEventListener("click", async () => {
    const r = await tool("clipboard_set_enabled", !clipEnabled);
    if (!r.ok) return toast(r.error, true);
    loadClipboard();
});
confirmClick($("clip-clear"), async () => {
    const r = await tool("clipboard_clear");
    if (!r.ok) toast(r.error, true);
    loadClipboard();
});

// Python tells us when something new was copied
window.deskEvent = function (kind) {
    if (kind === "clipboard" && deskOpen && deskTab === "clipboard") loadClipboard();
};

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

    applyDeskLanguage();
}

function findCommand(norm) {
    const padded = " " + norm + " ";
    for (const c of COMMANDS) {
        // the longest matching phrase wins (so "start study timer" beats "start study")
        const hits = c.norm.filter((w) => w && padded.includes(" " + w + " "));
        if (hits.length) {
            c.matched = hits.sort((a, b) => b.length - a.length)[0];
            return c;
        }
    }
    return null;
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// What was said AFTER the command phrase: "add task buy milk" -> "buy milk".
// Uses the original text (keeps capitals, numbers and symbols); falls back to the cleaned text.
function commandTail(cmd, raw, norm) {
    const phrase = cmd.matched || "";
    let tail = "";

    if (phrase) {
        const words = phrase.split(" ").map(escapeRegExp).join("[\\s,.;:'’\\-]+");
        const re = new RegExp("(?:^|[\\s,.;:!?])" + words + "(?:[\\s,.;:!?\\-]+([\\s\\S]*))?$", "iu");
        const m = re.exec(String(raw || ""));
        if (m) tail = m[1] || "";
        else {
            const padded = " " + norm + " ";
            const at = padded.indexOf(" " + phrase + " ");
            if (at >= 0) tail = padded.slice(at + phrase.length + 2).trim();
        }
    }
    return tail.trim().replace(/[.!?؟]+$/, "").trim();
}

// "for math" / "on math" -> "math"
function cleanSubject(text) {
    return text.replace(/^(?:for|on|of|about|session|timer|now|برای|روی)\s+/iu, "").trim();
}

// Turns "2 plus 3 times 4" into "2 + 3 * 4"
function spokenToExpr(text) {
    let s = " " + wordsToNumbers(String(text || "").toLowerCase().replace(/[?؟=]/g, " ")) + " ";
    const table = LANG === "fa"
        ? [["بعلاوه", "+"], ["به علاوه", "+"], ["مثبت", "+"], ["منفی", "-"], ["ضرب در", "*"],
            ["ضربدر", "*"], ["تقسیم بر", "/"], ["به توان", "^"], ["مجذور", "^2"]]
        : [["to the power of", "^"], ["raised to", "^"], ["multiplied by", "*"], ["times", "*"],
            ["divided by", "/"], ["over", "/"], ["plus", "+"], ["minus", "-"],
            ["squared", "^2"], ["cubed", "^3"]];
    for (const [from, to] of table) s = s.split(" " + from + " ").join(" " + to + " ");
    s = s.replace(/square root of\s+(\d+(?:\.\d+)?)/g, "sqrt($1)");
    return s.replace(/\s+/g, " ").trim();
}

function humanDuration(seconds) {
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (LANG === "fa") {
        if (total < 60) return "کمتر از یک دقیقه";
        return h ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(m)} دقیقه`;
    }
    if (total < 60) return "less than a minute";
    const hs = h ? `${h} hour${h === 1 ? "" : "s"}` : "";
    const ms = m ? `${m} minute${m === 1 ? "" : "s"}` : "";
    return [hs, ms].filter(Boolean).join(" ");
}

// ----- Student Desk by voice -----

function toolFailed(r) {
    reply(r && r.error ? r.error : t("toolError"), "sad", t("toolError"));
}

async function voiceAddTask(text) {
    if (!text) {
        openDesk("tasks");
        setTimeout(() => taskTitle.focus(), 50);
        reply(t("taskPrompt"), "happy");
        return;
    }
    const r = await tool("task_add", text, null);
    if (!r.ok) return toolFailed(r);
    reply(t("taskAdded", r.data.title), "happy");
    refreshDesk("tasks");
}

async function voiceAddNote(text) {
    if (!text) {
        openDesk("notes");
        setTimeout(() => noteBody.focus(), 50);
        reply(t("notePrompt"), "happy");
        return;
    }
    const r = await tool("note_save", null, "", text);
    if (!r.ok) return toolFailed(r);
    reply(t("noteSaved", r.data.title), "happy");
    refreshDesk("notes");
}

async function voiceStartStudy(subject) {
    const r = await tool("study_start", cleanSubject(subject));
    if (!r.ok) return toolFailed(r);
    setStudy(r.data);
    // Ask before showing the timer on the pet
    if (r.data.already) askShowTimer("studyAlreadyAsk");
    else askShowTimer("studyStartedAsk", r.data.subject);
    refreshDesk("study");
}

async function voiceStopStudy() {
    clearTimeout(focusTimer);
    const r = await tool("study_stop");
    if (!r.ok) return toolFailed(r);
    setStudy({active: false});
    if (!r.data.stopped) reply(t("studyNone"), "thinking");
    else {
        gain(0.5);
        scheduleSave();
        reply(t("studyStopped", humanDuration(r.data.seconds)), "happy");
    }
    refreshDesk("study");
}

async function voiceTasks() {
    const r = await tool("tasks_list");
    if (!r.ok) return toolFailed(r);
    openDesk("tasks");
    reply(t("tasksOpen", r.data.filter((x) => !x.done).length), "thinking");
}

async function voiceCalculate(text) {
    const expr = spokenToExpr(text);
    if (!expr) {
        openDesk("calc");
        reply(t("calcPrompt"), "thinking");
        return;
    }
    const r = await tool("calculate", expr);
    if (!r.ok) {
        reply(t("calcFail"), "sad");
        return;
    }
    reply(t("calcResult", r.data.expression, r.data.result), "excited", t("calcSpeech", r.data.result));
    if (deskOpen && deskTab === "calc") {
        calcInput.value = r.data.expression;
        showCalc(`= ${r.data.result}`);
    }
}

// Desk commands come FIRST so that the text of a note or task (which may contain words
// like "go" or "hi") is not mistaken for another command.
function openTabCommand(id, en, fa) {
    return {
        id: "desk-" + id,
        words: {en, fa},
        run() {
            openDesk(id);
            reply(t("deskOpened"), "happy");
        }
    };
}

const DESK_COMMANDS = [
    {
        id: "desk-add-task",
        words: {
            en: ["add a task", "add task", "new task", "create a task", "create task", "remind me to"],
            fa: ["تسک جدید", "وظیفه جدید", "کار جدید", "تسک اضافه کن", "یه تسک اضافه کن",
                "وظیفه اضافه کن", "کار اضافه کن", "یادم بنداز"]
        },
        run(norm, raw) { voiceAddTask(commandTail(this, raw, norm)); }
    },
    {
        id: "desk-note",
        words: {
            en: ["take a note", "take note", "write a note", "make a note", "new note", "note that"],
            fa: ["یادداشت کن", "یادداشت بنویس", "یادداشت جدید", "یه یادداشت بنویس", "یادداشت بردار", "نوت بردار"]
        },
        run(norm, raw) { voiceAddNote(commandTail(this, raw, norm)); }
    },
    {
        id: "desk-timer-show",
        words: {
            en: ["show the timer", "show timer", "show study timer", "show the study timer"],
            fa: ["تایمر رو نشون بده", "نشون بده تایمر", "تایمر نشون بده"]
        },
        run() {
            if (!study.active) reply(t("studyNone"), "thinking");
            else {
                showStudyBadge(true);
                reply(t("timerShown"), "happy");
            }
        }
    },
    {
        id: "desk-timer-hide",
        words: {
            en: ["hide the timer", "hide timer", "hide study timer", "hide the study timer"],
            fa: ["تایمر رو پنهان کن", "تایمر رو مخفی کن", "تایمر نشون نده"]
        },
        run() {
            showStudyBadge(false);
            reply(t("timerHidden"), "happy");
        }
    },
    {
        id: "desk-study-time",
        words: {
            en: ["how long have i studied", "how long have i been studying", "how much did i study",
                "how much have i studied"],
            fa: ["چقدر مطالعه کردم", "چند ساعت مطالعه کردم", "چقدر درس خوندم"]
        },
        run() { voiceStudyTime(); }
    },
    {
        id: "desk-focus",
        words: {
            en: ["start focus", "focus mode", "focus session", "start a focus session", "pomodoro",
                "start pomodoro", "lets focus", "help me focus", "i need to focus"],
            fa: ["شروع تمرکز", "حالت تمرکز", "فوکس کن", "شروع فوکس", "پومودورو", "کمکم کن تمرکز کنم"]
        },
        run(norm, raw) { voiceFocus(commandTail(this, raw, norm)); }
    },
    {
        id: "desk-stop-study",
        words: {
            en: ["stop studying", "stop study", "stop the study timer", "stop study timer",
                "finish studying", "end study session", "done studying", "im done studying"],
            fa: ["پایان مطالعه", "توقف مطالعه", "مطالعه تموم شد", "مطالعه رو تموم کن",
                "مطالعه رو متوقف کن", "تایمر مطالعه رو متوقف کن"]
        },
        run() { voiceStopStudy(); }
    },
    {
        id: "desk-start-study",
        words: {
            en: ["start studying", "begin studying", "start study", "start study timer",
                "start the study timer", "study timer"],
            fa: ["شروع مطالعه", "شروع به مطالعه", "مطالعه رو شروع کن", "شروع درس",
                "شروع تایمر مطالعه", "تایمر مطالعه"]
        },
        run(norm, raw) { voiceStartStudy(commandTail(this, raw, norm)); }
    },
    {
        id: "desk-calc",
        words: {
            en: ["calculate", "compute", "how much is"],
            fa: ["حساب کن", "محاسبه کن", "چند میشه"]
        },
        run(norm, raw) { voiceCalculate(commandTail(this, raw, norm)); }
    },
    {
        id: "desk-close",
        words: {
            en: ["close desk", "close the desk", "hide desk", "close student desk", "hide student desk"],
            fa: ["میز رو ببند", "پنل رو ببند", "بستن میز"]
        },
        run() {
            setDeskOpen(false);
            reply(t("deskClosed"), "happy");
        }
    },
    {
        id: "desk-open",
        words: {
            en: ["open desk", "open the desk", "open my desk", "show desk", "student desk",
                "open student desk", "show student desk"],
            fa: ["میز دانشجو", "میز مطالعه", "میز رو باز کن", "پنل رو باز کن"]
        },
        run() {
            openDesk();
            reply(t("deskOpened"), "happy");
        }
    },
    {
        id: "desk-tasks",
        words: {
            en: ["show tasks", "show my tasks", "open tasks", "my tasks", "to do list"],
            fa: ["تسک ها", "تسک هام", "وظیفه ها", "وظایف", "لیست کارها", "کارهام"]
        },
        run() { voiceTasks(); }
    },
    openTabCommand("notes",
        ["show notes", "show my notes", "open notes", "my notes"],
        ["یادداشت ها", "یادداشتام", "یادداشت هام"]),
    openTabCommand("study",
        ["study report", "show study report", "study stats", "open study"],
        ["گزارش مطالعه", "آمار مطالعه", "مطالعه امروز"]),
    openTabCommand("calc",
        ["open calculator", "show calculator"],
        ["ماشین حساب"]),
    openTabCommand("clipboard",
        ["show clipboard", "open clipboard", "clipboard history"],
        ["کلیپ بورد", "کلیپبورد", "تاریخچه کپی"])
];
// ----- Questions the pet asks, and answers it waits for -----
// ask(handler): the NEXT sentence goes to handler(norm, raw) first.
// The handler returns true when it used the sentence (it can call ask() again to keep going),
// or false to let the sentence be handled as a normal command.

let pending = null;

function ask(handler, ms) {
    pending = {handler, until: Date.now() + (ms || 25000)};
}

const L = (en, fa) => (LANG === "fa" ? fa : en);

const YES_WORDS = {
    en: ["yes", "yeah", "yep", "yup", "sure", "ok", "okay", "please", "of course", "why not", "show it", "show me", "do it"],
    fa: ["آره", "اره", "بله", "باشه", "حتما", "اوکی", "نشون بده", "نشونم بده", "آری", "بزن"]
};
const NO_WORDS = {
    en: ["no", "nope", "nah", "no thanks", "no thank you", "dont", "not now", "hide it", "dont show"],
    fa: ["نه", "نخواد", "لازم نیست", "نمیخوام", "نمی خوام", "بیخیال", "نشون نده"]
};

// "yes" / "no" / null  (only short answers count)
function yesNo(norm) {
    if (!norm || norm.split(" ").length > 5) return null;
    const padded = " " + norm + " ";
    const has = (list) => list.map(normalizeText).some((w) => w && padded.includes(" " + w + " "));
    if (has(NO_WORDS[LANG] || NO_WORDS.en)) return "no";
    if (has(YES_WORDS[LANG] || YES_WORDS.en)) return "yes";
    return null;
}

// ----- Spoken numbers ("twenty five" -> 25) -----

const NUMBER_WORDS = {
    en: {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
        eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
        seventy: 70, eighty: 80, ninety: 90
    },
    fa: {
        صفر: 0, یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10,
        یازده: 11, دوازده: 12, سیزده: 13, چهارده: 14, پانزده: 15, شانزده: 16, هفده: 17, هجده: 18,
        نوزده: 19, بیست: 20, سی: 30, چهل: 40, پنجاه: 50, شصت: 60, هفتاد: 70, هشتاد: 80, نود: 90,
        صد: 100, دویست: 200, سیصد: 300, چهارصد: 400, پانصد: 500, ششصد: 600, هفتصد: 700,
        هشتصد: 800, نهصد: 900
    }
};

function wordsToNumbers(text) {
    const table = NUMBER_WORDS[LANG] || NUMBER_WORDS.en;
    const thousand = LANG === "fa" ? "هزار" : "thousand";
    const hundred = LANG === "fa" ? null : "hundred";
    const joiner = LANG === "fa" ? "و" : "and";
    const tokens = String(text || "").split(/\s+/).filter(Boolean);
    const out = [];
    let active = false, total = 0, cur = 0;

    const flush = () => {
        if (active) out.push(String(total + cur));
        active = false;
        total = 0;
        cur = 0;
    };

    tokens.forEach((w, i) => {
        if (Object.prototype.hasOwnProperty.call(table, w)) {
            active = true;
            cur += table[w];
        } else if (active && w === hundred) {
            cur = (cur || 1) * 100;
        } else if (active && w === thousand) {
            total += (cur || 1) * 1000;
            cur = 0;
        } else if (active && w === joiner && Object.prototype.hasOwnProperty.call(table, tokens[i + 1])) {
            // "twenty and five" / "بیست و پنج": keep going
        } else {
            flush();
            out.push(w);
        }
    });
    flush();
    return out.join(" ");
}

function toAsciiDigits(text) {
    return String(text || "").replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c));
}

// ----- Study timer shown on the pet (asks first) -----

function timerAnswer(norm) {
    const answer = yesNo(norm);
    if (answer === "yes") {
        showStudyBadge(true);
        reply(t("timerShown"), "happy");
        return true;
    }
    if (answer === "no") {
        showStudyBadge(false);
        reply(t("timerHidden"), "happy");
        return true;
    }
    return false;
}

function askShowTimer(textKey, ...args) {
    reply(t(textKey, ...args), "excited");
    ask(timerAnswer);
}

let focusTimer = null;

async function voiceFocus(tail) {
    const numbers = toAsciiDigits(wordsToNumbers(tail));
    const m = /(\d+)/.exec(numbers);
    const minutes = m ? Math.min(180, Math.max(1, parseInt(m[1], 10))) : 25;

    const r = await tool("study_start", L("Focus", "تمرکز"));
    if (!r.ok) return toolFailed(r);
    setStudy(r.data);

    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
        focusTimer = null;
        reply(t("focusDone"), "excited");
    }, minutes * 60000);

    askShowTimer("focusStarted", minutes);
}

async function voiceStudyTime() {
    const [status, report] = await Promise.all([tool("study_status"), tool("study_report", 1)]);
    if (!status.ok || !report.ok) return toolFailed(status.ok ? report : status);
    const today = report.data.today.seconds;
    if (status.data.active) {
        reply(t("studyTimeNow", humanDuration(status.data.elapsed), humanDuration(today)), "thinking");
    } else if (today > 0) {
        reply(t("studyTimeToday", humanDuration(today)), "happy");
    } else {
        reply(t("studyNoneToday"), "thinking");
    }
}

// ----- Small games -----

function rollDice() {
    const n = 1 + Math.floor(Math.random() * 6);
    reply(L(`You rolled a ${n}!`, `تاس ${fa(n)} اومد!`), "excited");
}

function flipCoin() {
    const heads = Math.random() < 0.5;
    reply(heads ? L("Heads!", "شیر!") : L("Tails!", "خط!"), "excited");
}

const RPS_WORDS = {
    en: {rock: ["rock"], paper: ["paper"], scissors: ["scissors", "scissor"]},
    fa: {rock: ["سنگ"], paper: ["کاغذ"], scissors: ["قیچی"]}
};
const RPS_NAMES = {
    en: {rock: "rock", paper: "paper", scissors: "scissors"},
    fa: {rock: "سنگ", paper: "کاغذ", scissors: "قیچی"}
};
const RPS_BEATS = {rock: "scissors", paper: "rock", scissors: "paper"};

function wantsToStop(norm) {
    return yesNo(norm) === "no" || / (stop|quit|enough|done|بسه|تمام) /.test(" " + norm + " ");
}

function rpsAnswer(norm) {
    if (norm.split(" ").length > 4) return false;      // a long sentence is a normal command
    const padded = " " + norm + " ";
    let mine = null;
    for (const [key, list] of Object.entries(RPS_WORDS[LANG] || RPS_WORDS.en)) {
        if (list.some((w) => padded.includes(" " + normalizeText(w) + " "))) mine = key;
    }
    if (!mine) {
        if (wantsToStop(norm)) {
            reply(L("Okay, that was fun!", "باشه، خوش گذشت!"), "happy");
            return true;
        }
        return false;
    }

    const names = RPS_NAMES[LANG] || RPS_NAMES.en;
    const pet = pick(["rock", "paper", "scissors"]);
    let text, mood;
    if (mine === pet) {
        text = L("It's a tie!", "مساوی شدیم!");
        mood = "thinking";
    } else if (RPS_BEATS[mine] === pet) {
        text = L("You win!", "تو بردی!");
        mood = "surprised";
    } else {
        text = L("I win!", "من بردم!");
        mood = "excited";
    }
    reply(L(`I pick ${names[pet]}. ${text} Again?`, `من ${names[pet]} رو انتخاب کردم. ${text} دوباره؟`), mood);
    ask(rpsAnswer, 20000);
    return true;
}

function startRps() {
    reply(L("Okay! Say rock, paper or scissors", "باشه! بگو سنگ، کاغذ یا قیچی"), "excited");
    ask(rpsAnswer, 20000);
}

function startGuess() {
    const secret = 1 + Math.floor(Math.random() * 10);
    let tries = 0;

    const guessAnswer = (norm) => {
        if (norm.split(" ").length > 3) return false;   // a long sentence is a normal command
        const m = /\d+/.exec(toAsciiDigits(wordsToNumbers(norm)));
        if (!m) {
            if (wantsToStop(norm)) {
                reply(L(`Okay! It was ${secret}`, `باشه! عدد ${fa(secret)} بود`), "happy");
                return true;
            }
            return false;
        }
        const n = parseInt(m[0], 10);
        tries++;
        if (n === secret) {
            gain(0.8);
            scheduleSave();
            reply(L(`Yes! It was ${secret}. You got it in ${tries}!`,
                `آفرین! عدد ${fa(secret)} بود. تو ${fa(tries)} بار پیداش کردی!`), "excited");
            return true;
        }
        if (tries >= 5) {
            reply(L(`Out of tries! It was ${secret}`, `فرصتت تموم شد! عدد ${fa(secret)} بود`), "happy");
            return true;
        }
        reply(n < secret ? L("Higher!", "بزرگ‌تر!") : L("Lower!", "کوچک‌تر!"), "thinking");
        ask(guessAnswer, 20000);
        return true;
    };

    reply(L("I'm thinking of a number from 1 to 10. Can you guess it?",
        "یه عدد بین ۱ تا ۱۰ تو ذهنمه. حدس می‌زنی؟"), "thinking");
    ask(guessAnswer, 20000);
}

function gameMenu() {
    reply(L("Let's play! Say: flip a coin, roll a dice, rock paper scissors, or guess the number",
        "بیا بازی کنیم! بگو: سکه بنداز، تاس بنداز، سنگ کاغذ قیچی، یا حدس عدد"), "excited");
}

// ----- Talking with the pet (feelings, small talk, fun) -----

function talk(id, words, lines, mood, bond) {
    return {
        id: "talk-" + id,
        words,
        run() {
            if (bond) gain(bond);
            const list = lines[LANG] || lines.en;
            reply(pick(list), Array.isArray(mood) ? pick(mood) : mood);
        }
    };
}

const EXTRA_COMMANDS = [
    // --- when the user is not okay: kind, and points to real people for the heavy things ---
    talk("heavy", {
        en: ["im depressed", "i am depressed", "i feel hopeless", "i cant take it anymore",
            "i want to disappear", "i dont want to live", "i want to die"],
        fa: ["افسرده ام", "افسرده هستم", "ناامیدم", "دیگه نمیتونم تحمل کنم", "دیگه نمی تونم تحمل کنم",
            "میخوام ناپدید بشم", "نمیخوام زندگی کنم", "نمی خوام زندگی کنم", "میخوام بمیرم"]
    }, {
        en: ["I'm really glad you told me. That sounds heavy. Please talk to someone you trust, or a professional, today. You deserve real support, and I'm right here too."],
        fa: ["خوشحالم که بهم گفتی. این خیلی سنگینه. لطفاً امروز با یه نفر که بهش اعتماد داری یا یه متخصص حرف بزن. تو لایق حمایت واقعی هستی، و من هم همین‌جام."]
    }, "sad", 0),
    talk("sad", {
        en: ["im sad", "i am sad", "i feel sad", "im feeling sad", "im upset", "i am upset", "im feeling down",
            "i feel down", "im down", "bad day", "i had a bad day", "im lonely", "i feel lonely", "i feel bad",
            "im not okay", "im not ok", "im crying", "i feel terrible", "im so sad", "i am so sad",
            "i feel so sad", "so sad", "very sad", "really sad", "im really sad"],
        fa: ["ناراحتم", "غمگینم", "دلم گرفته", "حالم بده", "حالم خوب نیست", "روز بدی داشتم", "تنهام",
            "احساس تنهایی میکنم", "دارم گریه میکنم", "ناراحت هستم"]
    }, {
        en: ["I'm right here with you. Want to tell me what happened?",
            "Aw... come here. Bad days end, I promise.",
            "I'm sorry you feel that way. I'll stay next to you.",
            "Hey, you're not alone. I'm here, okay?"],
        fa: ["من همین‌جا کنارتم. می‌خوای بگی چی شده؟",
            "ای جان... بیا اینجا. روزای بد تموم می‌شن، قول می‌دم.",
            "متأسفم که این‌طوری هستی. کنارت می‌مونم.",
            "هی، تنها نیستی. من اینجام، باشه؟"]
    }, ["teary", "sad"], 0.5),
    talk("tired", {
        en: ["im tired", "i am tired", "im sleepy", "i feel tired", "im so tired", "im exhausted",
            "i am exhausted", "i feel sleepy", "i am so tired", "i feel so tired", "so tired", "very tired",
            "really tired", "im really tired"],
        fa: ["خسته ام", "خستم", "خسته شدم", "خوابم میاد", "بی حالم", "خسته هستم"]
    }, {
        en: ["Maybe take a short break? Some water and a stretch help a lot.",
            "You've worked hard. Rest a little, I'll keep an eye on things."],
        fa: ["شاید یه استراحت کوتاه خوب باشه. یه لیوان آب و کمی کشش بدن خیلی کمک می‌کنه.",
            "زحمت کشیدی. یه کم استراحت کن، من حواسم هست."]
    }, "sleepy", 0.3),
    talk("stress", {
        en: ["im stressed", "i am stressed", "im anxious", "im nervous", "im worried", "im scared",
            "im overwhelmed", "im so stressed", "i am so stressed", "so stressed", "i have an exam", "i have a test", "exam tomorrow", "i have a deadline",
            "too much work"],
        fa: ["استرس دارم", "مضطربم", "نگرانم", "میترسم", "می ترسم", "امتحان دارم", "امتحان فردا دارم",
            "ددلاین دارم", "کار زیاده"]
    }, {
        en: ["Breathe with me: in for 4, hold for 4, out for 4. One step at a time. You've got this.",
            "Big things are just small tasks stacked up. Want to add the first one to your tasks?"],
        fa: ["با من نفس بکش: ۴ ثانیه دم، ۴ ثانیه نگه دار، ۴ ثانیه بازدم. قدم به قدم. از پسش برمیای.",
            "کارای بزرگ همون کارای کوچیکِ کنار هم‌ان. می‌خوای اولیش رو به وظایفت اضافه کنیم؟"]
    }, "thinking", 0.4),
    talk("happy", {
        en: ["im happy", "i am happy", "i feel great", "im great", "im so happy", "i feel good", "good news",
            "i did it", "i passed", "i got an a", "i finished"],
        fa: ["خوشحالم", "حالم خوبه", "عالیم", "خبر خوب", "تموم کردم", "قبول شدم", "نمره خوب گرفتم", "تونستم"]
    }, {
        en: ["Yay! I'm so happy for you!", "That's amazing! I knew you could do it!", "Woohoo! Well done!"],
        fa: ["ایول! خیلی برات خوشحالم!", "عالیه! می‌دونستم از پسش برمیای!", "هورا! آفرین!"]
    }, "excited", 1),
    talk("failed", {
        en: ["i failed", "i failed the exam", "i got a bad grade", "bad grade", "i messed up"],
        fa: ["رد شدم", "نمره بد گرفتم", "خراب کردم", "افتادم"]
    }, {
        en: ["That's tough... but one result isn't the whole story. Learn from it and try again. I believe in you.",
            "Aw, I'm sorry. Everyone stumbles sometimes. Want to plan the next step together?"],
        fa: ["سخته... ولی یه نتیجه همهٔ ماجرا نیست. ازش یاد بگیر و دوباره امتحان کن. بهت ایمان دارم.",
            "ای جان، متأسفم. همه یه وقتایی زمین می‌خورن. می‌خوای قدم بعدی رو با هم برنامه‌ریزی کنیم؟"]
    }, "sad", 0.4),
    talk("angry", {
        en: ["im angry", "i am angry", "im mad", "im frustrated", "im annoyed", "i am furious"],
        fa: ["عصبانیم", "کلافه ام", "حرصم گرفته", "اعصابم خورده"]
    }, {
        en: ["Take a slow breath with me... in... and out. Want to talk about it?",
            "That sounds frustrating. I'm here, I'll listen."],
        fa: ["یه نفس عمیق با من بکش... دم... و بازدم. می‌خوای دربارش حرف بزنیم؟",
            "به نظر کلافه‌کننده‌ست. من اینجام، گوش می‌دم."]
    }, "thinking", 0.3),
    talk("hungry", {
        en: ["im hungry", "i am hungry", "im thirsty", "i need water", "i need food"],
        fa: ["گشنمه", "گرسنه ام", "تشنمه", "تشنه ام"]
    }, {
        en: ["Go grab a snack or some water! I'll wait here.",
            "Brain food time! Eat something, then back to it."],
        fa: ["برو یه چیزی بخور یا آب بخور! من همین‌جا منتظرم.", "وقت غذای مغزه! یه چیزی بخور، بعد برگرد."]
    }, "happy", 0.2),
    talk("motivate", {
        en: ["motivate me", "motivation", "encourage me", "cheer me up", "i cant do this", "i give up",
            "i want to quit", "i dont feel like studying", "im lazy", "im procrastinating"],
        fa: ["انگیزه بده", "تشویقم کن", "دلگرمم کن", "نمیتونم", "نمی تونم", "میخوام ول کنم",
            "حوصله درس ندارم", "تنبلم", "حس درس خوندن ندارم"]
    }, {
        en: ["Start with just 5 minutes. Starting is the hardest part, and I'll be here.",
            "Small steps still move you forward. You've got this!",
            "Future you will be so thankful. Say start focus and we'll do it together!",
            "You've already come this far. Don't stop now!"],
        fa: ["فقط ۵ دقیقه شروع کن. شروع کردن سخت‌ترین قسمته، من هم کنارتم.",
            "قدم‌های کوچیک هم جلو می‌برنت. از پسش برمیای!",
            "آیندهٔ خودت ازت ممنون می‌شه. بگو «شروع تمرکز» تا با هم شروع کنیم!",
            "تا اینجا اومدی، حالا ول نکن!"]
    }, ["excited", "happy"], 0.5),
    talk("bored", {
        en: ["im bored", "i am bored", "so bored", "bored"],
        fa: ["حوصله ام سر رفته", "حوصلم سر رفته", "بیکارم", "کسل شدم"]
    }, {
        en: ["Bored? Say play a game, tell me a joke, or give me a fun fact!"],
        fa: ["حوصله‌ات سر رفته؟ بگو «بازی کنیم»، «جوک بگو» یا «یه چیز جالب بگو»!"]
    }, "excited", 0.2),

    // --- fun ---
    talk("joke", {
        en: ["tell me a joke", "joke", "make me laugh", "say something funny", "another joke"],
        fa: ["جوک بگو", "یه جوک بگو", "بخندونم", "شوخی کن", "چیز خنده دار بگو"]
    }, {
        en: ["Why do programmers prefer dark mode? Because light attracts bugs!",
            "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads.",
            "Why was the computer cold? It left its Windows open!",
            "A SQL query walks into a bar, sees two tables and asks: can I join you?",
            "Why did the student eat his homework? The teacher said it was a piece of cake!"],
        fa: ["چرا برنامه‌نویس‌ها همیشه سرما می‌خورن؟ چون Windows رو باز می‌ذارن!",
            "به برنامه‌نویس گفتن برو شیر بخر، اگه تخم‌مرغ داشتن شش‌تا بیار. با شش‌تا شیر برگشت: چون تخم‌مرغ داشتن!",
            "چرا کامپیوتر رفت دکتر؟ چون ویروس گرفته بود!",
            "چرا برنامه‌نویس‌ها دوست دارن شب کار کنن؟ چون باگ‌ها شب‌ها بیدارترن!"]
    }, "happy", 0.3),
    talk("fact", {
        en: ["tell me a fact", "fun fact", "tell me something", "did you know"],
        fa: ["یه چیز جالب بگو", "حقیقت جالب", "نکته جالب", "میدونستی"]
    }, {
        en: ["Honey never spoils. Edible honey has been found in ancient tombs!",
            "Octopuses have three hearts.",
            "Bananas are berries, but strawberries aren't.",
            "A day on Venus is longer than its year."],
        fa: ["عسل هیچ‌وقت خراب نمی‌شه. عسل خوراکی توی مقبره‌های باستانی پیدا شده!",
            "هشت‌پا سه تا قلب داره.",
            "موز از نظر علمی توت محسوب می‌شه ولی توت‌فرنگی نه.",
            "یه روز روی ناهید از یه سالش طولانی‌تره."]
    }, "curious", 0.2),
    talk("sing", {
        en: ["sing", "sing a song", "sing for me"],
        fa: ["آهنگ بخون", "بخون برام", "یه آهنگ بخون"]
    }, {
        en: ["La la laaa... I'm not great at singing, but I try!"],
        fa: ["لا لا لاااا... آوازم زیاد خوب نیست ولی تلاشمو می‌کنم!"]
    }, "excited", 0.2),
    talk("dance", {
        en: ["dance", "do a dance", "dance for me"],
        fa: ["برقص", "برقص برام", "یه رقص بکن"]
    }, {
        en: ["Wiggle wiggle!"],
        fa: ["بجنب بجنب!"]
    }, "excited", 0.2),
    {
        id: "talk-date",
        words: {
            en: ["what day is it", "whats the date", "what is the date", "todays date", "what is today"],
            fa: ["امروز چه روزیه", "تاریخ امروز", "امروز چند شنبه است", "امروز چندمه"]
        },
        run() {
            const now = new Date();
            const text = LANG === "fa"
                ? now.toLocaleDateString("fa-IR", {weekday: "long", day: "numeric", month: "long", year: "numeric"})
                : now.toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"});
            reply(L(`Today is ${text}`, `امروز ${text} است`), "thinking");
        }
    },
    {
        id: "talk-age",
        words: {en: ["how old are you", "your age"], fa: ["چند سالته", "سنت چقدره"]},
        run() {
            reply(L(`I've been alive for ${humanDuration(state.activeMinutes * 60)}`,
                `${humanDuration(state.activeMinutes * 60)} است که زنده‌ام`), "happy");
        }
    },
    {
        id: "talk-status",
        words: {en: ["status", "show status", "your status"], fa: ["وضعیت", "وضعیتت"]},
        run() { showStatus(); }
    },

    // --- everyday talk ---
    talk("back", {
        en: ["im back", "i am back", "i came back"],
        fa: ["برگشتم"]
    }, {
        en: ["Welcome back!", "Yay, you're back!"],
        fa: ["خوش برگشتی!", "ایول، برگشتی!"]
    }, "excited", 0.5),
    talk("miss", {
        en: ["i missed you", "miss you"],
        fa: ["دلم برات تنگ شده بود", "دلتنگت بودم"]
    }, {
        en: ["I missed you too!"],
        fa: ["منم دلم برات تنگ شده بود!"]
    }, ["happy", "teary"], 1),
    talk("meet", {
        en: ["nice to meet you", "pleased to meet you", "long time no see"],
        fa: ["از دیدنت خوشحالم", "خوشبختم", "خیلی وقته ندیدمت"]
    }, {
        en: ["Nice to see you too!"],
        fa: ["منم از دیدنت خوشحالم!"]
    }, "happy", 0.5),
    talk("doing", {
        en: ["whats new", "what are you doing", "what are you up to"],
        fa: ["چیکار میکنی", "چی کار میکنی", "چی کار می کنی", "مشغول چی هستی"]
    }, {
        en: ["Just hanging out on your desktop and watching your cursor.",
            "Thinking about what to do next. Maybe a nap?"],
        fa: ["همین‌جا روی دسکتاپت پلاسم و موس تو رو نگاه می‌کنم.", "دارم فکر می‌کنم بعدش چیکار کنم. شاید یه چرت؟"]
    }, "thinking", 0.2),
    talk("there", {
        en: ["are you there", "are you awake"],
        fa: ["اونجایی", "بیداری", "اینجایی"]
    }, {
        en: ["I'm here!", "Yes, I'm here!"],
        fa: ["اینجام!", "آره، اینجام!"]
    }, "surprised", 0.1),
    talk("luck", {
        en: ["good luck", "wish me luck"],
        fa: ["موفق باشم", "برام آرزوی موفقیت کن", "شانس بیار"]
    }, {
        en: ["You've got this! Good luck!"],
        fa: ["از پسش برمیای! موفق باشی!"]
    }, "excited", 0.3),
    talk("brb", {
        en: ["brb", "be right back", "ill be back", "i will be back"],
        fa: ["الان میام", "یه لحظه میام", "زود برمیگردم", "الان برمیگردم"]
    }, {
        en: ["Okay, I'll wait here."],
        fa: ["باشه، همین‌جا منتظرتم."]
    }, "happy", 0),
    talk("rude", {
        en: ["i hate you", "you are stupid", "youre stupid", "you are dumb", "youre dumb", "youre useless"],
        fa: ["ازت متنفرم", "تو احمقی", "تو خنگی", "بی فایده ای"]
    }, {
        en: ["That hurt a little... but I'll still be here."],
        fa: ["یه کم ناراحتم کرد... ولی من بازم اینجام."]
    }, "sad", 0),
    talk("sorry", {
        en: ["im sorry", "i am sorry", "i apologize"],
        fa: ["ببخشید", "متاسفم", "شرمنده"]
    }, {
        en: ["It's okay! I forgive you."],
        fa: ["اشکال نداره! بخشیدمت."]
    }, "happy", 0.3),

    // --- games ---
    {
        id: "game-coin",
        words: {
            en: ["flip a coin", "toss a coin", "heads or tails", "flip coin"],
            fa: ["سکه بنداز", "یه سکه بنداز", "شیر یا خط"]
        },
        run() { flipCoin(); }
    },
    {
        id: "game-dice",
        words: {
            en: ["roll a dice", "roll the dice", "roll a die", "roll dice"],
            fa: ["تاس بنداز", "تاس بریز", "یه تاس بنداز"]
        },
        run() { rollDice(); }
    },
    {
        id: "game-rps",
        words: {
            en: ["rock paper scissors"],
            fa: ["سنگ کاغذ قیچی", "بازی سنگ کاغذ قیچی"]
        },
        run() { startRps(); }
    },
    {
        id: "game-guess",
        words: {
            en: ["guess the number", "guess a number", "number game"],
            fa: ["بازی حدس عدد", "حدس عدد"]
        },
        run() { startGuess(); }
    },
    {
        id: "game-menu",
        words: {
            en: ["play a game", "lets play", "lets play a game", "games", "play with me"],
            fa: ["بازی کنیم", "بیا بازی کنیم", "یه بازی بگو", "بازی"]
        },
        run() { gameMenu(); }
    }
];

COMMANDS.unshift(...DESK_COMMANDS, ...EXTRA_COMMANDS);


function handleVoiceText(raw) {
    console.log("[voice] heard:", raw);

    let norm = normalizeText(raw);
    if (!norm) return;

    const stripped = stripWake(norm);
    const addressed = stripped !== null;
    if (addressed) norm = stripped;
    if (REQUIRE_WAKE_WORD && !addressed) return;

    if (SHOW_HEARD) say(t("heardQuote", raw.trim()), 1500);

    // The pet asked something (e.g. "show the timer?"): the answer goes to its handler first
    if (pending) {
        const current = pending;
        pending = null;
        if (Date.now() <= current.until && current.handler(norm, raw)) {
            lastInteraction = Date.now();
            return;
        }
    }

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

    cmd.run(norm, raw);
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
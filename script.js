// ============================================================
// FIREBASE CONFIGURATION
// Replace these values with your own Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ============================================================
// CHECKLIST DATA
// ============================================================

const checklistData = {
    S3: {
        Studies: {
            School: [
                {
                    id: "s3_school_1",
                    text: "Do you know the number of subjects you need to take at UCE?",
                },
                {
                    id: "s3_school_2",
                    text: "Do you understand how each of the subjects you need to take are graded at school?",
                },
                {
                    id: "s3_school_3",
                    text: "Have you identified your strongest and weakest subjects sofar?",
                },
            ],
            UCE: [
                {
                    id: "s3_uce_1",
                    text: "Do you understand the five achievement levels (A, B, C, D, E) used by UNEB?",
                },
                {
                    id: "s3_uce_2",
                    text: "Do you know which subjects are compulsory at UCE?",
                },
            ],
            Scholarships: [
                {
                    id: "s3_scholar_1",
                    text: "Do you know of some scholarships inside / outside school / abroad you could apply for?",
                },
                {
                    id: "s3_scholar_2",
                    text: "Have you spoken to your school about any bursary or financial aid options?",
                },
            ],
        },
        "Human Relationships": [
            {
                id: "s3_rel_1",
                text: "Have you tried talking to a teacher to tell them what you are interested in?",
            },
            {
                id: "s3_rel_2",
                text: "Do you have a favourite teacher you can go to for guidance?",
            },
        ],
        "Extra Curriculars": [
            {
                id: "s3_ec_1",
                text: "Have you tried some activities at school besides classes?",
            },
            {
                id: "s3_ec_2",
                text: "Have you joined any club or society that relates to your interests?",
            },
        ],
    },
    S4: {
        University: [
            {
                id: "s4_uni_1",
                text: "Do you know the name of the course you want to take at university?",
            },
            {
                id: "s4_uni_2",
                text: "Do you know the entry requirements for your chosen course?",
            },
        ],
        "Career Exploration": [
            {
                id: "s4_car_1",
                text: "Have you researched at least two careers that interest you?",
            },
            {
                id: "s4_car_2",
                text: "Have you spoken to a professional in a career field you are curious about?",
            },
        ],
    },
    S5: {
        University: [
            {
                id: "s5_uni_1",
                text: "Have you confirmed the school fees at the universities you are interested in?",
            },
            {
                id: "s5_uni_2",
                text: "Have you thought of commuting from home or finding a hostel?",
            },
            {
                id: "s5_uni_3",
                text: "Have you heard about work-study opportunities available at some universities that allow students to work on campus to offset their fees?",
            },
        ],
        "A-Level Subjects": [
            {
                id: "s5_alev_1",
                text: "Do you understand how A-Level subjects relate to your intended university course?",
            },
            {
                id: "s5_alev_2",
                text: "Have you confirmed which subject combination is required for your chosen career path?",
            },
        ],
    },
};

// ============================================================
// RESOURCES DATA
// Add links here. Each entry: { title, desc, url }
// Leave empty array to show the "coming soon" placeholder.
// ============================================================

const careerSearchLinks = [
    // Example (uncomment and edit to add links):
    // { title: "Uganda National Examinations Board", desc: "Official UNEB website with exam info and results", url: "https://www.uneb.ac.ug" },
];

// ============================================================
// FIREBASE + ANONYMOUS USER ID
// ============================================================

let db = null;
let userId = null;
let firebaseReady = false;

function getOrCreateUserId() {
    let id = localStorage.getItem("ce_user_id");
    if (!id) {
        id =
            "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
        localStorage.setItem("ce_user_id", id);
    }
    return id;
}

async function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        userId = getOrCreateUserId();
        firebaseReady = true;

        // Load progress from Firestore, merge with localStorage fallback
        await loadProgressFromFirestore();
    } catch (err) {
        console.warn("Firebase init failed — using localStorage only.", err);
        firebaseReady = false;
        // Fall back to localStorage
        progress = JSON.parse(localStorage.getItem("studentProgress")) || {};
    }
}

async function loadProgressFromFirestore() {
    try {
        const docRef = doc(db, "progress", userId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            progress = snap.data().checks || {};
            // Keep localStorage in sync as fallback
            localStorage.setItem("studentProgress", JSON.stringify(progress));
        } else {
            // First time — seed from localStorage if anything was saved before
            progress =
                JSON.parse(localStorage.getItem("studentProgress")) || {};
            if (Object.keys(progress).length > 0) {
                // Migrate existing localStorage data to Firestore
                await setDoc(docRef, {
                    checks: progress,
                    createdAt: Date.now(),
                });
            }
        }
    } catch (err) {
        console.warn("Could not load from Firestore:", err);
        progress = JSON.parse(localStorage.getItem("studentProgress")) || {};
    }
}

// Debounced Firestore write — batches rapid taps into one write
let syncTimeout = null;
async function persistProgress() {
    // Always write to localStorage immediately
    localStorage.setItem("studentProgress", JSON.stringify(progress));

    if (!firebaseReady) return;

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const docRef = doc(db, "progress", userId);
            await setDoc(
                docRef,
                { checks: progress, updatedAt: Date.now() },
                { merge: true },
            );
            showSyncIndicator("Saved ✓", "success");
        } catch (err) {
            console.warn("Firestore write failed:", err);
            showSyncIndicator("Saved locally", "");
        }
    }, 800);
}

// ============================================================
// SYNC INDICATOR
// ============================================================

function showSyncIndicator(msg, type) {
    let el = document.getElementById("sync-indicator");
    if (!el) {
        el = document.createElement("div");
        el.id = "sync-indicator";
        el.className = "sync-indicator";
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `sync-indicator ${type} show`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.classList.remove("show");
    }, 2000);
}

// ============================================================
// PROGRESS
// ============================================================

let progress = {};

function saveProgress(id, isCompleted) {
    progress[id] = isCompleted;
    persistProgress();
}

function isSubtopicObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getAllQuestions(topicData) {
    if (Array.isArray(topicData)) return topicData;
    return Object.values(topicData).flat();
}

function getQuestionsProgress(questions) {
    if (!questions || questions.length === 0)
        return { done: 0, total: 0, pct: 0 };
    const done = questions.filter((q) => progress[q.id]).length;
    return {
        done,
        total: questions.length,
        pct: Math.round((done / questions.length) * 100),
    };
}

function getTopicProgress(topicData) {
    const allQ = getAllQuestions(topicData);
    return getQuestionsProgress(allQ).pct;
}

// ============================================================
// NAVIGATION — uses browser History API
// ============================================================

let currentLevel = "";
let currentTopic = "";

const header = document.getElementById("app-header");
const headerTitle = document.getElementById("header-title");

// Each state in history has: { viewId, title, level?, topic?, subtopic? }
function navigateTo(viewId, title, extra = {}) {
    const state = { viewId, title, ...extra };
    history.pushState(state, "", `#${viewId}`);
    renderAndShow(state);
}

function renderAndShow(state) {
    const { viewId, title, level, topic, subtopic } = state;

    // Stash for use in renderers
    if (level) currentLevel = level;
    if (topic) currentTopic = topic;

    // Re-render dynamic pages
    switch (viewId) {
        case "levels-page":
            renderLevelsPage();
            break;
        case "topics-page":
            renderTopicsPage(currentLevel);
            break;
        case "subtopics-page":
            renderSubtopicsPage(currentLevel, currentTopic);
            break;
        case "questions-page":
            renderQuestionsPage(currentLevel, currentTopic, subtopic || null);
            break;
    }

    // Show/hide header
    if (viewId === "home-page") {
        header.classList.add("hidden");
        document.getElementById("app-container").style.paddingTop = "0";
    } else {
        header.classList.remove("hidden");
        document.getElementById("app-container").style.paddingTop = "56px";
        headerTitle.innerText = title || "";
    }

    // Activate view
    document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");
}

// Handle browser back/forward buttons and phone back gesture
window.addEventListener("popstate", (e) => {
    if (e.state) {
        renderAndShow(e.state);
    } else {
        // Reached the bottom of history — show home
        renderAndShow({ viewId: "home-page", title: "" });
    }
    closeMenu();
});

// ============================================================
// PROGRESS BAR HELPER
// ============================================================

function progressBarHTML(pct) {
    const cls = pct === 100 ? "bar-fill complete" : "bar-fill";
    return `
        <div class="progress-row">
            <div class="progress-bar"><div class="${cls}" style="width:${pct}%"></div></div>
            <span class="pct-label">${pct}%</span>
        </div>`;
}

// ============================================================
// PAGE RENDERERS
// ============================================================

function renderLevelsPage() {
    const list = document.getElementById("levels-list");
    list.innerHTML = "";
    Object.keys(checklistData).forEach((level) => {
        const topics = checklistData[level];
        const allQ = Object.values(topics).flatMap((t) => getAllQuestions(t));
        const { pct } = getQuestionsProgress(allQ);
        const btn = document.createElement("button");
        btn.className = "card-item";
        btn.innerHTML = `
            <div class="card-main">
                <span class="card-title">Senior ${level.slice(1)}</span>
                <span class="card-tag">${level}</span>
            </div>
            ${progressBarHTML(pct)}
        `;
        btn.addEventListener("click", () => {
            navigateTo("topics-page", `${level} Checklist`, { level });
        });
        list.appendChild(btn);
    });
}

function renderTopicsPage(level) {
    document.getElementById("topics-level-label").innerText = level;
    const list = document.getElementById("topics-list");
    list.innerHTML = "";
    Object.keys(checklistData[level]).forEach((topic) => {
        const topicData = checklistData[level][topic];
        const pct = getTopicProgress(topicData);
        const hasSubtopics = isSubtopicObject(topicData);
        const btn = document.createElement("button");
        btn.className = "card-item";
        btn.innerHTML = `
            <div class="card-main">
                <span class="card-title">${topic}</span>
                ${hasSubtopics ? '<span class="card-tag subtag">subtopics</span>' : ""}
            </div>
            ${progressBarHTML(pct)}
        `;
        btn.addEventListener("click", () => {
            if (hasSubtopics) {
                navigateTo("subtopics-page", topic, { level, topic });
            } else {
                navigateTo("questions-page", topic, { level, topic });
            }
        });
        list.appendChild(btn);
    });
}

function renderSubtopicsPage(level, topic) {
    document.getElementById("subtopics-topic-label").innerText =
        `${level} › ${topic}`;
    document.getElementById("subtopics-title").innerText = topic;
    const list = document.getElementById("subtopics-list");
    list.innerHTML = "";
    const subtopics = checklistData[level][topic];
    Object.keys(subtopics).forEach((subtopic) => {
        const questions = subtopics[subtopic];
        const { pct } = getQuestionsProgress(questions);
        const btn = document.createElement("button");
        btn.className = "card-item";
        btn.innerHTML = `
            <div class="card-main">
                <span class="card-title">${subtopic}</span>
            </div>
            ${progressBarHTML(pct)}
        `;
        btn.addEventListener("click", () => {
            navigateTo("questions-page", subtopic, { level, topic, subtopic });
        });
        list.appendChild(btn);
    });
}

function renderQuestionsPage(level, topic, subtopic) {
    const label = subtopic
        ? `${level} › ${topic} › ${subtopic}`
        : `${level} › ${topic}`;
    document.getElementById("questions-topic-label").innerText = label;
    document.getElementById("questions-title").innerText = subtopic || topic;
    const questions = subtopic
        ? checklistData[level][topic][subtopic]
        : checklistData[level][topic];
    const container = document.getElementById("questions-list");
    container.innerHTML = "";
    const { done, total } = getQuestionsProgress(questions);
    const summaryEl = document.createElement("div");
    summaryEl.className = "summary-bar";
    summaryEl.id = "summary-bar";
    summaryEl.innerHTML = `<span>${done} of ${total} completed</span>${progressBarHTML(Math.round((done / total) * 100))}`;
    container.appendChild(summaryEl);
    questions.forEach((q) => {
        const isChecked = !!progress[q.id];
        const card = document.createElement("div");
        card.className = `question-card${isChecked ? " checked" : ""}`;
        card.id = `card-${q.id}`;
        card.innerHTML = `
            <label class="checkbox-label">
                <div class="custom-check${isChecked ? " active" : ""}" id="check-${q.id}">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"></polyline></svg>
                </div>
                <span class="question-text">${q.text}</span>
            </label>
        `;
        card.addEventListener("click", () =>
            handleCheck(q.id, questions, card),
        );
        container.appendChild(card);
    });
}

function handleCheck(id, questions, cardEl) {
    const newVal = !progress[id];
    saveProgress(id, newVal);
    cardEl.classList.toggle("checked", newVal);
    const checkBox = document.getElementById(`check-${id}`);
    checkBox.classList.toggle("active", newVal);
    const { done, total } = getQuestionsProgress(questions);
    const pct = Math.round((done / total) * 100);
    const summaryEl = document.getElementById("summary-bar");
    if (summaryEl) {
        summaryEl.innerHTML = `<span>${done} of ${total} completed</span>${progressBarHTML(pct)}`;
    }
}

// ============================================================
// RESOURCES RENDERER
// ============================================================

function renderCareerSearchPage() {
    const list = document.getElementById("career-search-list");
    if (!list) return;
    list.innerHTML = "";
    if (careerSearchLinks.length === 0) {
        list.innerHTML = `
            <div class="resource-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <p>Links are being added here soon.<br>Check back shortly!</p>
            </div>`;
        return;
    }
    careerSearchLinks.forEach((link) => {
        const a = document.createElement("a");
        a.className = "resource-link-card";
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.innerHTML = `
            <div class="resource-link-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <div class="resource-link-text">
                <div class="resource-link-title">${link.title}</div>
                <div class="resource-link-desc">${link.desc}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        `;
        list.appendChild(a);
    });
}

// ============================================================
// HAMBURGER MENU
// ============================================================

const hamburgerBtn = document.getElementById("hamburger-btn");
const menuOverlay = document.getElementById("menu-overlay");
const sideMenu = document.getElementById("side-menu");
const menuCloseBtn = document.getElementById("menu-close-btn");

function openMenu() {
    sideMenu.classList.remove("hidden");
    menuOverlay.classList.remove("hidden");
    // Trigger transitions
    requestAnimationFrame(() => {
        sideMenu.classList.add("open");
        menuOverlay.classList.add("visible");
    });
    hamburgerBtn.classList.add("open");
    hamburgerBtn.setAttribute("aria-expanded", "true");
    sideMenu.setAttribute("aria-hidden", "false");
    menuOverlay.setAttribute("aria-hidden", "false");
}

function closeMenu() {
    sideMenu.classList.remove("open");
    menuOverlay.classList.remove("visible");
    hamburgerBtn.classList.remove("open");
    hamburgerBtn.setAttribute("aria-expanded", "false");
    sideMenu.setAttribute("aria-hidden", "true");
    // Hide after transition
    setTimeout(() => {
        sideMenu.classList.add("hidden");
        menuOverlay.classList.add("hidden");
    }, 280);
}

hamburgerBtn.addEventListener("click", () => {
    if (sideMenu.classList.contains("open")) closeMenu();
    else openMenu();
});

menuCloseBtn.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

// Expandable subtrees in the menu
document.querySelectorAll(".menu-expandable").forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.expand;
        const subtree = document.getElementById(targetId);
        if (!subtree) return;
        const isOpen = !subtree.classList.contains("hidden");
        subtree.classList.toggle("hidden", isOpen);
        btn.classList.toggle("expanded", !isOpen);
    });
});

// Menu navigation links (pages)
document.querySelectorAll(".menu-link[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
        const viewId = btn.dataset.nav;
        const title = btn.dataset.title || "";
        closeMenu();
        setTimeout(() => navigateTo(viewId, title), 100);
    });
});

// Menu subtopic shortcuts
document.querySelectorAll(".menu-sublink").forEach((btn) => {
    btn.addEventListener("click", () => {
        const level = btn.dataset.level;
        const topic = btn.dataset.topic;
        closeMenu();
        setTimeout(() => {
            const topicData = checklistData[level]?.[topic];
            if (!topicData) return;
            if (isSubtopicObject(topicData)) {
                navigateTo("subtopics-page", topic, { level, topic });
            } else {
                navigateTo("questions-page", topic, { level, topic });
            }
        }, 100);
    });
});

// ============================================================
// BUTTON WIRING
// ============================================================

document.getElementById("home-btn").addEventListener("click", () => {
    navigateTo("hub-page", "Welcome");
    closeMenu();
});

document.getElementById("start-btn").addEventListener("click", () => {
    navigateTo("hub-page", "Welcome");
});

document.getElementById("hub-checklist-btn").addEventListener("click", () => {
    navigateTo("levels-page", "Select Level");
});

document.getElementById("hub-resources-btn").addEventListener("click", () => {
    navigateTo("resources-page", "Resources");
});

document
    .getElementById("res-career-search-btn")
    .addEventListener("click", () => {
        renderCareerSearchPage();
        navigateTo("career-search-page", "Career Search");
    });

// ============================================================
// INIT
// ============================================================

// Push initial state so popstate has somewhere to go back to
history.replaceState({ viewId: "home-page", title: "" }, "", "#home-page");

// Start Firebase (non-blocking — app works even if it fails)
initFirebase().then(() => {
    // Re-render any currently visible dynamic page with synced progress
    const current = history.state;
    if (current && current.viewId !== "home-page") {
        renderAndShow(current);
    }
});

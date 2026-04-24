// ============================================================
// CHECKLIST DATA
// To add a Level:  add a new key at the top level e.g. S6: { ... }
// To add a Topic:  add a key inside a level e.g. "Career Research": [ ... ]
// To add Subtopics: make the topic value an object instead of an array
//                   e.g. Studies: { School: [...], UCE: [...] }
// To add Questions: push objects { id, text } into the array
// ============================================================

const checklistData = {

    S3: {
        Studies: {
            School: [
                { id: "s3_school_1", text: "Do you know the number of subjects you need to take at UCE?" },
                { id: "s3_school_2", text: "Do you understand how each of the subjects you need to take are graded at school?" },
                { id: "s3_school_3", text: "Have you identified your strongest and weakest subjects?" },
            ],
            UCE: [
                { id: "s3_uce_1", text: "Do you understand the five achievement levels (A, B, C, D, E) used by UNEB?" },
                { id: "s3_uce_2", text: "Do you know which subjects are compulsory at UCE?" },
            ],
            Scholarships: [
                { id: "s3_scholar_1", text: "Do you know of some scholarships inside / outside school / abroad you could apply for?" },
                { id: "s3_scholar_2", text: "Have you spoken to your school about any bursary or financial aid options?" },
            ],
        },

        "Human Relationships": [
            { id: "s3_rel_1", text: "Have you tried talking to a teacher to tell them what you are interested in?" },
            { id: "s3_rel_2", text: "Do you have a favourite teacher you can go to for guidance?" },
        ],

        "Extra Curriculars": [
            { id: "s3_ec_1", text: "Have you tried some activities at school besides classes?" },
            { id: "s3_ec_2", text: "Have you joined any club or society that relates to your interests?" },
        ],
    },

    S4: {
        University: [
            { id: "s4_uni_1", text: "Do you know the name of the course you want to take at university?" },
            { id: "s4_uni_2", text: "Do you know the entry requirements for your chosen course?" },
        ],

        "Career Exploration": [
            { id: "s4_car_1", text: "Have you researched at least two careers that interest you?" },
            { id: "s4_car_2", text: "Have you spoken to a professional in a career field you are curious about?" },
        ],
    },

    S5: {
        University: [
            { id: "s5_uni_1", text: "Have you confirmed the school fees at the universities you are interested in?" },
            { id: "s5_uni_2", text: "Have you thought of commuting from home or finding a hostel?" },
            { id: "s5_uni_3", text: "Have you heard about work-study opportunities available at some universities that allow students to work on campus to offset their fees?" },
        ],

        "A-Level Subjects": [
            { id: "s5_alev_1", text: "Do you understand how A-Level subjects relate to your intended university course?" },
            { id: "s5_alev_2", text: "Have you confirmed which subject combination is required for your chosen career path?" },
        ],
    },
};

// ============================================================
// HELPERS — determine if a topic holds subtopics or flat questions
// ============================================================

function isSubtopicObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Return flat question array for a topic (handles both flat and nested) */
function getAllQuestions(topicData) {
    if (Array.isArray(topicData)) return topicData;
    // It's a subtopic object — collect all questions from every subtopic
    return Object.values(topicData).flat();
}

// ============================================================
// PROGRESS — stored in localStorage
// ============================================================

let progress = JSON.parse(localStorage.getItem("studentProgress")) || {};

function saveProgress(id, isCompleted) {
    progress[id] = isCompleted;
    localStorage.setItem("studentProgress", JSON.stringify(progress));
}

function getQuestionsProgress(questions) {
    if (!questions || questions.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = questions.filter(q => progress[q.id]).length;
    return { done, total: questions.length, pct: Math.round((done / questions.length) * 100) };
}

/** Percentage for a topic (average of its subtopics, or direct if flat) */
function getTopicProgress(topicData) {
    if (Array.isArray(topicData)) {
        return getQuestionsProgress(topicData).pct;
    }
    // Weighted average across subtopics
    const allQ = getAllQuestions(topicData);
    return getQuestionsProgress(allQ).pct;
}

// ============================================================
// NAVIGATION
// ============================================================

let currentLevel = "";
let currentTopic = "";
let historyStack = ["home-page"];

const header = document.getElementById("app-header");
const headerTitle = document.getElementById("header-title");

function showView(viewId, title) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");

    if (viewId === "home-page") {
        header.classList.add("hidden");
        document.getElementById("app-container").style.paddingTop = "0";
    } else {
        header.classList.remove("hidden");
        document.getElementById("app-container").style.paddingTop = "64px";
        headerTitle.innerText = title || "";
    }
}

function navigateTo(viewId, title) {
    historyStack.push(viewId);
    showView(viewId, title);
}

function navigateBack() {
    if (historyStack.length <= 1) return;
    historyStack.pop();
    const prev = historyStack[historyStack.length - 1];

    // Re-render the previous page so percentages are fresh
    if (prev === "home-page") {
        showView("home-page");
    } else if (prev === "levels-page") {
        renderLevelsPage();
        showView("levels-page", "Select Level");
    } else if (prev === "topics-page") {
        renderTopicsPage(currentLevel);
        showView("topics-page", `${currentLevel} Checklist`);
    } else if (prev === "subtopics-page") {
        renderSubtopicsPage(currentLevel, currentTopic);
        showView("subtopics-page", currentTopic);
    } else {
        showView(prev);
    }
}

document.getElementById("back-btn").addEventListener("click", navigateBack);

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

    Object.keys(checklistData).forEach(level => {
        const topics = checklistData[level];
        const allQ = Object.values(topics).flatMap(t => getAllQuestions(t));
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
            currentLevel = level;
            renderTopicsPage(level);
            historyStack.push("topics-page");
            showView("topics-page", `${level} Checklist`);
        });
        list.appendChild(btn);
    });
}

function renderTopicsPage(level) {
    document.getElementById("topics-level-label").innerText = level;
    const list = document.getElementById("topics-list");
    list.innerHTML = "";

    Object.keys(checklistData[level]).forEach(topic => {
        const topicData = checklistData[level][topic];
        const pct = getTopicProgress(topicData);
        const hasSubtopics = isSubtopicObject(topicData);

        const btn = document.createElement("button");
        btn.className = "card-item";
        btn.innerHTML = `
            <div class="card-main">
                <span class="card-title">${topic}</span>
                ${hasSubtopics ? '<span class="card-tag subtag">subtopics</span>' : ''}
            </div>
            ${progressBarHTML(pct)}
        `;
        btn.addEventListener("click", () => {
            currentTopic = topic;
            if (hasSubtopics) {
                renderSubtopicsPage(level, topic);
                historyStack.push("subtopics-page");
                showView("subtopics-page", topic);
            } else {
                renderQuestionsPage(level, topic, null);
                historyStack.push("questions-page");
                showView("questions-page", topic);
            }
        });
        list.appendChild(btn);
    });
}

function renderSubtopicsPage(level, topic) {
    document.getElementById("subtopics-topic-label").innerText = `${level} › ${topic}`;
    document.getElementById("subtopics-title").innerText = topic;
    const list = document.getElementById("subtopics-list");
    list.innerHTML = "";

    const subtopics = checklistData[level][topic];

    Object.keys(subtopics).forEach(subtopic => {
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
            renderQuestionsPage(level, topic, subtopic);
            historyStack.push("questions-page");
            showView("questions-page", subtopic);
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
    summaryEl.innerHTML = `<span>${done} of ${total} completed</span>${progressBarHTML(Math.round((done/total)*100))}`;
    container.appendChild(summaryEl);

    questions.forEach(q => {
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
        card.addEventListener("click", () => handleCheck(q.id, questions, card));
        container.appendChild(card);
    });
}

function handleCheck(id, questions, cardEl) {
    const newVal = !progress[id];
    saveProgress(id, newVal);

    // Update card style
    cardEl.classList.toggle("checked", newVal);
    const checkBox = document.getElementById(`check-${id}`);
    checkBox.classList.toggle("active", newVal);

    // Update summary bar
    const { done, total } = getQuestionsProgress(questions);
    const pct = Math.round((done / total) * 100);
    const summaryEl = document.getElementById("summary-bar");
    if (summaryEl) {
        summaryEl.innerHTML = `<span>${done} of ${total} completed</span>${progressBarHTML(pct)}`;
    }
}

// ============================================================
// BOOT
// ============================================================

document.getElementById("start-btn").addEventListener("click", () => {
    renderLevelsPage();
    historyStack.push("levels-page");
    showView("levels-page", "Select Level");
});

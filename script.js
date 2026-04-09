// Data Structure for Questions
const checklistData = {
	S3: {
		Subjects: [
			{
				id: "s3_sub_1",
				text: "Do you know the number of subjects you need to take at UCE?",
			},
			{
				id: "s3_sub_2",
				text: "Do you understand how each of the subjects you need to take at UCE is graded?",
			},
			{ id: "s3_sub_3", text: "" },
		],
		"Human relationships": [
			{
				id: "s3_sub_1",
				text: "Have you tried talking to a teacher to tell them what you are interested in?",
			},
			{ id: "s3_sub_2", text: "Do you have a favorite teacher?" },
		],
		"Extra curriculars": [
			{
				id: "s3_sub_1",
				text: "Have you tried some activities at school besides classes?",
			},
		],
	},
	S4: {
		University: [
			{
				id: "s4_uni_1",
				text: "Do you know the name of the course you want to take at university?",
			},
		],
	},
};

// State Variables
let currentLevel = "";
let currentTopic = "";
let historyStack = ["home-page"]; // Keeps track of navigation for the back button

// Load progress from localStorage
let progress = JSON.parse(localStorage.getItem("studentProgress")) || {};

// DOM Elements
const header = document.getElementById("app-header");
const backBtn = document.getElementById("back-btn");
const headerTitle = document.getElementById("header-title");

// Navigation Functions
function showView(viewId, title = "Checklist") {
	// Hide all views
	document
		.querySelectorAll(".view")
		.forEach((view) => view.classList.remove("active"));
	// Show target view
	document.getElementById(viewId).classList.add("active");

	// Header management
	if (viewId === "home-page") {
		header.classList.add("hidden");
		document.getElementById("app-container").style.paddingTop = "0";
	} else {
		header.classList.remove("hidden");
		document.getElementById("app-container").style.paddingTop = "60px";
		headerTitle.innerText = title;
	}
}

function navigateTo(viewId, title) {
	historyStack.push(viewId);
	showView(viewId, title);
}

function navigateBack() {
	if (historyStack.length > 1) {
		historyStack.pop(); // Remove current page
		const previousPage = historyStack[historyStack.length - 1]; // Get previous page

		// Re-render topics if going back to topics page so percentages update
		if (previousPage === "topics-page") {
			openLevel(currentLevel);
			historyStack.pop(); // Remove the duplicate entry pushed by openLevel
		}

		showView(previousPage, "Checklist");
	}
}

// Logic Functions
function getProgressPercentage(level, topic) {
	const questions = checklistData[level][topic];
	if (!questions || questions.length === 0) return 0;

	let completed = 0;
	questions.forEach((q) => {
		if (progress[q.id]) completed++;
	});

	return Math.round((completed / questions.length) * 100);
}

function saveProgress(id, isCompleted) {
	progress[id] = isCompleted;
	localStorage.setItem("studentProgress", JSON.stringify(progress));
}

// Page Renderers
function openLevel(level) {
	currentLevel = level;
	document.getElementById("level-title").innerText = `${level} Topics`;
	const topicsList = document.getElementById("topics-list");
	topicsList.innerHTML = ""; // Clear old topics

	const topics = Object.keys(checklistData[level]);

	topics.forEach((topic) => {
		const percentage = getProgressPercentage(level, topic);
		const btn = document.createElement("button");
		btn.className = "list-item";
		btn.innerHTML = `<span>${topic}</span> <span>${percentage}%</span>`;
		btn.onclick = () => openTopic(topic);
		topicsList.appendChild(btn);
	});

	navigateTo("topics-page", `${level} Checklist`);
}

function openTopic(topic) {
	currentTopic = topic;
	document.getElementById("topic-title").innerText = topic;
	const questionsList = document.getElementById("questions-list");
	questionsList.innerHTML = ""; // Clear old questions

	const questions = checklistData[currentLevel][topic];

	questions.forEach((q) => {
		const isChecked = progress[q.id] ? "checked" : "";

		const card = document.createElement("div");
		card.className = "question-card";
		card.innerHTML = `
						<div class="question-text">${q.text}</div>
						<label class="checkbox-label">
								<input type="checkbox" id="${q.id}" onchange="handleCheck('${q.id}', this.checked)" ${isChecked}>
								Completed
						</label>
				`;
		questionsList.appendChild(card);
	});

	navigateTo("questions-page", topic);
}

function handleCheck(id, isCompleted) {
	saveProgress(id, isCompleted);
}

// Event Listeners
document.getElementById("start-btn").addEventListener("click", () => {
	navigateTo("levels-page", "Select Level");
});

backBtn.addEventListener("click", navigateBack);

"use strict";

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;

const gradeSelect =
  document.getElementById("grade");

const knowledgeSelect =
  document.getElementById("knowledgePoint");

const difficultySelect =
  document.getElementById("difficulty");

const countSelect =
  document.getElementById("questionCount");

const practiceSection =
  document.getElementById("practiceSection");

const questionContainer =
  document.getElementById("questionContainer");

const questionProgress =
  document.getElementById("questionProgress");

async function loadQuestions() {
  try {
    const response = await fetch("./data/questions.json");

    if (!response.ok) {
      throw new Error(
        `题库加载失败：${response.status}`
      );
    }

    allQuestions = await response.json();

    console.log(
      `题库加载成功，共${allQuestions.length}道题`
    );
  } catch (error) {
    console.error(error);

    questionContainer.innerHTML = `
      <div class="answer-box">
        题库加载失败，请检查data/questions.json文件。
      </div>
    `;
  }
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex =
      Math.floor(Math.random() * (i + 1));

    [
      result[i],
      result[randomIndex]
    ] = [
      result[randomIndex],
      result[i]
    ];
  }

  return result;
}

function filterQuestions() {
  const grade = Number(gradeSelect.value);
  const knowledgePoint = knowledgeSelect.value;
  const difficulty = difficultySelect.value;
  const count = Number(countSelect.value);

  const filtered = allQuestions.filter((question) => {
    const gradeMatched =
      question.grade === grade;

    const knowledgeMatched =
      !knowledgePoint ||
      question.knowledgePoints.includes(
        knowledgePoint
      );

    const difficultyMatched =
      !difficulty ||
      question.difficulty === Number(difficulty);

    return (
      gradeMatched &&
      knowledgeMatched &&
      difficultyMatched
    );
  });

  return shuffle(filtered).slice(0, count);
}

function getDifficultyName(level) {
  const names = {
    1: "入门",
    2: "基础",
    3: "中等",
    4: "较难",
    5: "挑战"
  };

  return names[level] || "未分类";
}

function renderQuestion() {
  const question = currentQuestions[currentIndex];

  if (!question) {
    questionContainer.innerHTML = `
      <div class="answer-box">
        没有找到符合条件的题目。
      </div>
    `;

    questionProgress.textContent = "0 / 0";
    return;
  }

  questionProgress.textContent =
    `${currentIndex + 1} / ${currentQuestions.length}`;

  const optionsHtml = question.options?.length
    ? `
      <div class="options">
        ${question.options
          .map(
            (option) => `
              <div class="option">
                ${option}
              </div>
            `
          )
          .join("")}
      </div>
    `
    : `
      <div class="options">
        <input
          type="text"
          id="userAnswer"
          placeholder="请输入答案"
        >
      </div>
    `;

  questionContainer.innerHTML = `
    <article class="question-card">
      <div class="question-meta">
        <span class="tag">
          ${question.chapter}
        </span>

        <span class="tag">
          ${question.type}
        </span>

        <span class="tag">
          ${getDifficultyName(
            question.difficulty
          )}
        </span>
      </div>

      <div class="question-title">
        ${question.stem}
      </div>

      ${optionsHtml}

      <div
        id="answerBox"
        class="answer-box hidden"
      >
        <strong>答案：</strong>
        ${question.answer}

        <br><br>

        <strong>解析：</strong>
        ${question.analysis}
      </div>
    </article>
  `;
}

function startPractice() {
  currentQuestions = filterQuestions();
  currentIndex = 0;

  practiceSection.classList.remove("hidden");
  renderQuestion();

  practiceSection.scrollIntoView({
    behavior: "smooth"
  });
}

document
  .getElementById("startPractice")
  .addEventListener("click", startPractice);

document
  .getElementById("randomPractice")
  .addEventListener("click", () => {
    const count = Number(countSelect.value);

    currentQuestions =
      shuffle(allQuestions).slice(0, count);

    currentIndex = 0;

    practiceSection.classList.remove("hidden");
    renderQuestion();
  });

document
  .getElementById("showAnswer")
  .addEventListener("click", () => {
    const answerBox =
      document.getElementById("answerBox");

    answerBox?.classList.remove("hidden");
  });

document
  .getElementById("nextQuestion")
  .addEventListener("click", () => {
    if (
      currentIndex <
      currentQuestions.length - 1
    ) {
      currentIndex += 1;
      renderQuestion();
    }
  });

document
  .getElementById("previousQuestion")
  .addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      renderQuestion();
    }
  });

loadQuestions();
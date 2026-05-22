const STORAGE_KEY = "iosInterviewCoachState";

const fallbackQuestions = [
  {
    id: "ios-runtime-001",
    category: "Runtime",
    level: "medium",
    question: "Objective-C 的消息发送流程是什么？",
    answer: "Objective-C 调用方法时会编译成 objc_msgSend(receiver, selector, ...)。运行时先根据对象的 isa 找到类，再从方法缓存查找 IMP；缓存未命中时沿类的方法列表和父类链查找。找到后会把 IMP 写入缓存并调用。找不到时进入动态方法解析、消息转发快速流程和完整转发流程，最后仍无法处理才触发 doesNotRecognizeSelector。"
  },
  {
    id: "ios-runtime-002",
    category: "Runtime",
    level: "medium",
    question: "Category 为什么不能直接添加实例变量？",
    answer: "Category 在运行时会把方法、协议、属性声明等附加到已有类上，但类的实例内存布局在编译期已经确定，不能再安全插入实例变量。Category 的属性默认只生成声明，不会自动生成存储。需要保存额外状态时，通常使用 Associated Objects，把 key 和 value 关联到对象上。"
  },
  {
    id: "ios-runloop-001",
    category: "RunLoop",
    level: "medium",
    question: "RunLoop 的作用是什么？",
    answer: "RunLoop 是线程的事件循环机制，用来让线程在有事件时处理事件、无事件时休眠。它管理 Source、Timer、Observer，并通过 Mode 隔离不同场景的输入源。主线程 RunLoop 默认启动，所以 App 能持续响应触摸、定时器、端口消息和界面刷新。子线程如果需要常驻，也要手动配置输入源并启动 RunLoop。"
  },
  {
    id: "ios-runloop-002",
    category: "RunLoop",
    level: "easy",
    question: "为什么滑动列表时 NSTimer 可能不触发？",
    answer: "列表滑动时主线程 RunLoop 会切到 UITrackingRunLoopMode。如果 Timer 只注册在默认模式，当前模式不包含它，就会暂停触发。常见处理方式是把 Timer 加到 common modes，或者根据业务改用 GCD timer，避免被 RunLoop mode 影响。"
  },
  {
    id: "ios-memory-001",
    category: "内存",
    level: "medium",
    question: "weak 和 assign 的区别是什么？",
    answer: "weak 用于对象引用，不持有对象；对象释放后 weak 指针会自动置为 nil，避免野指针。assign 只是普通赋值，不管理生命周期，也不会自动置空，适合基本数据类型。对象引用如果用 assign，目标释放后继续访问可能崩溃。"
  },
  {
    id: "ios-memory-002",
    category: "内存",
    level: "hard",
    question: "如何排查循环引用？",
    answer: "先从现象确认对象没有释放，例如 dealloc 不打印或内存持续增长。再检查常见强引用环：block 捕获 self、delegate 使用 strong、timer 或 display link 持有 target、通知和 KVO 未释放。可以用 Xcode Memory Graph 找引用链，结合 Instruments Leaks/Allocations 验证。修复时不要机械使用 weak，要根据所有权选择 weak、拆分生命周期或显式 invalidate。"
  },
  {
    id: "ios-concurrency-001",
    category: "并发",
    level: "medium",
    question: "GCD 串行队列和并发队列有什么区别？",
    answer: "串行队列一次只执行一个任务，保证提交到同一队列的任务按顺序执行。并发队列可以同时执行多个任务，但开始顺序仍和提交顺序相关，完成顺序不保证。同步或异步决定当前线程是否等待任务完成，队列类型决定任务之间能否并行。"
  },
  {
    id: "ios-concurrency-002",
    category: "并发",
    level: "hard",
    question: "在主队列同步派发为什么会死锁？",
    answer: "如果当前已经在主线程，又调用 DispatchQueue.main.sync，当前任务会等待同步派发的任务执行完成；但主队列是串行队列，新的任务必须等当前任务结束后才能执行。双方互相等待，就产生死锁。解决方式是避免在主线程 sync 到主队列，必要时判断线程或改用 async。"
  },
  {
    id: "ios-network-001",
    category: "网络",
    level: "medium",
    question: "HTTPS 握手大致做了什么？",
    answer: "HTTPS 在 TCP 连接后进行 TLS 握手。客户端和服务端协商协议版本、加密套件，服务端下发证书，客户端校验证书链和域名。随后双方通过密钥交换生成会话密钥，用对称加密保护后续 HTTP 数据。TLS 1.3 简化了握手流程，减少往返次数。"
  },
  {
    id: "ios-network-002",
    category: "网络",
    level: "easy",
    question: "URLSession 的 dataTask 回调在哪个线程？",
    answer: "URLSession 的 completion handler 不保证在主线程执行，通常在后台队列回调。涉及 UI 更新时必须切回主线程。创建 URLSession 时也可以通过 delegateQueue 控制 delegate 回调队列，但仍要明确区分网络处理和 UI 更新的线程边界。"
  }
];

const state = {
  questions: [],
  selectedId: null,
  activeCategory: "all",
  searchQuery: "",
  mistakeMode: false,
  answerVisible: false,
  favoriteIds: new Set(),
  masteredIds: new Set(),
  speakingId: null
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  mistakeModeButton: document.getElementById("mistakeModeButton"),
  randomButton: document.getElementById("randomButton"),
  questionCount: document.getElementById("questionCount"),
  questionList: document.getElementById("questionList"),
  metaLine: document.getElementById("metaLine"),
  questionTitle: document.getElementById("questionTitle"),
  favoriteButton: document.getElementById("favoriteButton"),
  masteredButton: document.getElementById("masteredButton"),
  toggleAnswerButton: document.getElementById("toggleAnswerButton"),
  speakButton: document.getElementById("speakButton"),
  answerBox: document.getElementById("answerBox"),
  answerText: document.getElementById("answerText")
};

init();

async function init() {
  loadSavedState();
  state.questions = await loadQuestions();
  state.selectedId = state.questions[0]?.id ?? null;
  bindEvents();
  renderCategories();
  render();
}

async function loadQuestions() {
  try {
    const response = await fetch("questions.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const questions = await response.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid question data");
    }
    return questions;
  } catch (error) {
    console.info("Using embedded questions because questions.json could not be loaded.", error);
    return fallbackQuestions;
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.searchQuery = elements.searchInput.value.trim().toLowerCase();
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.categoryFilter.addEventListener("change", () => {
    state.activeCategory = elements.categoryFilter.value;
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.randomButton.addEventListener("click", () => {
    selectRandomQuestion();
  });

  elements.mistakeModeButton.addEventListener("click", () => {
    state.mistakeMode = !state.mistakeMode;
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.toggleAnswerButton.addEventListener("click", () => {
    state.answerVisible = !state.answerVisible;
    renderDetail();
  });

  elements.speakButton.addEventListener("click", () => {
    const question = getSelectedQuestion();
    if (!question) {
      return;
    }
    speakAnswer(question);
  });

  elements.favoriteButton.addEventListener("click", () => {
    toggleId(state.favoriteIds, state.selectedId);
    saveState();
    render();
  });

  elements.masteredButton.addEventListener("click", () => {
    toggleId(state.masteredIds, state.selectedId);
    saveState();
    updateSelectionForFilteredQuestions();
    render();
  });
}

function loadSavedState() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return;
    }
    const savedState = JSON.parse(rawValue);
    state.favoriteIds = new Set(savedState.favoriteIds ?? []);
    state.masteredIds = new Set(savedState.masteredIds ?? []);
  } catch (error) {
    console.warn("Ignoring invalid saved interview coach state.", error);
  }
}

function saveState() {
  const value = {
    favoriteIds: Array.from(state.favoriteIds),
    masteredIds: Array.from(state.masteredIds)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function renderCategories() {
  const categories = Array.from(new Set(state.questions.map((question) => question.category))).sort();
  const options = [
    '<option value="all">全部</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ];
  elements.categoryFilter.innerHTML = options.join("");
}

function render() {
  renderList();
  renderDetail();
}

function renderList() {
  const questions = getFilteredQuestions();
  elements.questionCount.textContent = `${questions.length} 道`;
  elements.mistakeModeButton.setAttribute("aria-pressed", String(state.mistakeMode));
  elements.randomButton.disabled = questions.length === 0;

  if (questions.length === 0) {
    elements.questionList.innerHTML = '<p class="empty-state">当前分类没有题目。</p>';
    return;
  }

  elements.questionList.innerHTML = questions.map((question) => {
    const isActive = question.id === state.selectedId;
    const tags = [
      `<span class="tag">${escapeHtml(question.category)}</span>`,
      `<span class="tag">${formatLevel(question.level)}</span>`,
      state.favoriteIds.has(question.id) ? '<span class="tag favorite">收藏</span>' : "",
      state.masteredIds.has(question.id) ? '<span class="tag mastered">已掌握</span>' : ""
    ].filter(Boolean).join("");

    return `
      <button type="button" class="question-item${isActive ? " is-active" : ""}" data-id="${escapeHtml(question.id)}">
        <span class="question-title">${escapeHtml(question.question)}</span>
        <span class="question-meta">${tags}</span>
      </button>
    `;
  }).join("");

  elements.questionList.querySelectorAll(".question-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      state.answerVisible = false;
      stopSpeaking();
      render();
    });
  });
}

function renderDetail() {
  const question = getSelectedQuestion();
  const hasQuestion = Boolean(question);

  elements.favoriteButton.disabled = !hasQuestion;
  elements.masteredButton.disabled = !hasQuestion;
  elements.toggleAnswerButton.disabled = !hasQuestion;
  elements.speakButton.disabled = !hasQuestion || !("speechSynthesis" in window);

  if (!question) {
    elements.metaLine.textContent = "";
    elements.questionTitle.textContent = "请选择题目";
    elements.answerText.textContent = "";
    elements.answerBox.classList.add("is-hidden");
    elements.toggleAnswerButton.textContent = "显示答案";
    elements.favoriteButton.setAttribute("aria-pressed", "false");
    elements.masteredButton.setAttribute("aria-pressed", "false");
    return;
  }

  elements.metaLine.innerHTML = `
    <span class="tag">${escapeHtml(question.category)}</span>
    <span class="tag">${formatLevel(question.level)}</span>
  `;
  elements.questionTitle.textContent = question.question;
  elements.answerText.textContent = question.answer;
  elements.answerBox.classList.toggle("is-hidden", !state.answerVisible);
  elements.toggleAnswerButton.textContent = state.answerVisible ? "隐藏答案" : "显示答案";

  const isFavorite = state.favoriteIds.has(question.id);
  const isMastered = state.masteredIds.has(question.id);
  elements.favoriteButton.textContent = isFavorite ? "★" : "☆";
  elements.favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  elements.masteredButton.setAttribute("aria-pressed", String(isMastered));
}

function getFilteredQuestions() {
  return state.questions.filter((question) => {
    const matchesCategory = state.activeCategory === "all" || question.category === state.activeCategory;
    if (!matchesCategory) {
      return false;
    }
    if (state.mistakeMode && state.masteredIds.has(question.id)) {
      return false;
    }
    if (!state.searchQuery) {
      return true;
    }
    return getQuestionSearchText(question).includes(state.searchQuery);
  });
}

function getSelectedQuestion() {
  return state.questions.find((question) => question.id === state.selectedId) ?? null;
}

function updateSelectionForFilteredQuestions() {
  const filteredQuestions = getFilteredQuestions();
  const hasSelectedQuestion = filteredQuestions.some((question) => question.id === state.selectedId);
  if (hasSelectedQuestion) {
    return;
  }
  state.selectedId = filteredQuestions[0]?.id ?? null;
  state.answerVisible = false;
  stopSpeaking();
}

function selectRandomQuestion() {
  const filteredQuestions = getFilteredQuestions();
  if (filteredQuestions.length === 0) {
    return;
  }

  let candidates = filteredQuestions;
  if (filteredQuestions.length > 1) {
    candidates = filteredQuestions.filter((question) => question.id !== state.selectedId);
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  state.selectedId = candidates[randomIndex].id;
  state.answerVisible = false;
  stopSpeaking();
  render();
}

function getQuestionSearchText(question) {
  return [
    question.question,
    question.answer,
    question.category,
    question.level,
    formatLevel(question.level)
  ].join(" ").toLowerCase();
}

function toggleId(set, id) {
  if (!id) {
    return;
  }
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
}

function speakAnswer(question) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  if (state.speakingId === question.id) {
    stopSpeaking();
    return;
  }

  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(question.answer);
  utterance.lang = "zh-CN";
  utterance.rate = 0.95;
  utterance.onend = () => {
    state.speakingId = null;
    elements.speakButton.textContent = "朗读答案";
  };
  utterance.onerror = utterance.onend;
  state.speakingId = question.id;
  elements.speakButton.textContent = "停止朗读";
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  state.speakingId = null;
  elements.speakButton.textContent = "朗读答案";
}

function formatLevel(level) {
  const levelMap = {
    easy: "简单",
    medium: "中等",
    hard: "困难"
  };
  return levelMap[level] ?? level;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

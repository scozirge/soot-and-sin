const BACKLOG_URL = "../../soot-and-sin-adventure-demo/SYSTEM_DESIGN_BACKLOG.md";
const STORAGE_KEY = "soot-and-sin:system-design-checklist:v1";
const PRIORITY_LABELS = {
  P0: "角色、貨幣與道具",
  P1: "章節、小節與事件",
  P2: "戰鬥、劇本與神祇",
};

const dom = {
  checklist: document.querySelector("#checklist"),
  emptyState: document.querySelector("#emptyState"),
  progressPercent: document.querySelector("#progressPercent"),
  progressBar: document.querySelector("#progressBar"),
  progressTrack: document.querySelector(".progress-track"),
  completedCount: document.querySelector("#completedCount"),
  totalCount: document.querySelector("#totalCount"),
  savedAt: document.querySelector("#savedAt"),
  filters: [...document.querySelectorAll("[data-filter]")],
  summaries: [...document.querySelectorAll("[data-summary]")],
  priorityTemplate: document.querySelector("#priorityTemplate"),
  topicTemplate: document.querySelector("#topicTemplate"),
  taskTemplate: document.querySelector("#taskTemplate"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
};

let state = loadState();
let model = [];
let currentFilter = "all";
let toastTimer = 0;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      items: parsed.items && typeof parsed.items === "object" ? parsed.items : {},
      savedAt: parsed.savedAt || null,
    };
  } catch {
    return { items: {}, savedAt: null };
  }
}

function saveState() {
  state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateSavedAt();
}

function updateSavedAt() {
  if (!state.savedAt) {
    dom.savedAt.textContent = "尚未儲存";
    dom.savedAt.removeAttribute("datetime");
    return;
  }

  const date = new Date(state.savedAt);
  dom.savedAt.dateTime = state.savedAt;
  dom.savedAt.textContent = `上次儲存 ${new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function stableId(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `task-${(hash >>> 0).toString(36)}`;
}

function stripHeadingNumber(value) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function parseBacklog(markdown) {
  const priorities = [];
  let priority = null;
  let topic = null;

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    const priorityMatch = line.match(/^##\s+(P[0-2])(?:：|:)\s*(.+)$/i);
    if (priorityMatch) {
      const code = priorityMatch[1].toUpperCase();
      priority = { code, title: priorityMatch[2].trim(), topics: [] };
      priorities.push(priority);
      topic = null;
      return;
    }

    const topicMatch = line.match(/^###\s+(.+)$/);
    if (topicMatch && priority) {
      const rawTitle = topicMatch[1].trim();
      topic = {
        index: rawTitle.match(/^(\d+)\./)?.[1] || "",
        title: stripHeadingNumber(rawTitle),
        tasks: [],
      };
      priority.topics.push(topic);
      return;
    }

    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (!taskMatch || !priority) return;

    if (!topic) {
      topic = { index: "", title: "其他待辦", tasks: [] };
      priority.topics.push(topic);
    }

    const text = taskMatch[2].trim();
    topic.tasks.push({
      id: stableId(`${priority.code}|${topic.title}|${text}`),
      text,
      sourceDone: taskMatch[1].toLowerCase() === "x",
      priority: priority.code,
      topic: topic.title,
    });
  });

  return priorities.filter((entry) => entry.topics.some((entryTopic) => entryTopic.tasks.length));
}

function getItemState(task) {
  const saved = state.items[task.id];
  return {
    done: typeof saved?.done === "boolean" ? saved.done : task.sourceDone,
    note: typeof saved?.note === "string" ? saved.note : "",
    updatedAt: saved?.updatedAt || null,
  };
}

function setItemState(task, patch) {
  const current = getItemState(task);
  state.items[task.id] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    text: task.text,
    priority: task.priority,
    topic: task.topic,
  };
  saveState();
}

function allTasks() {
  return model.flatMap((priority) => priority.topics.flatMap((topic) => topic.tasks));
}

function render() {
  dom.checklist.replaceChildren();

  model.forEach((priority) => {
    const priorityFragment = dom.priorityTemplate.content.cloneNode(true);
    const priorityBlock = priorityFragment.querySelector(".priority-block");
    priorityBlock.dataset.priority = priority.code;
    priorityFragment.querySelector(".priority-code").textContent = priority.code;
    priorityFragment.querySelector("h2").textContent = priority.title || PRIORITY_LABELS[priority.code];

    const topicList = priorityFragment.querySelector(".topic-list");
    priority.topics.forEach((topic) => {
      const topicFragment = dom.topicTemplate.content.cloneNode(true);
      const topicBlock = topicFragment.querySelector(".topic-block");
      const topicButton = topicFragment.querySelector(".topic-heading");
      const taskList = topicFragment.querySelector(".task-list");
      const regionId = `region-${stableId(`${priority.code}|${topic.title}`)}`;

      topicFragment.querySelector(".topic-index").textContent = topic.index ? topic.index.padStart(2, "0") : "·";
      topicFragment.querySelector(".topic-heading strong").textContent = topic.title;
      topicButton.setAttribute("aria-controls", regionId);
      taskList.id = regionId;

      topicButton.addEventListener("click", () => {
        const expanded = topicButton.getAttribute("aria-expanded") === "true";
        topicButton.setAttribute("aria-expanded", String(!expanded));
      });

      topic.tasks.forEach((task) => {
        const taskFragment = dom.taskTemplate.content.cloneNode(true);
        const row = taskFragment.querySelector(".task-row");
        const checkbox = taskFragment.querySelector("input[type='checkbox']");
        const text = taskFragment.querySelector(".task-text");
        const details = taskFragment.querySelector(".task-notes");
        const textarea = taskFragment.querySelector("textarea");
        const itemState = getItemState(task);

        row.dataset.taskId = task.id;
        row.dataset.priority = task.priority;
        checkbox.id = task.id;
        checkbox.checked = itemState.done;
        text.textContent = task.text;
        textarea.value = itemState.note;
        textarea.setAttribute("aria-label", `${task.text}的設計備註`);
        row.classList.toggle("is-done", itemState.done);
        details.classList.toggle("has-note", Boolean(itemState.note.trim()));

        checkbox.addEventListener("change", () => {
          setItemState(task, { done: checkbox.checked });
          row.classList.toggle("is-done", checkbox.checked);
          updateProgress();
          applyFilter();
        });

        textarea.addEventListener("input", () => {
          setItemState(task, { note: textarea.value });
          details.classList.toggle("has-note", Boolean(textarea.value.trim()));
        });

        taskList.append(taskFragment);
      });

      topicList.append(topicFragment);
      topicBlock.dataset.topic = topic.title;
    });

    dom.checklist.append(priorityFragment);
  });

  updateSavedAt();
  updateProgress();
  applyFilter();
}

function updateProgress() {
  const tasks = allTasks();
  const completed = tasks.filter((task) => getItemState(task).done).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  dom.progressPercent.textContent = `${percent}%`;
  dom.progressBar.style.width = `${percent}%`;
  dom.progressTrack.setAttribute("aria-valuenow", String(percent));
  dom.completedCount.textContent = String(completed);
  dom.totalCount.textContent = String(tasks.length);

  dom.summaries.forEach((summary) => {
    const code = summary.dataset.summary;
    const priorityTasks = tasks.filter((task) => task.priority === code);
    const priorityDone = priorityTasks.filter((task) => getItemState(task).done).length;
    summary.querySelector("strong").textContent = `${priorityDone} / ${priorityTasks.length}`;
  });

  document.querySelectorAll(".priority-block").forEach((priorityBlock) => {
    const code = priorityBlock.dataset.priority;
    const priorityTasks = tasks.filter((task) => task.priority === code);
    const priorityDone = priorityTasks.filter((task) => getItemState(task).done).length;
    priorityBlock.querySelector(".priority-count").textContent = `${priorityDone} / ${priorityTasks.length} 完成`;
  });

  document.querySelectorAll(".topic-block").forEach((topicBlock) => {
    const rows = [...topicBlock.querySelectorAll(".task-row")];
    const done = rows.filter((row) => row.classList.contains("is-done")).length;
    topicBlock.querySelector(".topic-progress").textContent = `${done}/${rows.length}`;
  });
}

function applyFilter() {
  let visibleRows = 0;

  document.querySelectorAll(".task-row").forEach((row) => {
    const isDone = row.classList.contains("is-done");
    const visible = currentFilter === "all"
      || (currentFilter === "done" && isDone)
      || (currentFilter === "pending" && !isDone);
    row.hidden = !visible;
    if (visible) visibleRows += 1;
  });

  document.querySelectorAll(".topic-block").forEach((topicBlock) => {
    topicBlock.hidden = !topicBlock.querySelector(".task-row:not([hidden])");
  });

  document.querySelectorAll(".priority-block").forEach((priorityBlock) => {
    priorityBlock.hidden = !priorityBlock.querySelector(".topic-block:not([hidden])");
  });

  dom.emptyState.hidden = visibleRows !== 0;
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.toggle("is-error", error);
  dom.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2600);
}

function exportProgress() {
  const payload = {
    format: "soot-and-sin-system-design-checklist",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: BACKLOG_URL,
    items: state.items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `soot-and-sin-design-progress-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("進度備份已匯出。");
}

async function importProgress(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== "soot-and-sin-system-design-checklist" || !payload.items || typeof payload.items !== "object") {
      throw new Error("檔案格式不符");
    }

    state.items = { ...state.items, ...payload.items };
    saveState();
    render();
    showToast("進度備份已匯入並合併。");
  } catch (error) {
    showToast(`無法匯入：${error.message}`, true);
  } finally {
    dom.importInput.value = "";
  }
}

function bindControls() {
  dom.filters.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      dom.filters.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
      applyFilter();
    });
  });

  dom.exportButton.addEventListener("click", exportProgress);
  dom.importInput.addEventListener("change", () => {
    const [file] = dom.importInput.files;
    if (file) importProgress(file);
  });
}

async function initialize() {
  bindControls();
  updateSavedAt();

  try {
    const response = await fetch(BACKLOG_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    model = parseBacklog(await response.text());
    if (!model.length) throw new Error("文件中沒有可用的待辦項目");
    render();
  } catch (error) {
    dom.checklist.innerHTML = `
      <div class="empty-state">
        <strong>無法讀取待設計文件</strong>
        <span>${error.message}</span>
      </div>
    `;
    showToast("待設計文件載入失敗，請稍後重試。", true);
  }
}

initialize();

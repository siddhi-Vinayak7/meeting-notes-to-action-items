const API_BASE_URL = "http://localhost:8000";

// DOM Elements
const notesInput = document.getElementById("notesInput");
const processBtn = document.getElementById("processBtn");
const copyBtn = document.getElementById("copyBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const emptyState = document.getElementById("emptyState");
const skeletonLoader = document.getElementById("skeletonLoader");
const errorBanner = document.getElementById("errorBanner");
const errorIcon = document.getElementById("errorIcon");
const errorMessage = document.getElementById("errorMessage");

const outputContent = document.getElementById("outputContent");
const summaryList = document.getElementById("summaryList");
const decisionsList = document.getElementById("decisionsList");
const actionTableBody = document.getElementById("actionTableBody");
const toast = document.getElementById("toast");

let currentData = null;

// Health Check
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      statusDot.classList.add("online");
      statusText.textContent = "Backend Connected";
    } else {
      statusDot.classList.remove("online");
      statusText.textContent = "Backend Offline";
    }
  } catch (err) {
    statusDot.classList.remove("online");
    statusText.textContent = "Backend Offline";
  }
}

// Process Notes Handler
async function handleProcessNotes() {
  const notesText = notesInput.value.trim();
  if (!notesText) {
    showInlineError("⚠️", "Meeting notes cannot be empty. Please enter your notes on the left.");
    notesInput.focus();
    return;
  }

  // Set Loading & Skeleton State
  processBtn.disabled = true;
  processBtn.innerHTML = `<div class="spinner"></div><span>Processing...</span>`;
  copyBtn.disabled = true;
  currentData = null;

  emptyState.style.display = "none";
  outputContent.style.display = "none";
  errorBanner.style.display = "none";
  skeletonLoader.style.display = "flex";

  try {
    const response = await fetch(`${API_BASE_URL}/api/process-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: notesText }),
    });

    skeletonLoader.style.display = "none";

    if (response.status === 400) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.detail || "Meeting notes cannot be empty.";
      showInlineError("⚠️", msg);
      return;
    }

    if (!response.ok) {
      showInlineError("🤖", "Something went wrong reaching the AI service — please try again");
      return;
    }

    const data = await response.json();

    // Check for specific backend failure error codes
    if (data.error === "model_output_invalid") {
      showInlineError("🤔", "Couldn't understand these notes — try rephrasing");
      return;
    } else if (data.error === "api_call_failed") {
      showInlineError("🔌", "Something went wrong reaching the AI service — please try again");
      return;
    } else if (data.error) {
      showInlineError("⚠️", `Service error: ${data.error}`);
      return;
    }

    // Success path
    currentData = data;
    renderResults(data);

  } catch (error) {
    console.error("Network or execution error processing notes:", error);
    skeletonLoader.style.display = "none";
    showInlineError("🔌", "Something went wrong reaching the AI service — please try again");
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = `<span class="btn-text">Process Notes</span>`;
  }
}

// Display Inline Error Message Banner
function showInlineError(icon, message) {
  emptyState.style.display = "none";
  outputContent.style.display = "none";
  skeletonLoader.style.display = "none";
  
  errorIcon.textContent = icon;
  errorMessage.textContent = message;
  errorBanner.style.display = "flex";
}

// Render Results to UI
function renderResults(data) {
  errorBanner.style.display = "none";
  emptyState.style.display = "none";
  skeletonLoader.style.display = "none";
  outputContent.style.display = "flex";

  // Summary
  summaryList.innerHTML = "";
  if (data.summary && data.summary.length > 0) {
    data.summary.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      summaryList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No summary points provided.";
    li.style.color = "var(--text-muted)";
    summaryList.appendChild(li);
  }

  // Decisions
  decisionsList.innerHTML = "";
  if (data.decisions && data.decisions.length > 0) {
    data.decisions.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      decisionsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No explicit decisions made.";
    li.style.color = "var(--text-muted)";
    decisionsList.appendChild(li);
  }

  // Action Items Table
  actionTableBody.innerHTML = "";
  if (data.action_items && data.action_items.length > 0) {
    data.action_items.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.task || "")}</td>
        <td><span class="badge-owner">${escapeHtml(item.owner || "Unassigned")}</span></td>
        <td><span class="badge-due">${escapeHtml(item.due || "Not specified")}</span></td>
      `;
      actionTableBody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">No action items extracted.</td>`;
    actionTableBody.appendChild(tr);
  }

  copyBtn.disabled = false;
}

// Copy Right Pane as Text
async function handleCopyAsText() {
  if (!currentData) return;

  let textBuffer = "=== SUMMARY ===\n";
  if (currentData.summary && currentData.summary.length > 0) {
    currentData.summary.forEach(item => {
      textBuffer += `• ${item}\n`;
    });
  } else {
    textBuffer += "(No summary points)\n";
  }

  textBuffer += "\n=== KEY DECISIONS ===\n";
  if (currentData.decisions && currentData.decisions.length > 0) {
    currentData.decisions.forEach(item => {
      textBuffer += `• ${item}\n`;
    });
  } else {
    textBuffer += "(No key decisions)\n";
  }

  textBuffer += "\n=== ACTION ITEMS ===\n";
  if (currentData.action_items && currentData.action_items.length > 0) {
    currentData.action_items.forEach(item => {
      textBuffer += `• Task: ${item.task} | Owner: ${item.owner} | Due: ${item.due}\n`;
    });
  } else {
    textBuffer += "(No action items)\n";
  }

  try {
    await navigator.clipboard.writeText(textBuffer.trim());
    showToast("Copied output to clipboard!");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    alert("Could not copy to clipboard automatically.");
  }
}

// Toast notification helper
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Security helper
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Event Listeners
processBtn.addEventListener("click", handleProcessNotes);
copyBtn.addEventListener("click", handleCopyAsText);

// Initial check
checkBackendHealth();

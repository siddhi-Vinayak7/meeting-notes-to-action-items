const API_BASE_URL = "http://127.0.0.1:8000";

// DOM Elements
const notesInput = document.getElementById("notesInput");
const processBtn = document.getElementById("processBtn");
const copyBtn = document.getElementById("copyBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const emptyState = document.getElementById("emptyState");
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
    alert("Please enter some meeting notes before processing.");
    return;
  }

  // Set Loading State
  processBtn.disabled = true;
  processBtn.innerHTML = `<div class="spinner"></div><span>Processing...</span>`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/process-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: notesText }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    currentData = data;
    renderResults(data);
  } catch (error) {
    console.error("Error processing notes:", error);
    alert(`Failed to process notes: ${error.message}. Make sure backend is running on ${API_BASE_URL}.`);
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = `<span class="btn-text">Process Notes</span>`;
  }
}

// Render Results to UI
function renderResults(data) {
  emptyState.style.display = "none";
  outputContent.style.display = "flex";

  // Summary
  summaryList.innerHTML = "";
  (data.summary || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    summaryList.appendChild(li);
  });

  // Decisions
  decisionsList.innerHTML = "";
  (data.decisions || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    decisionsList.appendChild(li);
  });

  // Action Items Table
  actionTableBody.innerHTML = "";
  (data.action_items || []).forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.task)}</td>
      <td><span class="badge-owner">${escapeHtml(item.owner)}</span></td>
      <td><span class="badge-due">${escapeHtml(item.due)}</span></td>
    `;
    actionTableBody.appendChild(tr);
  });

  copyBtn.disabled = false;
}

// Copy Right Pane as Text
async function handleCopyAsText() {
  if (!currentData) return;

  let textBuffer = "=== SUMMARY ===\n";
  (currentData.summary || []).forEach(item => {
    textBuffer += `• ${item}\n`;
  });

  textBuffer += "\n=== KEY DECISIONS ===\n";
  (currentData.decisions || []).forEach(item => {
    textBuffer += `• ${item}\n`;
  });

  textBuffer += "\n=== ACTION ITEMS ===\n";
  (currentData.action_items || []).forEach(item => {
    textBuffer += `• Task: ${item.task} | Owner: ${item.owner} | Due: ${item.due}\n`;
  });

  try {
    await navigator.clipboard.writeText(textBuffer.trim());
    showToast("Copied to clipboard!");
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

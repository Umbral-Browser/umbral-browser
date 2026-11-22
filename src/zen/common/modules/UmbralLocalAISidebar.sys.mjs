/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This module is loaded in each browser window. Its conversation and request
// controller therefore belong to that window and are never written to disk.
const enabledPref = "umbral.ai.enabled";
const conversation = [];
let requestAbort = null;

function enabled() {
  return Services.prefs.getBoolPref(enabledPref, false);
}

function init() {
  const panel = document.getElementById("umbral-ai-sidebar");
  const splitter = document.getElementById("umbral-ai-sidebar-splitter");
  const toggle = document.getElementById("umbral-ai-sidebar-toggle");
  if (!panel || !splitter || !toggle || window.gUmbralLocalAISidebar) return;
  window.MozXULElement.insertFTLIfNeeded(
    "browser/preferences/zen-preferences.ftl",
  );

  toggle.setAttribute("aria-controls", panel.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.hidden = !enabled();
  document.l10n.translateFragment(toggle).catch(console.error);
  document.l10n.translateFragment(panel).catch(console.error);

  const log = document.getElementById("umbral-ai-sidebar-conversation");
  const content = document.getElementById("umbral-ai-sidebar-content");
  const empty = document.getElementById("umbral-ai-sidebar-empty");
  const form = document.getElementById("umbral-ai-sidebar-form");
  const prompt = document.getElementById("umbral-ai-sidebar-prompt");
  const send = document.getElementById("umbral-ai-sidebar-send");
  const cancel = document.getElementById("umbral-ai-sidebar-cancel");
  const clear = document.getElementById("umbral-ai-sidebar-clear");
  const status = document.getElementById("umbral-ai-sidebar-status");
  const unconfigured = document.getElementById("umbral-ai-sidebar-unconfigured");
  const formContainer = document.getElementById("umbral-ai-sidebar-form-container");

  function configured() {
    const { hasLocalAIConfiguration } = ChromeUtils.importESModule(
      "chrome://browser/content/UmbralLocalAI.sys.mjs",
    );
    return hasLocalAIConfiguration();
  }

  function updateConfiguration() {
    const ready = configured();
    unconfigured.hidden = ready;
    content.hidden = !ready;
    formContainer.hidden = !ready;
    send.disabled = !ready || !enabled() || !!requestAbort || !prompt.value.trim();
  }

  function render() {
    log.replaceChildren();
    empty.hidden = conversation.length > 0;
    log.hidden = conversation.length === 0;
    clear.disabled = conversation.length === 0;
    for (const item of conversation) {
      const entry = document.createElement("div");
      entry.className = `umbral-ai-message umbral-ai-${item.role}-message`;
      entry.textContent = item.content;
      log.appendChild(entry);
    }
    log.scrollTop = log.scrollHeight;
  }

  function close() {
    panel.collapsed = true;
    splitter.collapsed = true;
    toggle.setAttribute("aria-expanded", "false");
    if (!toggle.hidden) {
      window.requestAnimationFrame(() => {
        if (panel.collapsed && !toggle.hidden) toggle.focus();
      });
    }
  }

  function updateEnabled() {
    toggle.hidden = !enabled();
    updateConfiguration();
    if (!enabled()) {
      requestAbort?.abort();
      close();
    }
  }

  toggle.addEventListener("command", () => {
    if (!enabled()) return;
    const opening = panel.collapsed;
    panel.collapsed = !opening;
    splitter.collapsed = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) {
      (configured()
        ? prompt
        : document.getElementById("umbral-ai-sidebar-configure")
      ).focus();
    }
  });
  document.getElementById("umbral-ai-sidebar-configure").addEventListener("command", () => {
    openPreferences("paneUmbralAI");
  });
  prompt.addEventListener("input", () => {
    send.disabled = !enabled() || !configured() || !!requestAbort || !prompt.value.trim();
  });
  document
    .getElementById("umbral-ai-sidebar-close")
    .addEventListener("command", close);
  clear.addEventListener("command", () => {
    conversation.splice(0);
    render();
    status.removeAttribute("data-l10n-id");
    status.textContent = "";
  });
  cancel.addEventListener("click", () => requestAbort?.abort());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = prompt.value.trim();
    if (!enabled() || !configured() || requestAbort || !text || text.length > 4000) return;

    conversation.push({ role: "user", content: text });
    render();
    prompt.value = "";
    send.disabled = true;
    cancel.hidden = false;
    status.setAttribute("data-l10n-id", "umbral-ai-request-pending");
    requestAbort = new AbortController();
    const controller = requestAbort;
    try {
      const { requestCompletion } = ChromeUtils.importESModule(
        "chrome://browser/content/UmbralLocalAI.sys.mjs",
      );
      let requestMessages = [];
      let chars = 0;
      for (const item of [...conversation].reverse()) {
        if (requestMessages.length >= 40 || chars + item.content.length > 32000)
          break;
        requestMessages.unshift({ role: item.role, content: item.content });
        chars += item.content.length;
      }
      const answer = await requestCompletion(text, {
        signal: controller.signal,
        messages: requestMessages,
      });
      conversation.push({ role: "assistant", content: answer });
      render();
      status.removeAttribute("data-l10n-id");
      status.textContent = "";
    } catch (error) {
      status.setAttribute(
        "data-l10n-id",
        controller.signal.aborted || !enabled()
          ? "umbral-ai-request-cancelled"
          : error.name === "AbortError"
            ? "umbral-ai-request-timeout"
            : error.name === "UmbralLocalAIResponseError"
              ? "umbral-ai-response-error"
              : "umbral-ai-request-error",
      );
    } finally {
      if (requestAbort === controller) requestAbort = null;
      cancel.hidden = true;
      send.disabled = !enabled() || !configured() || !prompt.value.trim();
    }
  });

  const controller = {
    close,
    get conversation() {
      return conversation.map((item) => ({ ...item }));
    },
  };
  window.gUmbralLocalAISidebar = controller;
  Services.prefs.addObserver(enabledPref, updateEnabled);
  for (const pref of ["umbral.ai.endpoint", "umbral.ai.model"]) {
    Services.prefs.addObserver(pref, updateConfiguration);
  }
  window.addEventListener(
    "unload",
    () => {
      requestAbort?.abort();
      Services.prefs.removeObserver(enabledPref, updateEnabled);
      for (const pref of ["umbral.ai.endpoint", "umbral.ai.model"]) {
        Services.prefs.removeObserver(pref, updateConfiguration);
      }
      delete window.gUmbralLocalAISidebar;
    },
    { once: true },
  );
  render();
  updateEnabled();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

import { marked } from "/vendor/marked.esm.js";
import DOMPurify from "/vendor/purify.es.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts", "YouTube", "Facebook", "LinkedIn", "X", "Pinterest", "Threads"];
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Where each tool's output naturally leads next.
const NEXT_STEPS = {
  calendar: ["hooks", "scripts", "schedule"],
  hooks: ["scripts", "captions"],
  design: ["captions", "hooks"],
  scripts: ["captions", "design"],
  captions: ["engagement", "design"],
  engagement: ["calendar", "hooks"],
  schedule: ["calendar"],
};

// ---------- storage (browser-local; every access guarded) ----------
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`cs.${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`cs.${key}`, JSON.stringify(value));
    } catch {
      toast("Couldn't save in this browser (storage is blocked or full).");
    }
  },
};

const state = {
  tools: [],
  profile: store.get("profile", {}),
  notes: store.get("notes", []),
  library: store.get("library", []),
  current: null, // { tool, values, turns, output, controller }
  prefill: null, // values carried over from a "next step" chip
};

// ---------- boot ----------
init();

async function init() {
  try {
    const res = await fetch("/api/tools");
    const data = await res.json();
    state.tools = data.tools;
    $("#model-label").textContent = `Research + writing by ${data.model}`;
  } catch {
    toast("Couldn't reach the server. Is it running?");
    return;
  }
  renderNav();
  renderProfileForm();
  renderNotes();
  renderLibrary();
  bindStatic();
  window.addEventListener("hashchange", route);
  route();
}

function route() {
  const [view, id] = location.hash.replace(/^#\/?/, "").split("/");
  $$(".view").forEach((v) => (v.hidden = true));
  $$(".nav-item").forEach((b) => b.classList.remove("active"));
  document.body.classList.remove("menu-open");

  if (view === "profile" || view === "notes" || view === "library") {
    $(`#view-${view}`).hidden = false;
    $(`.nav-item[data-view="${view}"]`)?.classList.add("active");
    if (view === "library") showLibraryList();
    return;
  }
  const tool = state.tools.find((t) => t.id === id) || state.tools[0];
  $(`.nav-item[data-tool="${tool.id}"]`)?.classList.add("active");
  $("#view-tool").hidden = false;
  openTool(tool);
}

function renderNav() {
  $("#tool-nav").innerHTML = state.tools
    .map((t) => `<li><button class="nav-item" data-tool="${t.id}"><span class="nav-num">${t.number}</span>${esc(t.name)}</button></li>`)
    .join("");
  $$(".nav-item[data-tool]").forEach((b) => b.addEventListener("click", () => (location.hash = `#tool/${b.dataset.tool}`)));
  updateCounts();
}

function bindStatic() {
  $$("[data-view]").forEach((b) => b.addEventListener("click", () => (location.hash = `#${b.dataset.view}`)));
  $("#menu-toggle").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  $(".main").addEventListener("click", (e) => {
    if (!e.target.closest("#menu-toggle")) document.body.classList.remove("menu-open");
  });
  $("#stop-btn").addEventListener("click", () => state.current?.controller?.abort());
  $("#copy-btn").addEventListener("click", () => copy(state.current?.output || ""));
  $("#download-btn").addEventListener("click", () => {
    const c = state.current;
    if (c) download(`${c.tool.id}-${slug(titleFor(c))}.md`, c.output, "text/markdown");
  });
  $("#csv-btn").addEventListener("click", downloadCsv);
  $("#save-btn").addEventListener("click", saveCurrent);
  $("#refine-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("#refine-input").value.trim();
    if (!text || !state.current) return;
    $("#refine-input").value = "";
    const c = state.current;
    c.turns.push({ role: "assistant", text: c.output }, { role: "user", text: `${text}\n\nKeep the same structure and return the full revised version. Do new research if the change needs it.` });
    run();
  });
}

// ---------- tool form ----------
function openTool(tool) {
  if (state.current?.tool.id !== tool.id) {
    state.current?.controller?.abort();
    state.current = null;
    $("#run").hidden = true;
  }
  $("#tool-title").textContent = `${tool.number}. ${tool.name}`;
  $("#tool-tagline").textContent = tool.tagline;
  $("#profile-hint").hidden = Boolean(state.profile.niche);

  const prefill = state.prefill || {};
  state.prefill = null;
  const form = $("#tool-form");
  form.innerHTML =
    tool.fields.map((f) => fieldHtml(f, initialValue(f, prefill))).join("") +
    `<div class="form-foot"><button class="btn primary" type="submit">Research &amp; create</button><span class="muted">Live web research runs every time — usually 1–3 minutes.</span></div>`;
  form.onsubmit = (e) => {
    e.preventDefault();
    const values = readForm(tool, form);
    const missing = tool.fields.filter((f) => f.required && isEmpty(values[f.id]));
    if (missing.length) return toast(`Fill in: ${missing.map((f) => f.label).join(", ")}`);
    state.current = { tool, values, turns: [], output: "" };
    run();
  };
}

function initialValue(f, prefill) {
  if (prefill[f.id] != null) return prefill[f.id];
  if (f.fromProfile) {
    const pv = state.profile[f.fromProfile];
    if (!isEmpty(pv)) return f.type === "select" && Array.isArray(pv) ? pv.find((p) => f.options.includes(p)) : pv;
  }
  if (f.default === "today") return new Date().toISOString().slice(0, 10);
  if (f.default === "auto") return state.profile.timezone || LOCAL_TZ;
  return f.default ?? "";
}

function fieldHtml(f, value) {
  const req = f.required ? " required" : "";
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : "";
  const label = esc(f.label);
  switch (f.type) {
    case "textarea":
      return `<label>${label}<textarea name="${f.id}" rows="3"${ph}${req}>${esc(value)}</textarea></label>`;
    case "select":
      return `<label>${label}<select name="${f.id}">${f.options
        .map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`)
        .join("")}</select></label>`;
    case "multi": {
      const chosen = Array.isArray(value) ? value : [];
      return `<fieldset><legend>${label}</legend><div class="checks">${f.options
        .map((o) => `<label class="check"><input type="checkbox" name="${f.id}" value="${esc(o)}"${chosen.includes(o) ? " checked" : ""} /><span>${esc(o)}</span></label>`)
        .join("")}</div></fieldset>`;
    }
    case "number":
      return `<label>${label}<input type="number" name="${f.id}" value="${esc(value)}" min="${f.min ?? ""}" max="${f.max ?? ""}"${req} /></label>`;
    case "date":
      return `<label>${label}<input type="date" name="${f.id}" value="${esc(value)}"${req} /></label>`;
    default:
      return `<label>${label}<input name="${f.id}" value="${esc(value)}"${ph}${req} /></label>`;
  }
}

function readForm(tool, form) {
  const values = {};
  for (const f of tool.fields) {
    if (f.type === "multi") values[f.id] = $$(`input[name="${f.id}"]:checked`, form).map((i) => i.value);
    else if (f.type === "number") values[f.id] = Number(form.elements[f.id].value) || f.default;
    else values[f.id] = form.elements[f.id].value.trim();
  }
  return values;
}

// ---------- running a tool ----------
async function run() {
  const c = state.current;
  c.controller?.abort();
  const controller = new AbortController();
  c.controller = controller;
  const previous = c.output;
  c.output = "";

  $("#run").hidden = false;
  $("#output").innerHTML = "";
  $("#error").hidden = true;
  $("#activity").innerHTML = "";
  $("#sources").innerHTML = "";
  $("#sources-card").hidden = true;
  $("#actions").hidden = true;
  $("#next-card").hidden = true;
  $("#refine-form").hidden = true;
  $("#stop-btn").hidden = false;
  $("#research-pulse").classList.add("on");
  $("#research-title").textContent = c.turns.length ? "Refining" : "Researching";
  $("#research-counts").textContent = "";
  $("#run").scrollIntoView({ behavior: "smooth", block: "start" });
  setBusy(true);

  let searches = 0;
  let sources = 0;
  const counts = () => ($("#research-counts").textContent = `${searches} searches · ${sources} sources`);
  addActivity("Starting live research");

  let pending = false;
  const paint = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      $("#output").innerHTML = renderMarkdown(c.output);
    });
  };

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        toolId: c.tool.id,
        values: c.values,
        turns: c.turns,
        profile: state.profile,
        notes: state.notes,
        timezone: state.profile.timezone || LOCAL_TZ,
        today: localDate(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    for await (const { event, data } of readSse(res.body)) {
      if (event === "status") {
        if (data.kind === "search") counts(++searches);
        addActivity(data.text, data.kind);
      } else if (event === "source") {
        sources++;
        counts();
        addSource(data);
      } else if (event === "text") {
        if (!c.output) addActivity("Writing", "write");
        c.output += data.text;
        paint();
      } else if (event === "error") {
        throw new Error(data.message);
      } else if (event === "done") {
        addActivity(`Done — ${data.searches} searches, ${data.sources} sources`, "done");
        if (data.stopReason === "max_tokens") showError("The response hit its length limit and may be cut off. Try asking for fewer items.");
      }
    }
  } catch (err) {
    if (err.name === "AbortError") addActivity("Stopped", "done");
    else showError(err.message);
  } finally {
    if (c === state.current) {
      if (!c.output.trim() && previous) {
        // A refine that produced nothing: drop its turns and keep the last good version.
        c.turns.splice(-2);
        c.output = previous;
      }
      $("#output").innerHTML = renderMarkdown(c.output);
      finishRun(c);
    }
  }
}

function finishRun(c) {
  setBusy(false);
  $("#stop-btn").hidden = true;
  $("#research-pulse").classList.remove("on");
  $("#research-title").textContent = "Research log";
  if (!c.output.trim()) return;
  $("#actions").hidden = false;
  $("#refine-form").hidden = false;
  $("#csv-btn").hidden = !largestTable(c.output);
  $("#save-btn").disabled = false;
  $("#save-btn").textContent = "Save to library";

  const next = (NEXT_STEPS[c.tool.id] || []).map((id) => state.tools.find((t) => t.id === id)).filter(Boolean);
  $("#next-card").hidden = !next.length;
  $("#next-chips").innerHTML = next.map((t) => `<button class="chip" data-next="${t.id}">${t.number}. ${esc(t.name)} →</button>`).join("");
  $$("[data-next]").forEach((b) =>
    b.addEventListener("click", () => {
      const v = c.values;
      state.prefill = { topic: v.topic || v.niche || state.profile.niche, niche: v.niche, platforms: v.platforms };
      location.hash = `#tool/${b.dataset.next}`;
    })
  );
}

async function* readSse(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = "message";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (data) yield { event, data: JSON.parse(data) };
    }
  }
}

function addActivity(text, kind = "info") {
  const list = $("#activity");
  // Collapse repeated "thinking" pings into one line.
  if (kind === "thinking" && list.lastElementChild?.dataset.kind === "thinking") return;
  const li = document.createElement("li");
  li.dataset.kind = kind;
  li.textContent = text;
  list.append(li);
  list.scrollTop = list.scrollHeight;
}

function addSource({ url, title, age }) {
  $("#sources-card").hidden = false;
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = title;
  li.append(a);
  if (age) {
    const s = document.createElement("span");
    s.className = "muted";
    s.textContent = ` · ${age}`;
    li.append(s);
  }
  $("#sources").append(li);
  $("#sources-count").textContent = `(${$("#sources").children.length})`;
}

function showError(msg) {
  $("#error").hidden = false;
  $("#error").textContent = msg;
}

function setBusy(busy) {
  $$('#tool-form button[type="submit"], #refine-form button').forEach((b) => (b.disabled = busy));
}

// ---------- library ----------
function titleFor(c) {
  const v = c.values;
  return v.topic || v.niche || (Array.isArray(v.platforms) ? v.platforms.join(", ") : "") || c.tool.name;
}

function saveCurrent() {
  const c = state.current;
  if (!c?.output) return;
  state.library.unshift({
    id: crypto.randomUUID(),
    toolId: c.tool.id,
    toolName: c.tool.name,
    title: titleFor(c).slice(0, 120),
    values: c.values,
    output: c.output,
    createdAt: new Date().toISOString(),
  });
  store.set("library", state.library);
  renderLibrary();
  $("#save-btn").disabled = true;
  $("#save-btn").textContent = "Saved ✓";
}

function renderLibrary() {
  const q = ($("#library-search")?.value || "").toLowerCase();
  const items = state.library.filter((i) => !q || `${i.title} ${i.toolName} ${i.output}`.toLowerCase().includes(q));
  $("#library-list").innerHTML = items.length
    ? items
        .map(
          (i) => `<li><button class="library-item" data-id="${i.id}">
            <span class="tag">${esc(i.toolName)}</span>
            <strong>${esc(i.title)}</strong>
            <span class="muted">${new Date(i.createdAt).toLocaleDateString()}</span>
          </button></li>`
        )
        .join("")
    : `<li class="empty">${state.library.length ? "No matches." : "Nothing saved yet. Run a tool and hit “Save to library”."}</li>`;
  $$(".library-item").forEach((b) => b.addEventListener("click", () => showLibraryItem(b.dataset.id)));
  updateCounts();
}

function showLibraryList() {
  $("#library-detail").hidden = true;
  $("#library-list").hidden = false;
  $(".library-tools").hidden = false;
}

function showLibraryItem(id) {
  const item = state.library.find((i) => i.id === id);
  if (!item) return;
  $("#library-list").hidden = true;
  $(".library-tools").hidden = true;
  $("#library-detail").hidden = false;
  $("#library-body").innerHTML = renderMarkdown(item.output);
  $("#library-copy").onclick = () => copy(item.output);
  $("#library-delete").onclick = () => {
    if (!confirm("Delete this from your library?")) return;
    state.library = state.library.filter((i) => i.id !== id);
    store.set("library", state.library);
    renderLibrary();
    showLibraryList();
  };
}

$("#library-search").addEventListener("input", renderLibrary);
$("#library-back").addEventListener("click", showLibraryList);
$("#export-btn").addEventListener("click", () => {
  const data = { exportedAt: new Date().toISOString(), profile: state.profile, notes: state.notes, library: state.library };
  download(`content-studio-${localDate()}.json`, JSON.stringify(data, null, 2), "application/json");
});
$("#import-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.profile && typeof data.profile === "object") state.profile = data.profile;
    if (Array.isArray(data.notes)) state.notes = data.notes;
    if (Array.isArray(data.library)) state.library = data.library;
    store.set("profile", state.profile);
    store.set("notes", state.notes);
    store.set("library", state.library);
    renderProfileForm();
    renderNotes();
    renderLibrary();
    toast("Workspace imported.");
  } catch {
    toast("That file isn't a Content Studio export.");
  }
});

// ---------- profile ----------
function renderProfileForm() {
  const form = $("#profile-form");
  const p = state.profile;
  $("#profile-platforms").innerHTML = PLATFORMS.map(
    (o) => `<label class="check"><input type="checkbox" name="platforms" value="${esc(o)}"${(p.platforms || []).includes(o) ? " checked" : ""} /><span>${esc(o)}</span></label>`
  ).join("");
  for (const el of form.elements) {
    if (el.name && el.name !== "platforms") el.value = p[el.name] ?? (el.name === "timezone" ? LOCAL_TZ : "");
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    const next = {};
    for (const el of form.elements) if (el.name && el.name !== "platforms") next[el.name] = el.value.trim();
    next.platforms = $$('input[name="platforms"]:checked', form).map((i) => i.value);
    state.profile = next;
    store.set("profile", next);
    $("#profile-saved").textContent = "Saved ✓";
    setTimeout(() => ($("#profile-saved").textContent = ""), 2000);
  };
}

// ---------- performance notes ----------
function renderNotes() {
  const form = $("#note-form");
  form.elements.date.value ||= localDate();
  form.onsubmit = (e) => {
    e.preventDefault();
    state.notes.push({
      id: crypto.randomUUID(),
      text: form.elements.text.value.trim(),
      result: form.elements.result.value,
      date: form.elements.date.value,
    });
    store.set("notes", state.notes);
    form.elements.text.value = "";
    renderNotes();
  };
  const notes = [...state.notes].reverse();
  $("#note-list").innerHTML = notes.length
    ? notes
        .map(
          (n) => `<li class="note ${esc(n.result)}">
            <div><span class="tag">${esc(n.result)}</span> <span class="muted">${esc(n.date)}</span></div>
            <p>${esc(n.text)}</p>
            <button class="btn ghost small danger" data-del-note="${n.id}">Remove</button>
          </li>`
        )
        .join("")
    : `<li class="empty">No notes yet. After a post has been up a few days, log how it did here.</li>`;
  $$("[data-del-note]").forEach((b) =>
    b.addEventListener("click", () => {
      state.notes = state.notes.filter((n) => n.id !== b.dataset.delNote);
      store.set("notes", state.notes);
      renderNotes();
    })
  );
  updateCounts();
}

function updateCounts() {
  const nc = $("#notes-count");
  const lc = $("#library-count");
  if (nc) nc.textContent = state.notes.length || "";
  if (lc) lc.textContent = state.library.length || "";
}

// ---------- helpers ----------
function renderMarkdown(md) {
  const html = DOMPurify.sanitize(marked.parse(md || ""));
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  $$("a", tpl.content).forEach((a) => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
  $$("table", tpl.content).forEach((t) => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    t.replaceWith(wrap);
    wrap.append(t);
  });
  return tpl.innerHTML;
}

function largestTable(md) {
  let best = null;
  marked.walkTokens(marked.lexer(md || ""), (tok) => {
    if (tok.type === "table" && (!best || tok.rows.length > best.rows.length)) best = tok;
  });
  return best;
}

function downloadCsv() {
  const c = state.current;
  const table = largestTable(c?.output);
  if (!table) return;
  const cell = (s) => `"${String(s).replace(/\*\*|__|`/g, "").replace(/"/g, '""')}"`;
  const rows = [table.header.map((h) => cell(h.text)), ...table.rows.map((r) => r.map((x) => cell(x.text)))];
  download(`${c.tool.id}-${slug(titleFor(c))}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied.");
  } catch {
    toast("Copy failed — select the text and copy manually.");
  }
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

function isEmpty(v) {
  return v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "content";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

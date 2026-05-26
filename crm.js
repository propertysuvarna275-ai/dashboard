(function () {
  const STORE_TOKEN = "propel_session_token";
  const STORE_USER = "propel_session_user";

  const sources = ["Facebook", "Instagram", "TikTok", "OLX", "WhatsApp", "Referensi", "Affiliate", "Brosur", "Walk In", "Pameran"];
  const statuses = ["Booking", "Pending", "Batal"];
  const clientColumns = ["name", "whatsapp", "source", "firstFollowUp", "status", "visited", "kavling", "result", "cancelReason", "nextFollowUp", "marketing"];

  const $ = (selector) => document.querySelector(selector);
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));

  let session = {
    token: localStorage.getItem(STORE_TOKEN),
    user: safeParse(localStorage.getItem(STORE_USER), null),
  };

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function setSession(token, user) {
    session = { token, user };
    localStorage.setItem(STORE_TOKEN, token);
    localStorage.setItem(STORE_USER, JSON.stringify(user));
  }

  function clearSession() {
    session = { token: null, user: null };
    localStorage.removeItem(STORE_TOKEN);
    localStorage.removeItem(STORE_USER);
  }

  async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (session.token) headers.Authorization = `Bearer ${session.token}`;
    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      const message = payload?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  async function fetchClients(query = "", status = "") {
    const url = new URL("/api/clients", location.origin);
    if (query) url.searchParams.set("q", query);
    if (status) url.searchParams.set("status", status);
    const res = await apiFetch(url.pathname + url.search);
    return res.clients;
  }

  async function fetchClient(id) {
    const res = await apiFetch(`/api/clients/${id}`);
    return res.client;
  }

  async function createClient(data) {
    return apiFetch("/api/clients", { method: "POST", body: data });
  }

  async function updateClient(id, data) {
    return apiFetch(`/api/clients/${id}`, { method: "PATCH", body: data });
  }

  async function deleteClient(id) {
    return apiFetch(`/api/clients/${id}`, { method: "DELETE" });
  }

  async function addClientHistory(id, history) {
    return apiFetch(`/api/clients/${id}/history`, { method: "POST", body: history });
  }

  async function fetchUsers() {
    const res = await apiFetch("/api/users");
    return res.users;
  }

  async function createUser(data) {
    return apiFetch("/api/users", { method: "POST", body: data });
  }

  async function updateUser(id, data) {
    return apiFetch(`/api/users/${id}`, { method: "PATCH", body: data });
  }

  async function deleteUser(id) {
    return apiFetch(`/api/users/${id}`, { method: "DELETE" });
  }

  async function authStatus() {
    const res = await apiFetch("/api/auth/status");
    return res.hasUsers;
  }

  async function authValidate() {
    if (!session.token) return null;
    try {
      const res = await apiFetch("/api/auth/validate");
      setSession(session.token, res.user);
      return res.user;
    } catch {
      clearSession();
      return null;
    }
  }

  async function authLogin(body) {
    const res = await apiFetch("/api/auth/login", { method: "POST", body });
    setSession(res.token, res.user);
    return res.user;
  }

  async function authRegister(body) {
    const res = await apiFetch("/api/auth/register", { method: "POST", body });
    setSession(res.token, res.user);
    return res.user;
  }

  function isAdmin() {
    return session.user?.role === "Admin";
  }

  function canWriteClient() {
    return ["Admin", "Marketing"].includes(session.user?.role);
  }

  function currentPath() {
    return location.pathname.toLowerCase();
  }

  function requireLogin() {
    if (!session.user && !currentPath().includes("login")) {
      location.href = "login.html";
      return false;
    }
    if (currentPath().includes("admin") && !isAdmin()) {
      location.href = "dashboard.html";
      return false;
    }
    if (currentPath().includes("add-client") && !["Admin", "Marketing"].includes(session.user?.role)) {
      location.href = "dashboard.html";
      return false;
    }
    return true;
  }

  function statusClass(status) {
    if (status === "Booking") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "Pending") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  }

  function nav(active) {
    const item = (href, icon, label, key) => `
      <a class="flex items-center gap-3 px-4 py-3 rounded-lg ${active === key ? "bg-primary text-white" : "text-slate-300 hover:bg-white/10"}" href="${href}">
        <span class="material-symbols-outlined">${icon}</span><span class="font-semibold text-sm">${label}</span>
      </a>`;
    const showAdmin = isAdmin();
    const showWrite = canWriteClient();
    const desktopAdd = showWrite ? item("add-client.html", "person_add", "Tambah Konsumen", "add") : "";
    const desktopAdmin = showAdmin ? item("admin.html", "manage_accounts", "Admin", "admin") : "";
    const mobileCols = showAdmin && showWrite ? "grid-cols-5" : showAdmin || showWrite ? "grid-cols-4" : "grid-cols-3";
    return `
      <aside class="hidden md:flex fixed left-0 top-0 h-screen w-[260px] bg-slate-900 text-white flex-col">
        <div class="p-6 border-b border-white/10">
          <h1 class="text-xl font-bold text-emerald-300">Propel CRM</h1>
          <p class="text-xs text-slate-400 mt-1">Database konsumen perumahan</p>
        </div>
        <nav class="flex-1 p-4 space-y-2">
          ${item("dashboard.html", "dashboard", "Dashboard", "dashboard")}
          ${item("lead.html", "group", "Konsumen", "lead")}
          ${desktopAdd}
          ${item("laporan.html", "analytics", "Laporan", "report")}
          ${desktopAdmin}
        </nav>
        <button id="logout" class="m-4 px-4 py-3 rounded-lg bg-white/10 text-left text-sm font-semibold">Logout</button>
      </aside>
      <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 h-20 bg-white border-t border-slate-200 grid ${mobileCols}">
        ${mobile("dashboard.html", "dashboard", "Home", active === "dashboard")}
        ${mobile("lead.html", "group", "Data", active === "lead")}
        ${showWrite ? mobile("add-client.html", "add_circle", "Tambah", active === "add") : ""}
        ${mobile("laporan.html", "analytics", "Report", active === "report")}
        ${showAdmin ? mobile("admin.html", "settings", "Admin", active === "admin") : ""}
      </nav>`;
  }

  function mobile(href, icon, label, active) {
    return `<a class="flex flex-col items-center justify-center gap-1 text-xs ${active ? "text-primary font-bold" : "text-slate-500"}" href="${href}">
      <span class="material-symbols-outlined">${icon}</span><span>${label}</span>
    </a>`;
  }

  function shell(active, title, content) {
    document.body.className = "bg-slate-50 text-slate-900 min-h-screen pb-24 md:pb-0";
    document.body.innerHTML = `
      ${nav(active)}
      <main class="md:ml-[260px] min-h-screen">
        <header class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-8 h-16 flex items-center justify-between">
          <div>
            <h2 class="text-lg md:text-xl font-bold">${title}</h2>
            <p class="hidden md:block text-xs text-slate-500">Login sebagai ${session.user?.name || "User"}</p>
          </div>
          <a href="add-client.html" class="${canWriteClient() ? "hidden md:inline-flex" : "hidden"} items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm">
            <span class="material-symbols-outlined text-[18px]">person_add</span>Tambah Konsumen
          </a>
        </header>
        <section class="p-4 md:p-8 max-w-7xl mx-auto">${content}</section>
      </main>`;
    const logout = $("#logout");
    if (logout) logout.onclick = () => {
      clearSession();
      location.href = "login.html";
    };
  }

  function stat(label, value, icon, color) {
    return `<div class="bg-white border border-slate-200 rounded-lg p-5">
      <div class="flex justify-between items-start"><p class="text-xs uppercase font-bold text-slate-500">${label}</p><span class="material-symbols-outlined ${color}">${icon}</span></div>
      <p class="mt-3 text-3xl font-bold ${color}">${value}</p>
    </div>`;
  }

  function table(data) {
    return `<table class="w-full text-sm">
      <thead><tr class="text-left text-xs uppercase text-slate-500 border-b">
        <th class="py-3 pr-4">Nama</th><th class="py-3 pr-4">WA</th><th class="py-3 pr-4">Sumber</th><th class="py-3 pr-4">Status</th><th class="py-3 pr-4">Marketing</th><th></th>
      </tr></thead>
      <tbody>${data.length ? data.map((c) => `<tr class="border-b last:border-0">
        <td class="py-3 pr-4 font-semibold">${esc(c.name)}</td>
        <td class="py-3 pr-4">${esc(c.whatsapp)}</td>
        <td class="py-3 pr-4">${esc(c.source)}</td>
        <td class="py-3 pr-4"><span class="inline-flex border px-2 py-1 rounded-full text-xs font-bold ${statusClass(c.status)}">${esc(c.status)}</span></td>
        <td class="py-3 pr-4">${esc(c.marketing)}</td>
        <td class="py-3 text-right"><a class="text-primary font-semibold" href="detail-client.html?id=${c.id}">Detail</a></td>
      </tr>`).join("") : `<tr><td class="py-8 text-center text-slate-500" colspan="6">Belum ada data konsumen.</td></tr>`}</tbody>
    </table>`;
  }

  function sourceBars(data) {
    const max = Math.max(1, ...sources.map((s) => data.filter((c) => c.source === s).length));
    return sources.map((s) => {
      const count = data.filter((c) => c.source === s).length;
      return `<div class="mb-3">
        <div class="flex justify-between text-sm mb-1"><span>${esc(s)}</span><span class="font-semibold">${count}</span></div>
        <div class="h-2 bg-slate-100 rounded"><div class="h-2 bg-primary rounded" style="width:${(count / max) * 100}%"></div></div>
      </div>`;
    }).join("");
  }

  function marketingBars(data) {
    const names = [...new Set(data.map((c) => c.marketing).filter(Boolean))];
    const max = Math.max(1, ...names.map((n) => data.filter((c) => c.marketing === n && c.status === "Booking").length));
    return names.map((n) => {
      const count = data.filter((c) => c.marketing === n && c.status === "Booking").length;
      return `<div class="mb-3"><div class="flex justify-between text-sm mb-1"><span>${esc(n)}</span><span class="font-semibold">${count} booking</span></div><div class="h-2 bg-slate-100 rounded"><div class="h-2 bg-emerald-600 rounded" style="width:${(count / max) * 100}%"></div></div></div>`;
    }).join("") || `<p class="text-sm text-slate-500">Belum ada data marketing.</p>`;
  }

  function input(name, label, type, required) {
    return `<label class="text-sm font-semibold">${label}<input name="${name}" type="${type}" ${required ? "required" : ""} class="mt-1 w-full rounded-lg border-slate-300"></label>`;
  }

  function select(name, label, options, required) {
    return `<label class="text-sm font-semibold">${label}<select name="${name}" ${required ? "required" : ""} class="mt-1 w-full rounded-lg border-slate-300">
      <option value="">Pilih ${label}</option>${options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
    </select></label>`;
  }

  function inputValue(name, label, type, value, required) {
    return `<label class="text-sm font-semibold">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} class="mt-1 w-full rounded-lg border-slate-300"></label>`;
  }

  function selectValue(name, label, options, value, required) {
    return `<label class="text-sm font-semibold">${label}<select name="${name}" ${required ? "required" : ""} class="mt-1 w-full rounded-lg border-slate-300">
      <option value="">Pilih ${label}</option>${options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select></label>`;
  }

  function textareaValue(name, label, value) {
    return `<label class="md:col-span-2 text-sm font-semibold">${label}<textarea name="${name}" class="mt-1 w-full rounded-lg border-slate-300" rows="3">${esc(value)}</textarea></label>`;
  }

  function field(label, value) {
    return `<div><dt class="text-xs uppercase font-bold text-slate-500">${label}</dt><dd class="mt-1 font-semibold">${esc(value)}</dd></div>`;
  }

  function history(items) {
    return items.map((h) => `<div class="border-l-2 border-primary pl-4 pb-4">
      <div class="flex items-center justify-between gap-3"><p class="text-xs font-bold text-slate-500">${esc(h.date)}</p><span class="text-xs text-slate-500">oleh ${esc(h.created_by_name)}</span></div>
      <p class="font-semibold">${esc(h.title)}</p>
      <p class="text-sm text-slate-600">${esc(h.note)}</p>
    </div>`).join("") || `<p class="text-sm text-slate-500">Belum ada riwayat follow up.</p>`;
  }

  async function dashboard() {
    const data = await fetchClients();
    const total = data.length;
    const booking = data.filter((x) => x.status === "Booking").length;
    const pending = data.filter((x) => x.status === "Pending").length;
    const batal = data.filter((x) => x.status === "Batal").length;
    shell("dashboard", "Dashboard", `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${stat("Total Konsumen", total, "leaderboard", "text-slate-700")}
        ${stat("Booking", booking, "event_available", "text-emerald-700")}
        ${stat("Pending", pending, "pending_actions", "text-amber-700")}
        ${stat("Batal", batal, "cancel", "text-red-700")}
      </div>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold">Konsumen Terbaru</h3>
            <a href="lead.html" class="text-primary text-sm font-semibold">Lihat semua</a>
          </div>
          <div class="overflow-x-auto">${table(data.slice(0, 6))}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-5">
          <h3 class="font-bold mb-4">Sumber Leads</h3>
          ${sourceBars(data)}
        </div>
      </div>`);
  }

  async function leadList() {
    shell("lead", "Data Konsumen", `
      <div class="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-col md:flex-row gap-3">
        <input id="search" class="flex-1 rounded-lg border-slate-300" placeholder="Cari nama, WA, sumber, kavling, atau marketing">
        <select id="statusFilter" class="rounded-lg border-slate-300">
          <option value="">Semua status</option>${statuses.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
        </select>
      </div>
      <div class="bg-white border border-slate-200 rounded-lg overflow-x-auto"><div id="clientTable"></div></div>`);

    const render = async () => {
      const q = $("#search").value.toLowerCase();
      const status = $("#statusFilter").value;
      const data = await fetchClients(q, status);
      $("#clientTable").innerHTML = table(data);
    };

    $("#search").oninput = render;
    $("#statusFilter").onchange = render;
    await render();
  }

  async function addClient() {
    shell("add", "Tambah Konsumen", `
      <form id="clientForm" class="bg-white border border-slate-200 rounded-lg p-5 grid md:grid-cols-2 gap-4">
        ${input("name", "Nama Konsumen", "text", true)}
        ${input("whatsapp", "Nomor WhatsApp", "tel", true)}
        ${select("source", "Sumber Leads", sources, true)}
        ${input("firstFollowUp", "Tanggal Follow Up Awal", "date", true)}
        ${select("status", "Status Follow Up", statuses, true)}
        ${select("visited", "Sudah Cek Lokasi?", ["Sudah", "Belum"], true)}
        ${input("kavling", "Kavling yang Diminati", "text", false)}
        ${input("nextFollowUp", "Follow Up Selanjutnya", "date", false)}
        <label class="text-sm font-semibold">Marketing yang menambahkan<textarea disabled class="mt-1 w-full rounded-lg border-slate-300 bg-slate-100">${esc(session.user?.name || "")}</textarea></label>
        <label class="md:col-span-2 text-sm font-semibold">Hasil Akhir<textarea name="result" class="mt-1 w-full rounded-lg border-slate-300" rows="3"></textarea></label>
        <label class="md:col-span-2 text-sm font-semibold">Alasan Batal/Pending<textarea name="cancelReason" class="mt-1 w-full rounded-lg border-slate-300" rows="3"></textarea></label>
        <button class="md:col-span-2 bg-primary text-white rounded-lg py-3 font-bold flex items-center justify-center gap-2" type="submit">
          <span class="material-symbols-outlined">save</span>Simpan Konsumen
        </button>
      </form>`);

    $("#clientForm").onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const record = Object.fromEntries(form.entries());
      try {
        const response = await createClient(record);
        location.href = `detail-client.html?id=${response.client.id}`;
      } catch (error) {
        alert(error.message || "Gagal menyimpan konsumen.");
      }
    };
  }

  async function detail() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) {
      shell("lead", "Detail Konsumen", `<div class="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <span class="material-symbols-outlined text-5xl text-slate-300">person_search</span>
          <h3 class="mt-3 text-lg font-bold">Belum ada data konsumen</h3>
          <p class="mt-1 text-sm text-slate-500">Tambahkan konsumen pertama untuk mulai mengisi database.</p>
          <a href="add-client.html" class="mt-5 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold">
            <span class="material-symbols-outlined text-[18px]">person_add</span>Tambah Konsumen
          </a>
        </div>`);
      return;
    }

    let c;
    try {
      c = await fetchClient(id);
    } catch (error) {
      shell("lead", "Detail Konsumen", `<div class="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <span class="material-symbols-outlined text-5xl text-slate-300">person_off</span>
          <h3 class="mt-3 text-lg font-bold">Konsumen tidak ditemukan</h3>
          <p class="mt-1 text-sm text-slate-500">Silakan kembali ke daftar konsumen.</p>
          <a href="lead.html" class="mt-5 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold">Kembali</a>
        </div>`);
      return;
    }

    const adminClientTools = isAdmin() ? `
      <div class="bg-white border border-slate-200 rounded-lg p-5 mt-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h3 class="font-bold">Edit Database Konsumen</h3>
          <button id="deleteClient" class="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold" type="button">
            <span class="material-symbols-outlined text-[18px]">delete</span>Hapus
          </button>
        </div>
        <form id="editClientForm" class="grid md:grid-cols-2 gap-4">
          ${inputValue("name", "Nama Konsumen", "text", c.name, true)}
          ${inputValue("whatsapp", "Nomor WhatsApp", "tel", c.whatsapp, true)}
          ${selectValue("source", "Sumber Leads", sources, c.source, true)}
          ${inputValue("firstFollowUp", "Tanggal Follow Up Awal", "date", c.firstFollowUp, true)}
          ${selectValue("status", "Status Follow Up", statuses, c.status, true)}
          ${selectValue("visited", "Sudah Cek Lokasi?", ["Sudah", "Belum"], c.visited, true)}
          ${inputValue("kavling", "Kavling yang Diminati", "text", c.kavling || "", false)}
          ${inputValue("nextFollowUp", "Follow Up Selanjutnya", "date", c.nextFollowUp || "", false)}
          ${inputValue("marketing", "Marketing", "text", c.marketing, true)}
          ${textareaValue("result", "Hasil Akhir", c.result || "")}
          ${textareaValue("cancelReason", "Alasan Batal/Pending", c.cancelReason || "")}
          <button class="md:col-span-2 bg-primary text-white rounded-lg py-3 font-bold flex items-center justify-center gap-2" type="submit">
            <span class="material-symbols-outlined">save</span>Simpan Perubahan
          </button>
        </form>
      </div>` : "";

    const followUpForm = canWriteClient() ? `
        <form id="historyForm" class="grid md:grid-cols-[160px_1fr_auto] gap-3 mb-5">
          <input name="date" type="date" required value="${esc(new Date().toISOString().slice(0, 10))}" class="rounded-lg border-slate-300">
          <input name="note" required placeholder="Catatan follow up" class="rounded-lg border-slate-300">
          <button class="bg-slate-900 text-white px-4 rounded-lg font-semibold">Tambah</button>
        </form>` : `<p class="mb-5 text-sm text-slate-500">Role Manager hanya dapat melihat riwayat follow up.</p>`;

    shell("lead", "Detail Konsumen", `
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div class="flex justify-between gap-3">
            <div><p class="text-xs uppercase font-bold text-slate-500">Nama Konsumen</p><h3 class="text-2xl font-bold">${esc(c.name)}</h3></div>
            <span class="h-fit border px-3 py-1 rounded-full text-sm font-bold ${statusClass(c.status)}">${esc(c.status)}</span>
          </div>
          <dl class="grid md:grid-cols-2 gap-4 mt-6 text-sm">
            ${field("Nomor WA", c.whatsapp)}${field("Sumber Leads", c.source)}${field("Follow Up Awal", c.firstFollowUp)}
            ${field("Cek Lokasi", c.visited)}${field("Kavling Diminati", c.kavling || "-")}${field("Marketing", c.marketing)}
            ${field("Follow Up Selanjutnya", c.nextFollowUp || "-")}${field("Alasan Batal/Pending", c.cancelReason || "-")}
          </dl>
          <div class="mt-5 p-4 bg-slate-50 rounded-lg"><p class="text-xs uppercase font-bold text-slate-500 mb-1">Hasil Akhir</p><p>${esc(c.result || "-")}</p></div>
        </div>
        <div class="bg-primary text-white rounded-lg p-5">
          <p class="text-sm opacity-80">Hubungi lewat WhatsApp</p>
          <p class="text-xl font-bold mt-2">${esc(c.whatsapp)}</p>
          <a class="mt-5 inline-flex w-full justify-center gap-2 bg-white text-primary rounded-lg py-3 font-bold" href="https://wa.me/${normalizeWa(c.whatsapp)}" target="_blank"><span class="material-symbols-outlined">chat</span>Chat</a>
        </div>
      </div>
      ${adminClientTools}
      <div class="bg-white border border-slate-200 rounded-lg p-5 mt-6">
        <h3 class="font-bold mb-4">Riwayat Follow Up</h3>
        ${followUpForm}
        <div id="historyList">${history(c.history || [])}</div>
      </div>`);

    const editClientForm = $("#editClientForm");
    if (editClientForm) {
      editClientForm.onsubmit = async (event) => {
        event.preventDefault();
        const updated = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          await updateClient(c.id, updated);
          location.reload();
        } catch (error) {
          alert(error.message || "Gagal menyimpan perubahan.");
        }
      };
    }

    const deleteClientButton = $("#deleteClient");
    if (deleteClientButton) {
      deleteClientButton.onclick = async () => {
        if (!confirm(`Hapus data konsumen ${c.name}?`)) return;
        try {
          await deleteClient(c.id);
          location.href = "lead.html";
        } catch (error) {
          alert(error.message || "Gagal menghapus konsumen.");
        }
      };
    }

    const historyForm = $("#historyForm");
    if (historyForm) {
      historyForm.onsubmit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await addClientHistory(c.id, { date: form.get("date"), note: form.get("note") });
          const updated = await fetchClient(c.id);
          $("#historyList").innerHTML = history(updated.history || []);
          event.currentTarget.reset();
        } catch (error) {
          alert(error.message || "Gagal menambahkan riwayat follow up.");
        }
      };
    }
  }

  async function report() {
    const data = await fetchClients();
    const booking = data.filter((x) => x.status === "Booking").length;
    const pending = data.filter((x) => x.status === "Pending").length;
    const batal = data.filter((x) => x.status === "Batal").length;
    shell("report", "Laporan", `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${stat("Total Leads", data.length, "leaderboard", "text-slate-700")}
        ${stat("Booking", booking, "event_available", "text-emerald-700")}
        ${stat("Pending", pending, "pending_actions", "text-amber-700")}
        ${stat("Batal", batal, "cancel", "text-red-700")}
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white border border-slate-200 rounded-lg p-5"><h3 class="font-bold mb-4">Distribusi Sumber Leads</h3>${sourceBars(data)}</div>
        <div class="bg-white border border-slate-200 rounded-lg p-5"><h3 class="font-bold mb-4">Performa Marketing</h3>${marketingBars(data)}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-lg p-5 mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold">Database Konsumen</h3>
          <button id="exportCsv" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Export CSV</button>
        </div>
        <div class="overflow-x-auto">${table(data)}</div>
      </div>`);

    $("#exportCsv").onclick = () => {
      const rows = [clientColumns].concat(data.map((c) => clientColumns.map((k) => `"${String(c[k] || "").replace(/"/g, '""')}"`)));
      const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "laporan-konsumen.csv";
      link.click();
    };
  }

  async function admin() {
    const data = await fetchUsers();
    shell("admin", "Manajemen Login User", `
      <form id="userForm" class="bg-white border border-slate-200 rounded-lg p-5 grid md:grid-cols-5 gap-3 mb-6">
        <input name="name" required placeholder="Nama user" class="rounded-lg border-slate-300">
        <input name="email" required type="email" placeholder="Email login" class="rounded-lg border-slate-300">
        <input name="password" required placeholder="Password" class="rounded-lg border-slate-300">
        <select name="role" class="rounded-lg border-slate-300"><option>Admin</option><option>Manager</option><option>Marketing</option></select>
        <button class="bg-primary text-white rounded-lg font-bold">Tambah User</button>
      </form>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4" id="userCards">${userCards(data)}</div>
      <p class="mt-5 text-sm text-slate-500">Catatan: login ini cocok untuk prototype statis. Untuk produksi, gunakan auth server-side seperti Supabase Auth, Firebase Auth, atau backend sendiri.</p>`);

    $("#userForm").onsubmit = async (event) => {
      event.preventDefault();
      const record = Object.fromEntries(new FormData(event.currentTarget).entries());
      try {
        await createUser(record);
        const refreshed = await fetchUsers();
        $("#userCards").innerHTML = userCards(refreshed);
        event.currentTarget.reset();
      } catch (error) {
        alert(error.message || "Gagal membuat user.");
      }
    };

    $("#userCards").onclick = async (event) => {
      const action = event.target.closest("[data-action]");
      if (!action) return;
      const card = event.target.closest("[data-user-id]");
      const id = card.dataset.userId;
      if (action.dataset.action === "delete-user") {
        if (!confirm("Hapus akun ini?")) return;
        try {
          await deleteUser(id);
          const refreshed = await fetchUsers();
          $("#userCards").innerHTML = userCards(refreshed);
        } catch (error) {
          alert(error.message || "Gagal menghapus user.");
        }
      }
    };

    $("#userCards").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.target.closest("form[data-user-id]");
      if (!form) return;
      const id = form.dataset.userId;
      const changes = Object.fromEntries(new FormData(form).entries());
      changes.active = changes.active === "true";
      try {
        await updateUser(id, changes);
        const refreshed = await fetchUsers();
        $("#userCards").innerHTML = userCards(refreshed);
      } catch (error) {
        alert(error.message || "Gagal memperbarui user.");
      }
    });
  }

  function userCards(data) {
    return data.map((u) => `<form data-user-id="${u.id}" class="bg-white border border-slate-200 rounded-lg p-5">
      <div class="flex items-start justify-between">
        <div class="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">${esc(u.name).slice(0, 1) || "U"}</div>
        <span class="text-xs font-bold px-2 py-1 rounded-full bg-slate-100">${esc(u.role)}</span>
      </div>
      <div class="mt-4 space-y-3">
        <input name="name" required value="${esc(u.name)}" class="w-full rounded-lg border-slate-300 text-sm" placeholder="Nama user">
        <input name="email" required type="email" value="${esc(u.email)}" class="w-full rounded-lg border-slate-300 text-sm" placeholder="Email login">
        <input name="password" required value="${esc(u.password)}" class="w-full rounded-lg border-slate-300 text-sm" placeholder="Password">
        <div class="grid grid-cols-2 gap-2">
          <select name="role" class="rounded-lg border-slate-300 text-sm">
            ${["Admin", "Manager", "Marketing"].map((role) => `<option value="${role}" ${u.role === role ? "selected" : ""}>${esc(role)}</option>`).join("")}
          </select>
          <select name="active" class="rounded-lg border-slate-300 text-sm">
            <option value="true" ${u.active ? "selected" : ""}>Aktif</option>
            <option value="false" ${!u.active ? "selected" : ""}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-4">
        <button class="bg-primary text-white rounded-lg py-2 text-sm font-bold" type="submit">Simpan</button>
        <button class="bg-red-50 text-red-700 border border-red-100 rounded-lg py-2 text-sm font-bold" type="button" data-action="delete-user">Hapus</button>
      </div>
    </form>`).join("") || `<div class="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">Belum ada user.</div>`;
  }

  function normalizeWa(number) {
    return String(number).replace(/\D/g, "").replace(/^0/, "62");
  }

  async function login() {
    const hasUsers = await authStatus();
    document.body.className = "bg-slate-50 min-h-screen flex items-center justify-center p-4";
    document.body.innerHTML = `
      <main class="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-primary">Propel CRM</h1>
          <p class="text-sm text-slate-500">${hasUsers ? "Masuk untuk mengelola database konsumen perumahan." : "Buat akun Admin pertama untuk mulai memakai sistem."}</p>
        </div>
        <form id="loginForm" class="space-y-4">
          ${hasUsers ? "" : `<label class="block text-sm font-semibold">Nama Admin<input id="name" required class="mt-1 w-full rounded-lg border-slate-300"></label>`}
          <label class="block text-sm font-semibold">Email<input id="email" type="email" required autocomplete="username" class="mt-1 w-full rounded-lg border-slate-300"></label>
          <label class="block text-sm font-semibold">Password<input id="password" type="password" required autocomplete="current-password" class="mt-1 w-full rounded-lg border-slate-300"></label>
          <p id="error" class="hidden text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">Email atau password salah.</p>
          <button class="w-full bg-primary text-white rounded-lg py-3 font-bold">${hasUsers ? "Login" : "Buat Admin"}</button>
        </form>
      </main>`;

    $("#loginForm").onsubmit = async (event) => {
      event.preventDefault();
      const email = $("#email").value.trim().toLowerCase();
      const password = $("#password").value;
      const payload = { email, password };
      try {
        let user;
        if (hasUsers) {
          user = await authLogin(payload);
        } else {
          payload.name = $("#name").value.trim();
          user = await authRegister(payload);
        }
        location.href = user.role === "Admin" ? "admin.html" : "dashboard.html";
      } catch (error) {
        $("#error").textContent = error.message || "Terjadi kesalahan saat login.";
        $("#error").classList.remove("hidden");
      }
    };
  }

  async function boot() {
    if (currentPath() === "/" || currentPath().endsWith("/index.html")) {
      await authValidate();
      location.href = session.user ? "dashboard.html" : "login.html";
      return;
    }

    if (currentPath().includes("login")) return login();
    await authValidate();
    if (!requireLogin()) return;
    if (currentPath().includes("add-client")) return addClient();
    if (currentPath().includes("lead")) return leadList();
    if (currentPath().includes("detail-client")) return detail();
    if (currentPath().includes("laporan")) return report();
    if (currentPath().includes("admin")) return admin();
    return dashboard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

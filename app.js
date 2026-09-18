const MENU = window.NOKTA_MENU;

const els = {
  grid: document.getElementById("category-grid"), tabs: document.getElementById("tabs-inner"),
  root: document.getElementById("menu-root"), search: document.getElementById("search-input"),
  clear: document.getElementById("clear-search"), summary: document.getElementById("menu-summary"),
  title: document.getElementById("menu-title"), sort: document.getElementById("sort-select")
};
const normalize = value => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
const price = value => Number(value).toLocaleString("tr-TR") + " ₺";
const icon = name => '<img src="assets/icons/' + name + '.svg" width="20" height="20" alt="">';
const productImages = window.NOKTA_PRODUCT_IMAGES || {};
const products = new Map();
MENU.forEach(category => category.items.forEach(item => {
  item.id = category.id + ":" + item.name;
  item.image = productImages[item.name]?.image || "";
  item.thumbnail = productImages[item.name]?.thumbnail || item.image;
  products.set(item.id, {item, category});
}));
let favorites;
try {
  const saved = JSON.parse(localStorage.getItem("nokta-favorites") || "[]");
  favorites = new Set(Array.isArray(saved) ? saved.filter(id => products.has(id)) : []);
} catch { favorites = new Set(); }
let activeCategory = "all", query = "", returnCategory = "", sortOrder = "menu";
let currentProduct = "";
const favoriteButton = item => '<button class="favorite-button icon-button' + (favorites.has(item.id) ? ' saved' : '') + '" type="button" data-save="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml(item.name) + (favorites.has(item.id) ? ', favorilerden çıkar' : ', favorilere ekle') + '" aria-pressed="' + favorites.has(item.id) + '" title="' + (favorites.has(item.id) ? "Favorilerden çıkar" : "Favorilere ekle") + '">' + icon("heart") + '</button>';

function readLocation() {
  const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const id = params.get("cat");
  activeCategory = id === "favorites" || MENU.some(c => c.id === id) ? id : "all";
  query = params.get("q") || "";
  sortOrder = ["low","high"].includes(params.get("sort")) ? params.get("sort") : "menu";
  els.search.value = query;
  els.sort.value = sortOrder;
}
function writeLocation(replace = false) {
  const params = new URLSearchParams();
  if (activeCategory !== "all") params.set("cat", activeCategory);
  if (query) params.set("q", query);
  if (sortOrder !== "menu") params.set("sort", sortOrder);
  const url = new URL(location.href);
  url.searchParams.delete("cat"); url.searchParams.delete("q"); url.searchParams.delete("sort");
  url.hash = params.toString();
  if (url.href !== location.href) history[replace ? "replaceState" : "pushState"]({}, "", url);
}
function updateFavorites() {
  document.querySelectorAll("[data-favorite-count]").forEach(el => { el.textContent = favorites.size; });
  document.querySelectorAll("[data-favorites]").forEach(el => { el.setAttribute("aria-label", "Favorilerim, " + favorites.size + " ürün"); });
  document.querySelectorAll(".mobile-action").forEach(el => {
    const selected = query ? el.hasAttribute("data-search") : activeCategory === "favorites" ? el.hasAttribute("data-favorites") : el.hasAttribute("data-home");
    el.classList.toggle("is-active", selected);
  });
}
function itemRow(item) {
  return '<article class="item-row"><button type="button" class="product-open" data-product="' + escapeHtml(item.id) + '">' +
    (item.image ? '<img class="item-thumb" src="' + item.thumbnail + '" width="88" height="88" loading="lazy" decoding="async" alt="">' : '') +
    '<span class="item-copy"><span class="item-name">' + escapeHtml(item.name) + '</span>' +
    (item.note ? '<span class="item-note">' + escapeHtml(item.note) + '</span>' : '') +
    '<span class="item-price">' + price(item.price) + '</span></span></button>' + favoriteButton(item) + '</article>';
}
function render() {
  const home = activeCategory === "all" && !query;
  const needle = normalize(query);
  const visible = MENU.filter(c => ["all","favorites"].includes(activeCategory) || c.id === activeCategory).map(category => {
    const items = category.items.filter(item => (activeCategory !== "favorites" || favorites.has(item.id)) &&
      (!needle || normalize(category.title + " " + item.name + " " + (item.note || "")).includes(needle)));
    if (sortOrder !== "menu") items.sort((a,b) => sortOrder === "low" ? a.price - b.price : b.price - a.price);
    return {...category, items};
  }).filter(c => c.items.length);
  els.grid.hidden = !home;
  els.clear.hidden = !query;
  document.getElementById("sort-control").hidden = home || !visible.length;
  els.title.textContent = query ? "Arama sonuçları" : activeCategory === "favorites" ? "Favorilerim" : activeCategory === "all" ? "Menü" : MENU.find(c => c.id === activeCategory).title;
  document.title = (home ? "Menü" : els.title.textContent) + " | Nokta Lounge";
  els.summary.textContent = home ? MENU.length + " kategori · " + MENU.reduce((sum,c) => sum + c.items.length, 0) + " ürün" : visible.reduce((sum,c) => sum + c.items.length, 0) + " ürün";
  const previousScroll = els.tabs.scrollLeft;
  els.tabs.innerHTML = [{id:"all", title:"Tümü"}, ...MENU].map(c => '<button class="tab-button' + (activeCategory === c.id ? ' active' : '') + '" type="button" data-category="' + c.id + '" aria-pressed="' + (activeCategory === c.id) + '">' + c.title + '</button>').join("");
  els.tabs.scrollLeft = previousScroll;
  const selected = els.tabs.querySelector(".active");
  if (selected) {
    const left = selected.offsetLeft - els.tabs.offsetLeft;
    if (left < els.tabs.scrollLeft || left + selected.offsetWidth > els.tabs.scrollLeft + els.tabs.clientWidth) els.tabs.scrollLeft = Math.max(0, left - 16);
  }
  updateFavorites();
  if (home) { els.root.innerHTML = ""; return; }
  const back = '<button type="button" class="back-button" data-back>' + icon("arrow-left") + 'Tüm kategoriler</button>';
  if (!visible.length) {
    const savedEmpty = activeCategory === "favorites" && !query;
    els.root.innerHTML = back + '<div class="empty-state">' + icon(savedEmpty ? "heart" : "search") + '<h2>' + (savedEmpty ? "Henüz favorin yok" : "Ürün bulunamadı") + '</h2>' +
      (savedEmpty ? "" : '<p>“' + escapeHtml(query) + '” için sonuç yok.</p>') +
      '<button class="reset-search" ' + (savedEmpty ? "data-home" : "data-reset") + ' type="button">' + (savedEmpty ? "Menüye dön" : "Aramayı temizle") + '</button></div>';
    return;
  }
  const grouped = ["all","favorites"].includes(activeCategory);
  els.root.innerHTML = back + visible.map(category => '<section class="menu-category" aria-label="' + category.title + '">' +
    (grouped ? '<header class="menu-head"><h2>' + category.title + '</h2><span class="count-badge">' + category.items.length + ' ürün</span></header>' : '') +
    renderItems(category.items) + '</section>').join("");
}
function renderItems(items) {
  if (sortOrder !== "menu" || !items.some(item => item.group)) return '<div class="item-list">' + items.map(itemRow).join("") + '</div>';
  const groups = new Map();
  for (const item of items) {
    const name = item.group || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return [...groups].map(([name, list]) => '<h3 class="menu-group-title">' + escapeHtml(name) + '</h3><div class="item-list">' + list.map(itemRow).join("") + '</div>').join("");
}
function showCategory(id, replace = false) {
  if (!els.grid.hidden && MENU.some(c => c.id === id)) returnCategory = id;
  els.search.blur();
  activeCategory = id === "favorites" || MENU.some(c => c.id === id) ? id : "all";
  query = ""; els.search.value = ""; sortOrder = "menu"; els.sort.value = "menu";
  writeLocation(replace); render();
  window.scrollTo({top:0, behavior:"instant"});
  if (id === "all" && returnCategory) els.grid.querySelector('[data-category="' + returnCategory + '"]')?.focus({preventScroll:false});
  else els.title.focus({preventScroll:true});
}
function clearSearch() {
  query = ""; els.search.value = ""; activeCategory = "all";
  writeLocation(true); render(); els.search.focus();
}
function productContent(item, category) {
  document.getElementById("product-content").innerHTML =
    (item.image ? '<img class="product-photo" src="' + item.image + '" width="640" height="640" alt="' + escapeHtml(item.name) + '">' : '') +
    '<div class="product-body"><p class="eyebrow">' + category.title + '</p><h2 id="product-title">' + escapeHtml(item.name) + '</h2>' +
    (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '') +
    '<div class="product-bottom"><strong>' + price(item.price) + '</strong>' + favoriteButton(item) + '</div>' +
    (item.image ? '<small class="photo-caption">Görsel temsilidir.</small>' : '') + '</div>';
}
function toggleFavorite(id) {
  if (!products.has(id)) return;
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  try { localStorage.setItem("nokta-favorites", JSON.stringify([...favorites])); } catch {}
  const {item, category} = products.get(id);
  const savedInDialog = document.getElementById("product-dialog").open;
  render();
  if (savedInDialog) {
    productContent(item, category);
    document.querySelector("#product-dialog [data-save]")?.focus({preventScroll:true});
  } else {
    const next = [...els.root.querySelectorAll("[data-save]")].find(el => el.dataset.save === id) || els.root.querySelector("[data-save]") || els.title;
    next.focus({preventScroll:true});
  }
  document.getElementById("menu-announcement").textContent = item.name + (favorites.has(id) ? " favorilere eklendi." : " favorilerden çıkarıldı.");
}
document.getElementById("picker-categories").innerHTML = MENU.map(c => '<button type="button" class="picker-row" data-category="' + c.id + '"><img src="' + c.image + '" width="48" height="48" loading="lazy" alt=""><span>' + c.title + '<small>' + c.items.length + ' ürün</small></span>' + icon("chevron-right") + '</button>').join("");
document.addEventListener("click", event => {
  const category = event.target.closest("[data-category]");
  if (category) {
    event.preventDefault();
    const picker = document.getElementById("category-dialog");
    const wasOpen = picker.open;
    picker.close();
    showCategory(category.dataset.category, wasOpen);
  }
  if (event.target.closest("[data-back]")) showCategory("all");
  if (event.target.closest("[data-reset]")) clearSearch();
  if (event.target.closest("[data-favorites]")) showCategory("favorites");
  if (event.target.closest("[data-picker]")) openDialog(document.getElementById("category-dialog"));
  const save = event.target.closest("[data-save]");
  if (save) toggleFavorite(save.dataset.save);
  const product = event.target.closest("[data-product]");
  if (product && products.has(product.dataset.product)) {
    currentProduct = product.dataset.product;
    const {item, category} = products.get(currentProduct);
    productContent(item, category);
    openDialog(document.getElementById("product-dialog"));
  }
});
els.search.addEventListener("input", () => {
  query = els.search.value.trim(); activeCategory = "all"; writeLocation(true); render();
});
els.sort.addEventListener("change", () => { sortOrder = els.sort.value; writeLocation(true); render(); });
els.clear.addEventListener("click", clearSearch);
els.search.addEventListener("keydown", event => {
  if (event.key === "Escape") clearSearch();
  if (event.key === "Enter") els.search.blur();
});
window.addEventListener("popstate", () => {
  document.querySelectorAll("dialog[open]").forEach(d => d.close());
  readLocation(); render();
  const overlay = history.state?.noktaDialog;
  const dialog = overlay && document.getElementById(overlay);
  if (dialog instanceof HTMLDialogElement) {
    if (overlay === "product-dialog" && products.has(history.state.productId)) {
      currentProduct = history.state.productId;
      const {item, category} = products.get(currentProduct);
      productContent(item, category);
    }
    openDialog(dialog, false);
  }
});
readLocation(); render();

const business = window.NOKTA_BUSINESS || {};
const contactDialog = document.getElementById("contact-dialog");
const privacyDialog = document.getElementById("privacy-dialog");
const digits = value => String(value || "").replace(/[^0-9]/g, "");
const validPhone = value => /^[1-9][0-9]{7,14}$/.test(digits(value));
function safeExternal(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some(host => url.hostname === host || url.hostname.endsWith("." + host)) ? url.href : "";
  } catch { return ""; }
}
function contactLink(href, label, detail, iconName, channel) {
  const link = document.createElement("a");
  link.className = "contact-link" + (channel === "whatsapp" ? " whatsapp-link" : "");
  link.href = href;
  if (!href.startsWith("tel:")) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
  link.dataset.contactChannel = channel;
  link.innerHTML = icon(iconName) + "<span>" + escapeHtml(label) + (detail ? "<small>" + escapeHtml(detail) + "</small>" : "") + "</span>";
  document.getElementById("contact-links").append(link);
}
if (validPhone(business.whatsapp)) {
  const url = new URL("https://wa.me/" + digits(business.whatsapp));
  url.searchParams.set("text", business.whatsappMessage || "Merhaba");
  contactLink(url.href, "WhatsApp", "Bize mesaj gönderin", "message-circle", "whatsapp");
  const floating = document.getElementById("whatsapp-float");
  floating.href = url.href;
  floating.setAttribute("aria-label", "WhatsApp üzerinden Nokta Lounge'a yazın");
  floating.dataset.contactChannel = "whatsapp";
  floating.hidden = false;
  const mobile = document.getElementById("whatsapp-mobile");
  mobile.href = url.href;
  mobile.dataset.contactChannel = "whatsapp";
  mobile.hidden = false;
  document.querySelector(".mobile-bar [data-contact]").hidden = true;
  document.getElementById("whatsapp-pending").hidden = true;
}
if (validPhone(business.phone)) contactLink("tel:+" + digits(business.phone), "Bizi arayın", business.phone, "phone", "phone");
const maps = safeExternal(business.mapsUrl, ["google.com", "maps.app.goo.gl"]);
if (maps) contactLink(maps, "Yol tarifi", business.address, "map-pin", "directions");
else if (business.address) {
  const address = document.createElement("p");
  address.textContent = business.address;
  document.getElementById("contact-links").append(address);
}
const instagram = safeExternal(business.instagramUrl, ["instagram.com"]);
if (instagram) contactLink(instagram, "Instagram", "", "instagram", "instagram");
document.getElementById("contact-pending").hidden = Boolean(document.getElementById("contact-links").children.length);

function openDialog(dialog, record = true) {
  if (dialog.open) return;
  els.search.blur();
  if (record) history.pushState({noktaDialog: dialog.id, productId: currentProduct}, "", location.href);
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add("dialog-open");
}
function closeDialog(dialog) {
  if (history.state?.noktaDialog === dialog.id) history.back();
  else dialog.close();
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener("close", () => {
    document.body.classList.toggle("dialog-open", Boolean(document.querySelector("dialog[open]")));
    if (dialog.id === "product-dialog" && !document.querySelector("dialog[open]")) {
      const button = [...document.querySelectorAll("[data-product]")].find(el => el.dataset.product === currentProduct);
      (button || els.title).focus({preventScroll:true});
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog);
  });
}
document.addEventListener("click", event => {
  if (event.target.closest("[data-home]")) {
    event.preventDefault();
    returnCategory = "";
    showCategory("all");
  }
  if (event.target.closest("[data-search]")) {
    els.search.scrollIntoView({block:"center", behavior:"instant"});
    els.search.focus({preventScroll:true});
  }
  if (event.target.closest("[data-contact]")) openDialog(contactDialog);
  if (event.target.closest("[data-privacy]")) openDialog(privacyDialog);
  if (event.target.closest("[data-close]")) closeDialog(event.target.closest("dialog"));
  const contact = event.target.closest("[data-contact-channel]");
  if (contact) {
    // Local integration hook only; no analytics requests or identifiers are sent.
    window.dispatchEvent(new CustomEvent("nokta:contact", {detail:{channel:contact.dataset.contactChannel}}));
  }
});
if (history.state?.noktaDialog) window.dispatchEvent(new PopStateEvent("popstate"));

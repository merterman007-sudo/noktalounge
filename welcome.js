(() => {
  const campaignKeys = new Set(['gclid', 'gbraid', 'wbraid', 'dclid', 'gad_source', 'gad_campaignid']);
  const incoming = new URLSearchParams(location.search);
  for (const link of document.querySelectorAll('[data-menu-link]')) {
    const url = new URL(link.getAttribute('href'), location.href);
    for (const [key, value] of incoming) {
      if (key.startsWith('utm_') || campaignKeys.has(key)) url.searchParams.set(key, value);
    }
    link.href = url.href;
  }
  const business = window.NOKTA_BUSINESS || {};
  const number = String(business.whatsapp || '').replace(/\D/g, '');
  if (/^[1-9][0-9]{7,14}$/.test(number)) {
    const url = new URL('https://wa.me/' + number);
    url.searchParams.set('text', business.whatsappMessage || 'Merhaba');
    document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = url.href; });
  }
  const phone = String(business.phone || '').replace(/\D/g, '');
  if (/^[1-9][0-9]{7,14}$/.test(phone)) {
    document.querySelectorAll('[data-phone]').forEach(link => { link.href = 'tel:+' + phone; });
  }
  if (business.address) document.querySelectorAll('[data-address]').forEach(el => { el.textContent = business.address; });
  try {
    const maps = new URL(business.mapsUrl);
    if (maps.protocol === 'https:' && ['www.google.com', 'google.com', 'maps.app.goo.gl'].includes(maps.hostname)) {
      document.querySelectorAll('[data-maps]').forEach(link => { link.href = maps.href; });
    }
  } catch {}
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-menu-link], [data-whatsapp], [data-phone], [data-maps]');
    if (!link) return;
    const channel = link.hasAttribute('data-whatsapp') ? 'whatsapp' : link.hasAttribute('data-phone') ? 'phone' : link.hasAttribute('data-maps') ? 'directions' : 'menu';
    window.dispatchEvent(new CustomEvent('nokta:contact', {detail: {channel}}));
  });
})();

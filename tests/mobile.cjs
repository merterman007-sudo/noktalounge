const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const base = process.env.MENU_URL || 'http://localhost:4173/';

async function layout(page) {
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      dialogOverflow: dialog ? dialog.scrollWidth > dialog.clientWidth + 1 : false,
      images: [...document.querySelectorAll('img')].filter(img => img.getBoundingClientRect().width && img.complete && !img.naturalWidth).map(img => img.src)
    };
  });
  assert.equal(result.overflow, false, 'Page overflows horizontally');
  assert.equal(result.dialogOverflow, false, 'Dialog overflows horizontally');
  assert.deepEqual(result.images, [], 'Broken visible images');
}

(async () => {
  for (const [name, engine, options] of [['chromium', chromium, {}], ['webkit', webkit, {}]]) {
    const browser = await engine.launch({headless:true, ...options});
    const context = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    await page.goto(base + '?utm_source=qa&gclid=test', {waitUntil:'networkidle'});
    const categories = await page.evaluate(() => window.NOKTA_MENU.map(c => ({id:c.id, count:c.items.length})));
    assert.equal(categories.reduce((n,c) => n+c.count,0),120);
    assert.equal(await page.locator('#category-grid .category-card').count(),14);
    assert.match(await page.locator('#whatsapp-mobile').getAttribute('href'), /^https:\/\/wa.me\/905308218324\?/);

    for (const size of [[320,568],[360,640],[390,844],[430,932],[844,390],[768,1024],[1440,900]]) {
      await page.setViewportSize({width:size[0],height:size[1]});
      for (const c of categories) {
        await page.locator('.tab-button[data-category="'+c.id+'"]').click();
        assert.equal(await page.locator('[data-product]').count(), c.count);
        await layout(page);
        // WebKit limits history writes; keep this sweep below its navigation quota.
        await page.waitForTimeout(250);
      }
      await page.locator('[data-product]').first().click();
      await page.locator('#product-dialog').waitFor({state:'visible'});
      await layout(page);
      await page.locator('#product-dialog [data-close]').click();
      await page.locator('#product-dialog').waitFor({state:'hidden'});
      console.log(name, size.join('x'), 'all categories passed');
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.tab-button[data-category="ana-yemekler"]').click();
    await page.locator('#sort-select').selectOption('high');
    const prices = await page.locator('.item-price').allTextContents();
    const numbers = prices.map(s => Number(s.replace(/[^0-9]/g,'')));
    assert.deepEqual(numbers,[...numbers].sort((a,b)=>b-a));
    await page.locator('[data-product]').first().click();
    await page.locator('#product-dialog [data-save]').click();
    await page.goBack();
    await page.locator('#product-dialog').waitFor({state:'hidden'});
    await page.locator('.favorites-shortcut').click();
    assert.equal(await page.locator('[data-product]').count(),1);
    await page.reload();
    assert.equal(await page.locator('[data-product]').count(),1);
    await page.locator('#menu-root [data-save]').click();
    assert.equal(await page.locator('.empty-state h2').textContent(),'Henüz favorin yok');
    await page.locator('#search-input').fill('turk kahvesi');
    assert.equal(await page.locator('[data-product]').count(),2);
    await page.locator('#search-input').fill('zzzzzzzzzzz');
    assert.equal(await page.locator('.empty-state h2').textContent(),'Ürün bulunamadı');
    await page.locator('#clear-search').click();
    await page.locator('#search-input').blur();
    await page.locator('[data-picker]').click();
    await page.locator('#category-dialog [data-category="nargile-kafa"]').click();
    await page.locator('#category-dialog').waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-product]').count(),5);
    await page.locator('.header-nav [data-contact]').click();
    assert.equal(await page.locator('#contact-dialog [data-contact-channel="phone"]').getAttribute('href'),'tel:+905308218324');
    await page.locator('#contact-dialog [data-close]').click();
    await page.locator('#contact-dialog').waitFor({state:'hidden'});
    assert.match(page.url(),/utm_source=qa/);
    assert.match(page.url(),/gclid=test/);
    const failedImages = await page.evaluate(async () => {
      const failed = [];
      for (const entry of Object.values(window.NOKTA_PRODUCT_IMAGES)) {
        for (const src of [entry.image,entry.thumbnail]) {
          const image = new Image(); image.src = src;
          try { await image.decode(); } catch { failed.push(src); }
        }
      }
      return failed;
    });
    assert.deepEqual(failedImages,[]);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'test-results/'+name+'-mobile.png',fullPage:true});
    await context.close();
    const nojs = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:568}});
    const fallback = await nojs.newPage();
    await fallback.goto(base);
    assert.equal(await fallback.locator('noscript .item-row').count(),120);
    await nojs.close();
    await browser.close();
    console.log(name + ': navigation, search, sort, favorites, contact, 240 images, no-JS passed');
  }
})().catch(error => { console.error(error); process.exit(1); });

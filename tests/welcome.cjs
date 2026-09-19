const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const base = process.env.MENU_URL || 'http://localhost:4173/';

(async () => {
  for (const [name, engine] of [['chromium',chromium],['webkit',webkit]]) {
    const browser = await engine.launch({headless:true});
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(r.status()+' '+r.url()); });
      for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[844,390],[1440,900]]) {
        await page.setViewportSize({width,height});
        await page.goto(new URL('kesfet.html?utm_source=google&utm_campaign=coffee&gclid=test-click&gbraid=sample',base).href,{waitUntil:'networkidle'});
        const result = await page.evaluate(() => {
          const dock = document.querySelector('.welcome-dock').getBoundingClientRect();
          const viewportBottom = dock.height ? dock.top : innerHeight;
          return {
            overflow: document.documentElement.scrollWidth > innerWidth+1,
            heading: document.querySelector('h1').textContent.replace(/\s+/g,' ').trim(),
            image: document.querySelector('.hero-picture img').naturalWidth > 0,
            nextSectionVisible: document.querySelector('.welcome-selection').getBoundingClientRect().top < viewportBottom,
            background: getComputedStyle(document.body).backgroundColor,
            links:[...document.querySelectorAll('[data-menu-link]')].map(a=>a.href)
          };
        });
        assert.equal(result.overflow,false);
        assert.equal(result.heading,'Nokta Lounge.');
        assert.equal(result.image,true);
        assert.equal(result.background,'rgb(245, 235, 221)');
        // Compact landscape views intentionally prioritize the title and primary action.
        if (height > 500) assert.equal(result.nextSectionVisible,true);
        for (const href of result.links) {
          const link = new URL(href);
          assert.equal(link.searchParams.get('utm_source'),'google');
          assert.equal(link.searchParams.get('gclid'),'test-click');
        }
        await page.locator('.privacy-details summary').click();
        assert.equal(await page.locator('.privacy-details').getAttribute('open'),'');
        assert.match(await page.locator('[data-address]').textContent(), /Eyüpsultan/);
        assert.match(await page.locator('[data-maps]').getAttribute('href'), /0x5eebde93e74113cf/);
        assert.equal(await page.locator('[data-phone]').getAttribute('href'),'tel:+905308218324');
        await page.locator('.selection-item').filter({hasText:'Kahve molası'}).click();
        assert.equal(await page.locator('#menu-title').textContent(),'Sıcak Kahveler');
        assert.equal(new URL(page.url()).searchParams.get('gclid'),'test-click');
        assert.equal(await page.locator('[data-product]').count(),14);
        console.log(name,width+'x'+height,'welcome -> menu passed');
      }
      assert.deepEqual(errors,[]);
      const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
      const nojs = await context.newPage();
      await nojs.goto(new URL('kesfet.html',base).href);
      await nojs.locator('.hero-copy [data-menu-link]').click();
      assert.equal(await nojs.locator('noscript .item-row').count(),120);
      await context.close();
      console.log(name,'welcome no-JS passed');
    } finally { await browser.close(); }
  }
})().catch(e=>{console.error(e);process.exit(1)});

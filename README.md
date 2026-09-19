# Nokta Lounge

Mobil uyumlu dijital menu. 14 kategori, PDF ile eslestirilmis 120 urun,
temsili urun fotograflari, yerel favoriler ve WhatsApp iletisim baglantisi.

Yayin: https://noktalounge.com.tr/

Karsilama sayfasi: https://noktalounge.com.tr/kesfet.html
Mevcut menu adresi ve kategori baglantilari korunur.

## Duzenleme

- `menu-data.js`: urunler, fiyatlar ve kategoriler.
- `product-images.js`: urun fotograflari ve kucuk onizlemeler.
- `business.js`: dogrulanmis iletisim bilgileri.
- `palette.css`: kullanicinin ivory, bordo, espresso, cikolata, terracotta ve sampanya paleti.
- `kesfet.html`, `welcome.css`, `welcome.js`: tanitim sayfasi ve kampanya baglantilari.
- `index.html`: kategori kartlari ve JavaScript kapaliyken kullanilan menu.

Urun degisikliklerinde `index.html` icindeki alternatif menu de guncellenmelidir.
Kaynak PDF ve orijinal buyuk logo yerelde tutulur, yayin reposuna eklenmez.

## Yayin

GitHub Pages, `main` dalinin kok dizininden yayinlanir. Derleme gerektirmez.
Ozel alan adi `CNAME` dosyasinda tanimlidir: `noktalounge.com.tr`.

## Kontrol

Yerel bir statik sunucu baslatin. Node.js ve Playwright'in Chromium/WebKit
tarayicilari kurulu bir ortamda `node tests/mobile.cjs` ile mobil regresyon
kontrollerini calistirin. Varsayilan adres `http://localhost:4173/` olur.
Canli test icin `MENU_URL=https://noktalounge.com.tr/`
ortam degiskenini kullanin. Testler Playwright ile eslesen tarayici surumlerini kullanir.

Testler 7 ekran olcusunde kategori gecisleri, tasma, arama, fiyat siralama,
favoriler, geri tusu, iletisim baglantilari, 240 gorsel ve JavaScript
kapali menu gorunumunu denetler.

`node tests/welcome.cjs` karsilama sayfasinin ekran olculerini, kampanya
bilgilerinin menuye tasinmasini ve JavaScript kapali baglantilari denetler.

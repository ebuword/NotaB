NotaB Launcher, ALT+SPACE kombinasyonu ile masaüstü bilgisayar kullanımınızı daha kolay hale getirmek için tasarlandı. Wikipedia, Google ve YouTube aramalarını hızlıca halledin. Matematiksel hesaplamalar yapın. TMDB entegrasyonu ile dizi-film arayın veya bilgisayardaki uygulamaları hızlıca başlatın. Hepsi tek bir yerde.

<div align="center">
  <img src="landing/assets/logo.png" width="120" alt="NotaB Logo" />
  <h1>NotaB</h1>
  <p>Minimalist, Hızlı ve Akıllı Windows Başlatıcısı</p>
</div>

<p align="center">
  <a href="#özellikler">Özellikler</a> •
  <a href="#kurulum">Kurulum</a> •
  <a href="#kullanım">Kullanım</a> •
  <a href="#derleme">Derleme</a>
</p>

---

**NotaB**, Windows kullanıcıları için geliştirilmiş, Electron tabanlı hızlı bir başlatıcıdır (launcher). MacOS'teki Spotlight veya Windows PowerToys Run benzeri bir deneyim sunar. Sistemde kurulu uygulamaları hızla bulup çalıştırmanın yanı sıra döviz çevirisi, hızlı web aramaları ve TMDB entegrasyonu gibi ek araçları doğrudan klavyenizin ucuna getirir.

Sistem kaynaklarını minimum düzeyde kullanacak şekilde tasarlanmıştır.

## — Özellikler

* **Uygulama Arama ve Başlatma:** Sistemde yüklü olan `.exe` ve `.lnk` dosyalarını tarar. Hatalı yazımları tolere edebilen fuzzy-search algoritması içerir.
* **Kullanım Alışkanlığı (Scoring):** Çok sık arattığınız ve açtığınız uygulamalar skorlanır. Aynı aramayı yaptığınızda en çok kullandığınız uygulama her zaman en üstte çıkar.
* **Hızlı Web Komutları:** Tarayıcıyı açmadan doğrudan arama yapın.
  * `g <sorgu>`: Google araması
  * `y <sorgu>`: YouTube araması
  * `w <sorgu>`: Wikipedia araması
* **Anlık Döviz Çevirici:** `10 eur` veya `50 usd` gibi sorgular yazarak anlık kurlarla döviz çevirisi yapar.
* **Film ve Dizi Arama (TMDB):** TMDB entegrasyonu sayesinde `f <film adı>` şeklinde film bilgisi ve afişi getirebilirsiniz.
* **Pano (Clipboard) Entegrasyonu:** Karşınıza çıkan sonuçları enter'a basarak veya tıklayarak anında kopyalayabilirsiniz.
* **Arka Plan Çalışması:** System tray (sistem tepsisi) üzerinden çalışır, işiniz bittiğinde arka planda gizlenerek kaynak tüketimini azaltır.

## Kurulum

[v1.0.1 Kurulum ve Uygulama Detayları](https://github.com/ebuword/NotaB/releases/tag/v1.0.1) adresinden kurulum dosyasına ve güncel detaylara erişebilirsiniz.

## — Kullanım

Uygulama çalıştıktan sonra arka planda beklemeye başlar. Arayüzü çağırmak için klavyenizden atanan global kısayolu kullanın:

**Varsayılan Kısayol:** `Alt + Space`

Arama çubuğuna yazabileceğiniz bazı örnek sorgular:
* `code` (Visual Studio Code'u bulur ve açar)
* `github` (Varsayılan tarayıcınızda Google üzerinde 'github' araması yapar)
* `100d, 25e` (Dolar veya Euro'nun anlık TL karşılığını gösterir)
* `f: avatar` (TMDB'den Avatar film bilgisi ve afişi)

Ekrana gelen sonuçlar arasında yön tuşlarıyla (Aşağı/Yukarı) gezinebilir ve `Enter` ile işlemi tetikleyebilirsiniz. ESC tuşu veya pencere dışına tıklamak uygulamayı anında gizler.

## — Teknoloji Yığını

* **Electron.js:** Masaüstü pencere yönetimi ve sistem entegrasyonu
* **Node.js (fswin, windows-shortcuts):** Dosya sistemi tarama ve kısayol çözümleme
* **Vanilla HTML/CSS/JS:** Frontend arayüzü (Herhangi bir JS framework'ü kullanılmadan, saf performans odaklı yazılmıştır)
* **electron-builder:** Paketleme ve dağıtım

## 📄 Lisans

Bu proje **EULA Son Kullanıcı Sözleşmesi** ile lisanslanmıştır. Daha fazla bilgi için [EULA Son Kullanıcı Sözleşmesi](https://github.com/ebuword/NotaB?tab=License-1-ov-file) içerisindeki lisans tanımına göz atabilirsiniz.

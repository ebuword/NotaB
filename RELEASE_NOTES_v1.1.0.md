# NotaB v1.1.0 - Ramazan Özel Güncellemesi 🌙

Bu sürümle birlikte NotaB, Ramazan ayına özel akıllı bir özellik ve çeşitli arayüz iyileştirmeleriyle daha güçlü hale geldi!

## ✨ Yenilikler

### 🕌 Akıllı İftar & Sahur Widget'ı
Arama çubuğuna `iftar`, `sahur` veya `namaz` yazarak erişebileceğiniz yepyeni, tamamen yerel (native) tasarlanmış bir widget eklendi.
- **Otomatik Konum:** IP adresiniz üzerinden bulunduğunuz şehri otomatik algılar.
- **Diyanet Uyumlu:** Vakitler AlAdhan API ve Türkiye Diyanet saati (`method=13`) parametresiyle milimetrik hesaplanır.
- **Dinamik Mod:** 
  - `iftar` veya `sahur` yazarsanız İftar/İmsak vaktine odaklanır.
  - `namaz` yazarsanız en yakın namaz vaktine (`Öğle`, `İkindi` vb.) odaklanır.

### 📦 Profesyonel Kurulum Sihirbazı (Setup)
NotaB artık taşınabilir (portable) bir `.exe` yerine tam teşekküllü bir **Windows kurulum sihirbazı** ile dağıtılıyor.
- **Adım adım kurulum:** Kurulum dizinini seçebileceğiniz, dil desteğine sahip profesyonel bir NSIS installer.
- **Otomatik kısayollar:** Masaüstü ve Başlat Menüsüne NotaB kısayolları otomatik oluşturulur.

### 🔄 Windows Açılışında Otomatik Başlatma
- NotaB artık kurulumdan sonra **bilgisayar her açıldığında otomatik olarak arka planda** başlar.
- Sessiz başlangıç modu: Windows açılışında pencere gösterilmez, yalnızca sistem tepsisinde (tray) hazır bekler.
- İlk manuel çalıştırmada bildirim baloncuğu gösterilir, otomatik başlatmada gösterilmez.

### 🔔 Otomatik Güncelleme Sistemi
- GitHub Releases API üzerinden **otomatik sürüm kontrolü** yapar (açılışta ve her 6 saatte bir).
- Yeni sürüm bulunduğunda **tray bildirimi** ve menüde "🔄 Güncelle" butonu belirir.
- Tek tıkla güncellemeyi indirir ve kurulum sihirbazını başlatır.

### 🎨 Görsel İyileştirmeler
- Pencere yükseklikleri ve sonuç konteynerleri widget'lara özel olarak optimize edildi.
- CSS performans iyileştirmeleri ve uyumluluk güncellemeleri yapıldı.
- `Açılış Sayfası (Landing Page):` Yeni özellikler görsel olarak tanıtıldı ve animasyonlar zenginleştirildi.

## 🚀 Kurulum
1. Aşağıdaki `NotaB-Setup-v1.1.0.exe` dosyasını indirin.
2. Kurulum sihirbazını çalıştırın ve yönergeleri takip edin.
3. Kurulum tamamlandıktan sonra `Alt + Space` ile NotaB dünyasına giriş yapın!
4. Bilgisayarınızı yeniden başlattığınızda NotaB otomatik olarak arka planda hazır olacaktır.

---
> [!TIP]
> **Not:** Konum algılama için internet bağlantınızın olması gerekmektedir. İnternet yoksa varsayılan olarak İstanbul vakitleri gösterilir.

> [!WARNING]
> **Windows SmartScreen Uyarısı Hakkında:** Uygulama bağımsız bir geliştirici tarafından sunulduğu için kurulum sırasında "Yayıncı Bilinmiyor" veya "Windows Kişisel Bilgisayarınızı Korudu" uyarısı verebilir. Kuruluma devam etmek için sırasıyla **"Ek bilgi"** ve **"Yine de çalıştır"** seçeneklerine tıklayabilirsiniz. Uygulama tamamen ücretsiz ve güvenlidir.

**Allah orucunuzu kabul etsin. Keyifli kullanımlar.**

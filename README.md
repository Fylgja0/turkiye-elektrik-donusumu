# Türkiye'nin Elektrik Dönüşümü

## 2000–2024: Üretim, kaynaklar ve değişen dengeler

Bu proje, Ember'ın yıllık elektrik verilerinden Türkiye'nin elektrik üretimindeki değişimi inceler ve bulguları kaydırma adımlarıyla değişen grafikler kullanan tek sayfalık bir veri hikâyesine dönüştürür.

## Çalışma sorusu

Türkiye'de elektrik üretimi 2000–2024 arasında nasıl değişti; bu dönemde hangi kaynakların üretimi en çok arttı ve fosil yakıtların toplam üretimdeki payı nasıl değişti?

## Proje yapısı

```text
turkiye-elektrik-donusumu/
├── README.md
├── data/
│   ├── raw/release_generation_yearly_lower.csv
│   └── processed/
├── notebooks/analiz.ipynb
├── site/
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   ├── assets/             # favicon ve sosyal paylaşım görseli
│   └── data/               # notebook'tan üretilen CSV/JSON
└── docs/
    ├── storyboard.pdf
    ├── tasarim-kararlari.pdf
```

## Veri kaynağı ve lisans

- **Kaynak:** [Ember — Yearly Electricity Data](https://ember-energy.org/data/yearly-electricity-data/)
- **Kullanılan dosya:** `data/raw/release_generation_yearly_lower.csv` (Europe CSV)
- **Lisans:** Kaynak sayfasında belirtildiği üzere CC BY 4.0. Yayında atıf yapılmalı ve lisans koşulları korunmalıdır.
- **Kapsam:** Türkiye, 2000–2024
- **Erişim tarihi:** 16 Ekim 2026

## Notebook'u çalıştırma

Linux Mint/Ubuntu üzerinde, proje kök dizinindeyken:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install ipykernel pandas numpy matplotlib ipython notebook
```

VS Code'da `notebooks/analiz.ipynb` dosyasını açıp **Select Kernel → Python Environments → `.venv`** ortamını seçin. Ardından **Restart Kernel and Run All Cells** çalıştırın.

Notebook şu adımları gerçekleştirir:

1. CSV yapısını ve veri tiplerini inceler.
2. Türkiye ve 2000–2024 filtrelerini uygular.
3. Eksik yıl/değer, yinelenen kayıt ve kaynak hiyerarşisi kontrollerini yürütür.
4. Toplam üretim, kaynak payı ve kaynaklar arasındaki mutlak farkı hesaplar.
5. Dört keşifsel grafik üretir.
6. `data/processed/` altına CSV/JSON çıktıları yazar ve aynı dosyaları `site/data/` içine kopyalar.

Grafikleri üretirken bütün ham kaynak satırları bir arada toplanmamalıdır. CSV hem toplulaştırılmış kategorileri hem de bunların alt bileşenlerini içerir. Notebook, toplam göstergeleri toplulaştırılmış satırlardan; kaynak karmasını ise birbiriyle örtüşmeyen bileşenlerden üretir.

## Siteyi yerelde test etme

Tarayıcıda `index.html` dosyasını doğrudan açmayın; veri dosyaları `fetch()` ile okunduğu için yerel bir HTTP sunucusu kullanın. Proje kökünde:

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000/site/` adresini açın. Sunucuyu durdurmak için terminalde `Ctrl+C` kullanın.

## Yayına alma

Bu site derleme adımı gerektirmeyen statik HTML/CSS/JavaScript kullanır.

**Vercel seçeneği:** Depoyu GitHub'a yükleyin, Vercel'de projeyi içe aktarın, **Root Directory** değerini `site` yapın. Build komutu ve Output Directory için özel bir ayar gerekmemelidir; dağıtım sonrasında dört veri dosyasının da `site/data/` içinden erişilebildiğini kontrol edin.

**GitHub Pages seçeneği:** Bu depo düzeninde `site/` alt klasörünü yayımlamak için GitHub Actions tabanlı bir Pages akışı yapılandırılmalıdır. En az ayarla ilerlemek için Vercel projesinde Root Directory değerini `site` seçmek daha kolaydır.

Yayın sonrası `site/index.html` içindeki `og:image` değerini **mutlak HTTPS URL'si** ile değiştirin (ör. `https://YAYIN-ADRESINIZ/assets/og-image.png`). Ardından LinkedIn Post Inspector ile önizlemeyi kontrol edin.

## Web deneyimi

- Altı kaydırma adımında güncellenen sabit grafik
- Çizgi, yığılmış alan ve yatay çubuk grafikler
- Kaynak, ölçü (TWh / %) ve başlangıç yılı seçilebilen etkileşimli keşif bölümü
- Duyarlı tasarım, klavyeyle kullanılabilir kontroller, grafik başlığı/açıklaması ve `prefers-reduced-motion` desteği
- Sosyal paylaşım görseli: `site/assets/og-image.png` (1200 × 627 px)

## Canlı Demo

<https://turkiye-elektrik-donusumu.vercel.app/>

## Akademik kullanım ve yapay zekâ beyanı

OpenAI ChatGPT, kod iskeleti, veri işleme akışı, hata ayıklama ve arayüz kodlamasında destek için kullanılmıştır.

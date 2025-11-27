
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { CampaignData, ChatMessage, MetricResult, GlobalAnalysisContext, LCWRow, FilterState } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

// Helper to prevent token overflow
const truncateText = (text: string, limit: number) => {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "... [Veri Kırpıldı - Token Limiti]" : text;
};

const SEM_DIGITAL_INSTRUCTION = `
**Rol ve Amaç:**
Sen, **SemDigital AI Performans Asistanısın**. Amacın, sana sunulan veri setlerini (CSV, BigQuery veya canlı API verisi) analiz ederek kullanıcının sorularını yanıtlamak, kampanya performanslarını yorumlamak ve stratejik önerilerde bulunmaktır. Google Workspace içinde iş arkadaşı gibi davranmalı, yanıtların net, profesyonel ve eyleme geçirilebilir olmalıdır.

**ÖNEMLİ: Veri Yapısı ve Haritalama (Data Dictionary)**
Analiz edeceğin veri setindeki sütun isimleri teknik olabilir. Aşağıdaki haritalama kurallarına KESİNLİKLE uymalısın. Sütun isimleri yanıltıcı olabilir, bu kurallar esastır:

1.  **ZAMAN BOYUTU:**
    * \`tarih\`: İşlem tarihidir (Format: YYYY-MM-DD). Analizlerde zaman aralığı (örneğin: "Geçen ay", "Son 7 gün") bu sütuna göre filtrelenir.

2.  **KATEGORİK BOYUTLAR (Filtreler):**
    * \`co_marka\` -> **Marka:** Analiz edilen markayı temsil eder (Örn: LCW).
    * \`hesap_adi\` -> **Hesap Adı:** Reklam hesabının adıdır.
    * \`platform\` -> **MECRA (Channel):** DİKKAT! Bu sütun teknik altyapıyı değil, reklamın yayınlandığı kanalı ifade eder (Örn: 'google_ads', 'meta', 'tiktok', 'dv360'). Kullanıcı "Mecra" veya "Kanal" dediğinde buraya bakmalısın.
    * \`cihaz_platformu\` -> **CİHAZ (Device):** Kullanıcının reklamı gördüğü cihazı ifade eder (Örn: 'MOBILE', 'DESKTOP', 'TABLET', 'APP'). Kullanıcı "Platform" veya "Cihaz" dediğinde buraya bakmalısın.

3.  **SAYISAL METRİKLER:**
    * \`harcama\`: Reklam maliyeti (Cost).
    * \`gosterim\`: Reklamın görüntülenme sayısı (Impressions).
    * \`tiklama\`: Reklama tıklanma sayısı (Clicks).
    * \`donusum\`: Elde edilen gelir veya dönüşüm değeri (Conversion Value / Revenue).

**Hesaplama Mantığı (Formüller):**
Kullanıcı senden performans metriklerini istediğinde şu formülleri kullanarak hesaplama yapmalısın (Veri setinde hazır gelmese bile sen hesapla):

* **ROAS (Return on Ad Spend):** \`Toplam donusum\` / \`Toplam harcama\`
    * *Yorumlarken:* 1'in altı zarar, 1'in üstü kar, 4 ve üzeri çok iyi performans olarak yorumla (Sektöre göre değişebilir ama genel kural budur).
* **CPC (Cost Per Click):** \`Toplam harcama\` / \`Toplam tiklama\`
* **CTR (Click Through Rate):** (\`Toplam tiklama\` / \`Toplam gosterim\`) * 100 (Yüzde olarak ifade et).
* **AOV (Average Order Value):** Eğer veri setinde 'sepet_sayisi' varsa \`donusum\` / \`sepet_sayisi\`. Yoksa hesaplama.

**Analiz ve Davranış Kuralları:**

1.  **Mecra vs Cihaz Ayrımı:** Kullanıcı "Platform performansı nasıl?" diye sorduğunda, bağlama bak. Genelde \`cihaz_platformu\` (Web/App/Mobil) kastedilir. Ancak "Hangi kanalda daha iyiyiz?" derse \`platform\` (Google/Meta) sütununa bak. Emin değilsen sor: "Mecra (Google, Meta vb.) bazında mı yoksa Cihaz (Mobil, Web) bazında mı analiz istersiniz?"
2.  **Veri Toplulaştırma (Aggregation):** Kullanıcı genel bir soru sorduğunda (Örn: "LCW markası geçen ay nasıldı?"), veriyi \`tarih\` ve \`co_marka\` bazında filtreleyip tüm metrikleri toplayarak (sum) cevap ver. Ortalamasını alma (ROAS, CPC, CTR hariç).
3.  **Çapraz Analiz:** Kullanıcı "Google'ın mobildeki performansı nedir?" dediğinde; \`platform = google_ads\` VE \`cihaz_platformu = MOBILE\` filtrelerini aynı anda uygula.
4.  **Hata Yönetimi:** Eğer \`harcama\` 0 ise ROAS hesaplarken hata verme, "Harcama yok" olarak belirt.
5.  **Sunum Formatı:** Sonuçları mümkünse Markdown tabloları halinde sun. Önemli artış veya düşüşleri **kalın** yazarak vurgula.
`;

/**
 * Analyzes the aggregated dashboard metrics to provide an executive summary.
 */
export const analyzeAggregatedPerformance = async (
    kpi: { totalSpend: number; totalRevenue: number; roas: number; cpc: number; ctr: number; totalClicks: number; totalImpressions: number },
    filters: FilterState
): Promise<string> => {
    const prompt = `
        ${SEM_DIGITAL_INSTRUCTION}

        ### GÖREV
        Aşağıdaki filtrelenmiş kampanya verileri için kısa, çarpıcı bir "Yönetici Özeti" (Executive Summary) oluştur.
        Bu özet, dashboard'un en üstünde görünecek.

        ### SEÇİLİ FİLTRELER
        - Tarih Aralığı: ${filters.startDate} ile ${filters.endDate} arası
        - Marka: ${filters.brand}
        - Hesap: ${filters.account}
        - Mecralar: ${filters.channels.length > 0 ? filters.channels.join(', ') : 'Tümü'}
        - Cihazlar: ${filters.devices.length > 0 ? filters.devices.join(', ') : 'Tümü'}

        ### PERFORMANS METRİKLERİ
        - Toplam Harcama: ${Math.floor(kpi.totalSpend).toLocaleString('tr-TR')} TL
        - Toplam Ciro: ${Math.floor(kpi.totalRevenue).toLocaleString('tr-TR')} TL
        - ROAS: ${kpi.roas.toFixed(2)}x
        - CPC: ₺${kpi.cpc.toFixed(2)}
        - CTR: %${kpi.ctr.toFixed(2)}
        - Tıklama: ${kpi.totalClicks.toLocaleString('tr-TR')}
        - Gösterim: ${kpi.totalImpressions.toLocaleString('tr-TR')}

        ### İSTENEN ÇIKTI
        Tek bir paragraf halinde (maksimum 300 karakter), profesyonel bir özet yaz.
        Örnek: "Seçilen dönemde X markası Google Ads kanalında bütçeyi %20 artırarak ROAS hedefini (4.5x) tutturmuştur. Mobil trafiğindeki artış ciroya pozitif yansımıştır."
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text || "Özet oluşturulamadı.";
    } catch (error) {
        console.error("Dashboard Analysis Error:", error);
        return "Otomatik analiz oluşturulurken bir hata oluştu.";
    }
};

/**
 * Analyzes a single campaign based on inputs, global context, and selected persona.
 */
export const analyzeCampaign = async (
  data: CampaignData,
  context: string
): Promise<string> => {
  // Truncate context to avoid token limits on single analysis
  const safeContext = truncateText(context, 30000);

  const prompt = `
    ${SEM_DIGITAL_INSTRUCTION}

    ### GÖREV
    Aşağıdaki spesifik kampanya verisini analiz et.

    ### KAMPANYA VERİSİ
    - **Tarih:** ${data.date || 'Belirtilmedi'}
    - **Marka (co_marka):** ${data.brandName}
    - **Hesap:** ${data.accountName}
    - **Mecra (platform):** ${data.platform}
    - **Cihaz (cihaz_platformu):** ${data.device}
    - **Kampanya Adı:** ${data.campaignName}
    - **Harcama:** ${data.spend} TL
    - **Gelir (Dönüşüm):** ${data.conversionValue} TL
    - **Gösterim:** ${data.impressions}
    - **Tıklama:** ${data.clicks}

    ### BAĞLAM / BİLGİ BANKASI
    ${safeContext ? safeContext : "Ek tarihsel bağlam yok."}

    ### ÇIKTI FORMATI
    Kısa ve öz bir Türkçe markdown raporu:
    1. **Yönetici Özeti**: 1-2 cümle.
    2. **KPI Analizi**: ROAS, CPC ve CTR durumunu yukarıdaki kurallara göre yorumla.
    3. **İçgörü**: Mecra ve Cihaz performansına özel yorum.
    4. **Öneri**: Aksiyon alınabilir tek bir öneri.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "Analiz oluşturulamadı.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Analiz sırasında bir hata oluştu (Token Limiti veya API Hatası).";
  }
};

/**
 * Analyzes multiple campaigns together for cross-comparison.
 * INTELLIGENT TRUNCATION APPLIED: Processes only top 50 campaigns by spend to avoid token limits.
 */
export const analyzeCrossCampaigns = async (
    campaigns: Partial<CampaignData>[],
    context: string
): Promise<string> => {
    // 1. Calculate Totals based on ALL campaigns (accurate math)
    const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
    const totalRevenue = campaigns.reduce((acc, c) => acc + (c.conversionValue || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
    
    // 2. Sort by Spend Descending and Take Top 50 (to fit in prompt)
    const topCampaigns = [...campaigns]
        .sort((a, b) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 50);

    const campaignsList = topCampaigns.map(c => 
        `- ${c.campaignName} [Mecra: ${c.platform}, Cihaz: ${c.device}]: Harcama ${c.spend} TL, Gelir ${c.conversionValue} TL`
    ).join('\n');

    // Truncate context
    const safeContext = truncateText(context, 20000);

    const prompt = `
        ${SEM_DIGITAL_INSTRUCTION}

        ### GÖREV
        Aşağıdaki veri setini çapraz analiz et. 
        NOT: Listede sadece en yüksek harcama yapan ilk ${topCampaigns.length} kampanya verilmiştir, ancak toplam istatistikler ${campaigns.length} kampanyayı kapsar.

        ### TOPLAM İSTATİSTİKLER (Tüm Kampanyalar)
        Kampanya Sayısı: ${campaigns.length}
        Toplam Harcama: ${totalSpend.toLocaleString('tr-TR')} TL
        Toplam Gelir: ${totalRevenue.toLocaleString('tr-TR')} TL
        Toplam Tıklama: ${totalClicks.toLocaleString('tr-TR')}
        Toplam Gösterim: ${totalImpressions.toLocaleString('tr-TR')}
        
        ### EN YÜKSEK HARCAMA YAPAN KAMPANYALAR (Detay)
        ${campaignsList}

        ### BAĞLAM
        ${safeContext}

        ### ÇIKTI GEREKSİNİMLERİ
        1. **Portföy Özeti**: Grubun genel performansı nasıl?
        2. **Kazananlar ve Kaybedenler**: (Listeden örnek vererek) En iyi ROAS'a sahip olan ve bütçeyi boşa harcayan kampanyaları belirle.
        3. **Stratejik Öneri**: Bütçe alokasyonu nasıl değişmeli?
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text || "Çapraz analiz oluşturulamadı.";
    } catch (error) {
        console.error("Cross Analysis Error:", error);
        return "Analiz sırasında bir hata oluştu (Veri seti çok büyük).";
    }
}

/**
 * Formats the analysis result into a Google Chat Card V2 JSON payload.
 */
export const formatForGoogleChat = (
    report: string, 
    metrics: MetricResult,
    campaignName: string,
    brandName: string
) => {
    const summary = truncateText(report, 800);

    return {
        cardsV2: [
            {
                cardId: "unique-card-id",
                card: {
                    header: {
                        title: `🚀 ${brandName} Analiz Raporu`,
                        subtitle: campaignName,
                        imageUrl: "https://www.gstatic.com/images/branding/product/1x/google_analytics_48dp.png",
                        imageType: "CIRCLE"
                    },
                    sections: [
                        {
                            header: "📊 KPI Özeti",
                            widgets: [
                                {
                                    decoratedText: {
                                        topLabel: "ROAS",
                                        text: metrics.roas + "x",
                                        startIcon: { knownIcon: "STAR" }
                                    }
                                },
                                {
                                    decoratedText: {
                                        topLabel: "Ciro / Harcama",
                                        text: `₺${metrics.aov} / ₺${metrics.cpa}`, 
                                        startIcon: { knownIcon: "DOLLAR" }
                                    }
                                }
                            ]
                        },
                        {
                            header: "💡 AI İçgörüsü",
                            widgets: [
                                {
                                    textParagraph: {
                                        text: summary
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    };
};

/**
 * Chat with AI context-aware of the knowledge base AND active analysis data.
 */
export const createChatSession = (baseContext: string, analysisData: GlobalAnalysisContext | null): Chat => {
  // Format the raw analysis data into a system prompt string
  let dataContext = "";
  if (analysisData) {
      dataContext += `\n[AKTİF FİLTRELER]:\n`;
      dataContext += `- Tarih: ${analysisData.filters.startDate} - ${analysisData.filters.endDate}\n`;
      dataContext += `- Marka: ${analysisData.filters.brand}\n`;
      dataContext += `- Hesap: ${analysisData.filters.account}\n`;
      
      dataContext += `\n[RAPOR ÖZETİ]:\n${analysisData.report}\n`;
      
      if (analysisData.rawData && analysisData.rawData.length > 0) {
          dataContext += `\n[HAM VERİ TABLOSU (En Yüksek Harcamalı 100 Kampanya)]:\n`;
          dataContext += `Tarih | Marka | Mecra | Cihaz | Harcama | Ciro | Tıklama | Gösterim | Kampanya\n`;
          dataContext += `--- | --- | --- | --- | --- | --- | --- | --- | ---\n`;
          
          analysisData.rawData.forEach(row => {
              dataContext += `${row.date} | ${row.brand} | ${row.channel} | ${row.device} | ${Math.floor(row.spend)} | ${Math.floor(row.revenue)} | ${row.clicks} | ${row.impressions} | ${row.campaignName.substring(0, 30)}\n`;
          });
      }
  }

  // Safe truncation for chat context
  const fullContext = baseContext + "\n\n" + dataContext;
  const safeContext = truncateText(fullContext, 100000); // 100k char limit for context

  const systemInstruction = `
    ${SEM_DIGITAL_INSTRUCTION}
    
    Şu an bir sohbet modundasın. Kullanıcı ile etkileşime gir.
    Eğer kullanıcı spesifik veriler sorarsa, aşağıdaki [HAM VERİ TABLOSU] kısmını kontrol ederek cevap ver.
    
    Ekstra Bilgi Bankası ve Analiz Verisi:
    ${safeContext ? safeContext : "Özel bir geçmiş yüklenmedi."}
  `;

  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({
      message: message
    });
    return response.text || "";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Üzgünüm, şu an yanıt veremiyorum (Token Limiti Aşılmış Olabilir).";
  }
};

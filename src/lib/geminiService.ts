import { GoogleGenAI } from '@google/genai';

function getApiKey(): string | null {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem('geosnap_gemini_api_key') ||
    null
  );
}

export function isGeminiAvailable(): boolean {
  return !!getApiKey();
}

export function setCustomGeminiApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem('geosnap_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('geosnap_gemini_api_key');
  }
}

/**
 * Generate smart title & description for a trip or photo collection based on location and time
 */
export async function generateTripSummary(
  locationName: string,
  city?: string,
  country?: string,
  photoCount: number = 1
): Promise<{ title: string; summary: string; tags: string[] }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Intelligent fallback
    return {
      title: `Hành trình khám phá ${locationName}`,
      summary: `Chuyến đi đáng nhớ tại ${locationName}${city ? `, ${city}` : ''} với ${photoCount} khoảnh khắc tuyệt đẹp.`,
      tags: ['du_lich', city ? city.toLowerCase().replace(/\s+/g, '_') : 'vietnam', 'kham_pha'],
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Bạn là một trợ lý du lịch AI cho ứng dụng GeoSnap. Hãy tạo tiêu đề hấp dẫn, đoạn tóm tắt ngắn (1-2 câu) và 3-5 hashtag cho một chuyến đi tại địa điểm sau:
- Tên địa điểm: ${locationName}
- Thành phố/Khu vực: ${city || 'Không rõ'}
- Quốc gia: ${country || 'Việt Nam'}
- Số lượng ảnh: ${photoCount}

Hãy trả về định dạng JSON thuần như sau:
{
  "title": "Tiêu đề hấp dẫn ngắn gọn",
  "summary": "Đoạn tóm tắt cảm xúc 1-2 câu",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = res.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('Gemini API call failed, using fallback:', error);
  }

  return {
    title: `Hành trình ${locationName}`,
    summary: `Khám phá những khoảnh khắc tuyệt vời tại ${locationName}.`,
    tags: ['du_lich', 'geosnap', 'travel'],
  };
}

/**
 * Generate Itinerary draft from places
 */
export async function generateItineraryDraft(
  destination: string,
  days: number = 2
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return `### Lịch trình gợi ý khám phá ${destination} (${days} ngày)
- **Ngày 1:** Tham quan các điểm nổi tiếng trung tâm, thưởng thức ẩm thực địa phương.
- **Ngày 2:** Check-in điểm ngắm cảnh thiên nhiên, mua sắm quà lưu niệm và chụp ảnh kỷ niệm.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Viết lịch trình du lịch chi tiết và súc tích trong ${days} ngày tại ${destination}. Sử dụng định dạng Markdown với các gạch đầu dòng, gợi ý điểm check-in chụp ảnh đẹp và món ăn đặc sản.`;
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return res.text || '';
  } catch (error) {
    console.warn('Gemini Itinerary call failed:', error);
    return `### Kế hoạch khám phá ${destination}\n- Trải nghiệm ẩm thực và ngắm hoàng hôn.`;
  }
}

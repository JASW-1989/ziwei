/**
 * ZiweiDecade - 紫微斗數大限推演引擎 (Decade Engine v1.1)
 * 嚴謹對齊 ZiweiEngine v5.1 數據結構
 */

import ZiweiEngine from './ziwei_engine.js';

const ZiweiDecade = {
  /**
   * 1. 取得大限資料
   * @param {number} targetAge - 目標虛歲
   * @param {Object} staticChart - ZiweiEngine.getFullChart 的回傳結果
   */
  getDecadeInfo: function(targetAge, staticChart) {
    // 嚴謹對齊：使用 ageStart 進行數值比對
    const decadeLifePalace = staticChart.palaces.find(p => 
      targetAge >= p.ageStart && targetAge <= (p.ageStart + 9)
    );

    if (!decadeLifePalace) return null;

    const dStem = decadeLifePalace.stem;
    const dLifeIdx = decadeLifePalace.index; // 大限命宮所在的地支索引
    const dSiHua = this.getSiHuaRules(dStem);

    // 大限名稱定義
    const dPalaceNames = ["大限命", "大限兄", "大限夫", "大限子", "大限財", "大限疾", "大限遷", "大限友", "大限官", "大限田", "大限福", "大限父"];
    
    // 大限流曜規則 (依大限宮干起)
    const luMap = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 };
    const lIdx = luMap[dStem];

    const palaces = staticChart.palaces.map((p, idx) => {
      // 計算相對於大限命宮的偏移量
      const nameIdx = (dLifeIdx - idx + 12) % 12;
      const dStars = [];
      
      // 設置大限星曜
      if (idx === lIdx) dStars.push({ name: "大限祿存", type: "decade" });
      if (idx === (lIdx + 1) % 12) dStars.push({ name: "大限擎羊", type: "decade" });
      if (idx === (lIdx - 1 + 12) % 12) dStars.push({ name: "大限陀羅", type: "decade" });

      return {
        index: idx, // 地支索引 (0-11)
        decadeName: dPalaceNames[nameIdx],
        overlayOnRoot: p.name, // 疊在本命哪一宮
        decadeStars: dStars,
        decadeSiHua: dSiHua
      };
    });

    return {
      type: "Decade",
      targetAge: targetAge,
      decadeStem: dStem,
      decadeRange: decadeLifePalace.ageRange,
      decadeLifeIdx: dLifeIdx,
      palaces: palaces,
      siHua: dSiHua
    };
  },

  /**
   * 四化規則 (與 Engine 保持 100% 一致)
   */
  getSiHuaRules: function(stem) {
    return {
      "甲": { "祿": "廉貞", "權": "破軍", "科": "武曲", "忌": "太陽" },
      "乙": { "祿": "天機", "權": "天梁", "科": "紫微", "忌": "太陰" },
      "丙": { "祿": "天同", "權": "天機", "科": "文昌", "忌": "廉貞" },
      "丁": { "祿": "太陰", "權": "天同", "科": "天機", "忌": "巨門" },
      "戊": { "祿": "貪狼", "權": "太陰", "科": "右弼", "忌": "天機" },
      "己": { "祿": "武曲", "權": "貪狼", "科": "天梁", "忌": "文曲" },
      "庚": { "祿": "太陽", "權": "武曲", "科": "太陰", "忌": "天同" },
      "辛": { "祿": "巨門", "權": "太陽", "科": "文曲", "忌": "文昌" },
      "壬": { "祿": "天梁", "權": "紫微", "科": "左輔", "忌": "武曲" },
      "癸": { "祿": "破軍", "權": "巨門", "科": "太陰", "忌": "貪狼" }
    }[stem];
  }
};

export default ZiweiDecade;

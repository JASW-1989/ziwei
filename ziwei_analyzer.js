/**
 * ZiweiAnalyzer - 紫微斗數邏輯分析引擎 (v1.9.2 - 穩定修復版)
 * 修正：嚴格檢查 palaces 陣列索引，防止讀取 stars 發生 undefined 錯誤。
 */

const ZiweiAnalyzer = {
  /**
   * 能量飽和度正規化運算
   */
  getPalaceScore: function(palaceIdx, fullData) {
    // [防護]：確保 fullData 與 palaces 結構完整
    if (!fullData || !fullData.staticChart || !fullData.staticChart.palaces) {
      console.warn("[Analyzer] 數據矩陣不完整");
      return 50;
    }
    
    // [防護]：確保索引有效且宮位對象存在
    const targetPalace = fullData.staticChart.palaces[palaceIdx];
    if (!targetPalace || !targetPalace.stars) {
      console.error(`[Analyzer] 無法讀取宮位索引 ${palaceIdx} 的星曜數據。`);
      return 50; 
    }

    const { staticChart, decadeInfo, yearlyLuck, monthlyLuck } = fullData;
    const bWeight = { "廟": 100, "旺": 85, "得": 70, "利": 60, "平": 50, "陷": 20 };
    
    // 內部運算函數：計算單一層級的分數
    const calculateLayerRaw = (stars, siHua) => {
      if (!stars || stars.length === 0) return 50;
      let layerSum = 0;
      stars.forEach(s => {
        const base = s.name.split('(')[0];
        let starScore = bWeight[s.brightness] || 50;
        
        // 四化權重
        if (s.name.includes("(祿)")) starScore += 20;
        if (s.name.includes("(權)")) starScore += 15;
        if (s.name.includes("(科)")) starScore += 10;
        if (s.name.includes("(忌)")) starScore -= 30;

        // 流變四化引動
        if (siHua) {
          if (siHua.祿 === base) starScore += 15;
          if (siHua.忌 === base) starScore -= 25;
        }
        
        // 煞星擾動
        if (["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"].includes(base)) {
          starScore -= 20;
        }
        layerSum += starScore;
      });
      return Math.max(0, Math.min(100, layerSum / stars.length));
    };

    // 執行四層時空加權
    const sScore = calculateLayerRaw(targetPalace.stars, null);
    const dScore = decadeInfo ? calculateLayerRaw(targetPalace.stars, decadeInfo.siHua) : sScore;
    const yScore = yearlyLuck ? calculateLayerRaw(targetPalace.stars, yearlyLuck.siHua) : dScore;
    const mScore = monthlyLuck ? calculateLayerRaw(targetPalace.stars, monthlyLuck.siHua) : yScore;

    // 權重比例 4:2.5:2:1.5
    const finalScore = (sScore * 0.4) + (dScore * 0.25) + (yScore * 0.2) + (mScore * 0.15);
    return Math.round(finalScore);
  },

  /**
   * 三疊衝突偵測 (已加入空值保護)
   */
  detectConflicts: function(fullData) {
    if (!fullData?.staticChart?.palaces) return [];
    const { staticChart, decadeInfo, yearlyLuck } = fullData;
    
    const results = Array(12).fill(null).map((_, i) => ({
      palaceIdx: i,
      palaceName: staticChart.palaces[i]?.name || "未知",
      tabooLayers: [],
      isTripleTaboo: false,
      isClash: false
    }));

    const findStarIdx = (starName) => {
      if (!starName) return -1;
      return staticChart.palaces.findIndex(p => p.stars?.some(s => s.name.startsWith(starName)));
    };

    // 標註化忌層級
    staticChart.palaces.forEach((p, idx) => {
      if (p.stars?.some(s => s.name.includes("(忌)"))) results[idx].tabooLayers.push('root');
    });
    if (decadeInfo?.siHua?.忌) {
      const dIdx = findStarIdx(decadeInfo.siHua.忌);
      if (dIdx !== -1) results[dIdx].tabooLayers.push('decade');
    }
    if (yearlyLuck?.siHua?.忌) {
      const yIdx = findStarIdx(yearlyLuck.siHua.忌);
      if (yIdx !== -1) results[yIdx].tabooLayers.push('yearly');
    }

    // 判定衝突
    results.forEach(res => {
      if (['root', 'decade', 'yearly'].every(l => res.tabooLayers.includes(l))) res.isTripleTaboo = true;
      const oppIdx = (res.palaceIdx + 6) % 12;
      const hasLu = staticChart.palaces[oppIdx]?.stars?.some(s => s.name.includes("(祿)"));
      if (res.tabooLayers.length > 0 && hasLu) res.isClash = true;
    });

    return results.filter(r => r.tabooLayers.length > 0);
  }
};

export default ZiweiAnalyzer;

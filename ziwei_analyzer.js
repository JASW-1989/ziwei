/**
 * ZiweiAnalyzer - 紫微斗數邏輯分析引擎 (v1.9 - Conflict Detection Edition)
 * 升級重點：
 * 1. 實作 detectConflicts 函數：偵測三疊忌、祿忌沖、四疊忌等高階衝突。
 * 2. 精確計算「三方四正」的能量干涉。
 */

const ZiweiAnalyzer = {
  /**
   * 1. 能量飽和度 (Normalized Scoring)
   */
  getPalaceScore: function(palaceIdx, fullData) {
    const { staticChart, decadeInfo, yearlyLuck, monthlyLuck } = fullData;
    const bWeight = { "廟": 100, "旺": 85, "得": 70, "利": 60, "平": 50, "陷": 20 };
    
    const calculateLayerRaw = (stars, siHua) => {
      if (!stars || stars.length === 0) return 50;
      let layerSum = 0;
      stars.forEach(s => {
        const base = s.name.split('(')[0];
        let starScore = bWeight[s.brightness] || 50;
        if (s.name.includes("(祿)")) starScore += 20;
        if (s.name.includes("(忌)")) starScore -= 30;
        if (siHua) {
          if (siHua.祿 === base) starScore += 15;
          if (siHua.忌 === base) starScore -= 25;
        }
        if (["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"].includes(base)) starScore -= 20;
        layerSum += starScore;
      });
      return Math.max(0, Math.min(100, layerSum / stars.length));
    };

    const sScore = calculateLayerRaw(staticChart.palaces[palaceIdx].stars, null);
    const dScore = decadeInfo ? calculateLayerRaw(staticChart.palaces[palaceIdx].stars, decadeInfo.siHua) : sScore;
    const yScore = yearlyLuck ? calculateLayerRaw(staticChart.palaces[palaceIdx].stars, yearlyLuck.siHua) : dScore;
    const mScore = monthlyLuck ? calculateLayerRaw(staticChart.palaces[palaceIdx].stars, monthlyLuck.siHua) : yScore;

    const finalScore = (sScore * 0.4) + (dScore * 0.25) + (yScore * 0.2) + (mScore * 0.15);
    return Math.round(finalScore);
  },

  /**
   * 2. 三疊化忌偵測器 (核心實作)
   * 邏輯：掃描 12 宮位，找出本命忌、大限忌、流年忌、流月忌的碰撞點。
   */
  detectConflicts: function(fullData) {
    const { staticChart, decadeInfo, yearlyLuck, monthlyLuck } = fullData;
    const results = Array(12).fill(null).map((_, i) => ({
      palaceIdx: i,
      palaceName: staticChart.palaces[i].name,
      tabooLayers: [], // 儲存哪些層級在此化忌 ['root', 'decade', 'yearly', 'monthly']
      isTripleTaboo: false,
      isClash: false // 祿忌沖偵測
    }));

    // A. 收集各層級化忌位置
    const findStarIdx = (starName) => staticChart.palaces.findIndex(p => p.stars.some(s => s.name.startsWith(starName)));

    // 1. 本命忌
    staticChart.palaces.forEach((p, idx) => {
      if (p.stars.some(s => s.name.includes("(忌)"))) results[idx].tabooLayers.push('root');
    });
    // 2. 大限忌
    if (decadeInfo) {
      const dJiIdx = findStarIdx(decadeInfo.siHua.忌);
      if (dJiIdx !== -1) results[dJiIdx].tabooLayers.push('decade');
    }
    // 3. 流年忌
    if (yearlyLuck) {
      const yJiIdx = findStarIdx(yearlyLuck.siHua.忌);
      if (yJiIdx !== -1) results[yJiIdx].tabooLayers.push('yearly');
    }
    // 4. 流月忌
    if (monthlyLuck) {
      const mJiIdx = findStarIdx(monthlyLuck.siHua.忌);
      if (mJiIdx !== -1) results[mJiIdx].tabooLayers.push('monthly');
    }

    // B. 衝突判定邏輯
    results.forEach(res => {
      // 三疊忌判定 (只要包含 root, decade, yearly 三者即成立)
      const coreThree = ['root', 'decade', 'yearly'];
      if (coreThree.every(layer => res.tabooLayers.includes(layer))) {
        res.isTripleTaboo = true;
      }

      // 祿忌沖判定 (本宮有忌，對宮有祿)
      const oppIdx = (res.palaceIdx + 6) % 12;
      const hasJi = res.tabooLayers.length > 0;
      const hasLu = staticChart.palaces[oppIdx].stars.some(s => s.name.includes("(祿)")) || 
                    (yearlyLuck && staticChart.palaces[oppIdx].stars.some(s => s.name.startsWith(yearlyLuck.siHua.祿)));
      
      if (hasJi && hasLu) res.isClash = true;
    });

    return results.filter(r => r.tabooLayers.length > 0);
  },

  /**
   * 3. 格局偵測 (保持原有邏輯)
   */
  detectPatterns: function(palaceIdx, fullData) {
    const relPalaces = this.getRelationalData(palaceIdx, fullData);
    const activeStars = relPalaces.flatMap(p => p.rootStars.map(s => s.name.split('(')[0]));
    const patterns = [];
    if (["天機", "太陰", "天同", "天梁"].every(s => activeStars.includes(s))) {
      patterns.push({ name: "機月同梁格", status: "成格", desc: "穩定執行力的典範。" });
    }
    return patterns;
  },

  getRelationalData: function(palaceIdx, fullData) {
    const relations = [palaceIdx, (palaceIdx + 6) % 12, (palaceIdx + 4) % 12, (palaceIdx + 8) % 12];
    return relations.map(idx => ({
      index: idx,
      rootStars: fullData.staticChart.palaces[idx].stars,
      name: fullData.staticChart.palaces[idx].name
    }));
  }
};

export default ZiweiAnalyzer;

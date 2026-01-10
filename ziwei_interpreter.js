/**
 * ZiweiInterpreter - 紫微大師解讀引擎 (v2.0 - Master Advisory Edition)
 * 核心升級：
 * 1. 實作「決策光譜」：不再只是吉凶，而是給予行為策略。
 * 2. 實作「星曜四化對話」：將星曜特質與四化引動結合。
 * 3. 實作「三層疊宮敘事」：將時間與空間的交會點講成故事。
 */

const ZiweiInterpreter = {
  /**
   * 核心解讀函數：生成大師級解析報告
   * @param {number} palaceIdx - 宮位索引
   * @param {Object} fullData - 包含本、大、流、月
   * @param {Object} dict - 大師詞庫
   * @param {Object} analyzer - 分析引擎
   */
  interpretPalace: function(palaceIdx, fullData, dict, analyzer) {
    if (!dict || !dict.palace_traits) return { summary: "數據缺失", advice: [] };
    
    const score = analyzer.getPalaceScore(palaceIdx, fullData);
    const staticPalace = fullData.staticChart.palaces[palaceIdx];
    const palaceName = staticPalace.name;
    const traits = dict.palace_traits[palaceName] || dict.palace_traits["命宮"]; // Fallback to 命宮邏輯
    
    // 1. 決策光譜定位 (Decision Spectrum Mapping)
    let decisionText = "";
    if (score >= 85) decisionText = traits.spectrum["90"];
    else if (score >= 65) decisionText = traits.spectrum["70"];
    else if (score >= 45) decisionText = traits.spectrum["50"];
    else decisionText = traits.spectrum["30"];

    // 2. 體用重疊敘事 (The Narrative Bridge)
    let narrative = "目前場域能量處於平衡狀態。";
    if (fullData.yearlyLuck) {
        const yPalace = fullData.yearlyLuck.palaces[palaceIdx];
        const overlayKey = `流命疊本${yPalace.overlayOnRoot.replace('宮', '')}`;
        narrative = dict.overlay_narratives?.[overlayKey] || 
                    `今年此宮位疊在本命【${yPalace.overlayOnRoot}】，預示該領域將受到後天環境的強烈引動。`;
    }

    // 3. 星曜四化具體指南 (Star-Transformation Linkage)
    let specificAdvice = [];
    staticPalace.stars.forEach(s => {
        const baseName = s.name.split('(')[0];
        const adviceNode = dict.star_transformation_advice?.[baseName];
        
        if (adviceNode) {
            if (s.name.includes("(祿)")) specificAdvice.push(`【${baseName}化祿】：${adviceNode.祿}`);
            if (s.name.includes("(忌)")) specificAdvice.push(`【${baseName}化忌】：${adviceNode.忌}`);
        }
    });

    // 若無四化引動，則提供基礎建議
    if (specificAdvice.length === 0) {
        specificAdvice = staticPalace.stars.map(s => `【${s.name}】：專注發揮其${s.brightness === '廟' ? '優勢' : '特質'}。`);
    }

    return {
      title: `${palaceName} 深度諮詢`,
      score: score,
      decisionSpectrum: decisionText,
      narrative: narrative,
      starDirectives: specificAdvice,
      summary: `${decisionText} ${narrative}`
    };
  },

  /**
   * 未來趨勢：預測風險與機遇的動態
   */
  predictFutureTrend: function(fullData, dict, analyzer) {
    const { yearlyLuck } = fullData;
    if (!yearlyLuck) return null;

    const conflicts = analyzer.detectConflicts(fullData);
    const lifeIdx = yearlyLuck.yLifeIdx;
    const report = this.interpretPalace(lifeIdx, fullData, dict, analyzer);

    // 偵測三疊忌或重大衝突
    const crisis = conflicts.find(c => c.isTripleTaboo || (c.isClash && c.tabooLayers.length >= 2));

    return {
      yearLabel: `${yearlyLuck.year} ${yearlyLuck.stemBranch}年`,
      mainTheme: report.narrative,
      score: report.score,
      strategy: report.decisionSpectrum,
      warning: crisis ? `⚠️ 偵測到重大氣數衝突：在【${crisis.palaceName}】出現多重能量卡頓，建議該領域「以靜制動」。` : "目前推演路徑相對清晰，可大膽向前。"
    };
  },

  /**
   * 先天特質：解析靈魂藍圖
   */
  analyzeInnateSelf: function(staticChart, dict, analyzer) {
    const lifeIdx = staticChart.palaces.findIndex(p => p.name === "命宮");
    const bodyIdx = staticChart.palaces.findIndex(p => p.isBodyPalace);
    const bodyPalace = staticChart.palaces[bodyIdx];
    
    // 獲取先天特質斷語
    const baseAnalysis = this.interpretPalace(lifeIdx, { staticChart }, dict, analyzer);

    return {
      identity: baseAnalysis.decisionSpectrum,
      growthTip: `【身宮啟示】：您的身宮位於「${bodyPalace.name}」，代表您的人生「下半場」將由外部競爭轉向內在對${bodyPalace.name}價值的追求。`,
      logic: "這份藍圖決定了您的基本反應模式，了解它即是命運的解脫。"
    };
  }
};

export default ZiweiInterpreter;

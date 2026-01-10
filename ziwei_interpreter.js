/**
 * ZiweiInterpreter - 紫微斗數解讀引擎 (v1.9 - Crisis Narratives Edition)
 * 升級重點：
 * 1. 深度整合 detectConflicts 產出的衝突數據。
 * 2. 產出「避險指南」而非單純的恐嚇文字。
 */

const ZiweiInterpreter = {
  /**
   * 1. 自我了解：先天生命藍圖
   */
  analyzeInnateSelf: function(staticChart, dict, analyzer) {
    if (!staticChart) return null;
    const lifeIdx = staticChart.palaces.findIndex(p => p.name === "命宮");
    const bodyIdx = staticChart.palaces.findIndex(p => p.isBodyPalace);
    const bodyPalace = staticChart.palaces[bodyIdx];
    const patterns = analyzer.detectPatterns(lifeIdx, { staticChart });
    const coreStars = staticChart.palaces[lifeIdx].stars.map(s => s.name.split('(')[0]);

    return {
      title: "先天特質鑑定",
      coreIdentity: `您的原生命底以【${coreStars.join('、')}】為核心。`,
      personality: patterns.length > 0 ? patterns[0].desc : "您的性格較為多元，展現出高度的適應性。",
      bodyEffect: `身宮位於「${bodyPalace.name}」，代表您 35 歲後的行為重心將更趨向該宮位性質。`
    };
  },

  /**
   * 2. 未來預測：三疊宮位與風險預警 (核心更新)
   */
  predictFutureTrend: function(fullData, dict, analyzer) {
    const { yearlyLuck } = fullData;
    if (!yearlyLuck) return null;

    const conflicts = analyzer.detectConflicts(fullData);
    const score = analyzer.getPalaceScore(yearlyLuck.yLifeIdx, fullData);
    
    // 尋找當前最危險的宮位
    const tripleTaboo = conflicts.find(c => c.isTripleTaboo);
    const seriousClash = conflicts.find(c => c.isClash && c.tabooLayers.length >= 2);

    let narrative = `【時空主旋律】：今年流年命宮疊在本命「${yearlyLuck.palaces[yearlyLuck.yLifeIdx].overlayOnRoot}」。`;
    let riskNotice = "目前整體能量場尚算穩健，適合執行既定計畫。";

    if (tripleTaboo) {
      riskNotice = `⚠️ 【高危預警】：偵測到「三疊忌」發生在【${tripleTaboo.palaceName}】。這代表該領域今年承受三層時空壓力，最易發生「不可抗力」的變數。建議此期間在該事務上「靜止即是前進」，切莫進行重大決策。`;
    } else if (seriousClash) {
      riskNotice = `⚠️ 【能量對沖】：【${seriousClash.palaceName}】呈現祿忌沖。這預示著該領域今年會出現「先得後失」或「表面光鮮、內藏危機」的現象，務必見好就收，切忌貪勝。`;
    }

    return {
      yearLabel: `${yearlyLuck.year} ${yearlyLuck.stemBranch}年`,
      score: score,
      summary: narrative,
      dynamicStatus: score >= 75 ? "勢如破竹" : score <= 40 ? "潛伏蓄勢" : "穩定運行",
      crisisReport: riskNotice, // 產出具體的危機報告
      advice: score < 50 ? "目前正值能量重整期，建議專注內部修煉，減少向外擴張。" : "目前動能充沛，適合啟動規劃已久的目標。"
    };
  },

  /**
   * 3. 傳統宮位詳解
   */
  interpretPalace: function(palaceIdx, fullData, dict, analyzer) {
    const score = analyzer.getPalaceScore(palaceIdx, fullData);
    const p = fullData.staticChart.palaces[palaceIdx];
    const traits = dict.palace_traits?.[p.name] || {};

    return {
        summary: score >= 80 ? traits.high_score : score <= 35 ? traits.low_score : "能量穩定。",
        score: score,
        advice: p.stars.map(s => dict.star_advice?.[s.name.split('(')[0]] || "專注自我發展。")
    };
  }
};

export default ZiweiInterpreter;

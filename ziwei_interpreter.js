/**
 * ZiweiInterpreter - 紫微斗數解讀引擎 (v2.0.2 - 穩定修正版)
 */

const ZiweiInterpreter = {
  interpretPalace: function(palaceIdx, fullData, dict, analyzer) {
    if (!dict || !analyzer || !fullData?.staticChart) {
      return { summary: "數據載入中...", advice: [] };
    }
    
    // 確保索引有效
    const idx = (typeof palaceIdx === 'number' && palaceIdx >= 0 && palaceIdx < 12) ? palaceIdx : 0;
    const staticPalace = fullData.staticChart.palaces[idx];
    if (!staticPalace) return { summary: "查無此宮位。", advice: [] };

    const score = analyzer.getPalaceScore(idx, fullData);
    const palaceName = staticPalace.name;
    const traits = dict.palace_traits?.[palaceName] || {};
    const spectrum = traits.spectrum || {};
    
    let decisionText = "能量平穩。";
    if (score >= 85) decisionText = spectrum["90"] || "能量極盛。";
    else if (score >= 65) decisionText = spectrum["70"] || "積極進取。";
    else if (score >= 45) decisionText = spectrum["50"] || "保守穩健。";
    else decisionText = spectrum["30"] || "靜待時機。";

    let narrative = "無特殊重疊感應。";
    if (fullData.yearlyLuck && fullData.yearlyLuck.palaces[idx]) {
      const yPalace = fullData.yearlyLuck.palaces[idx];
      const overlayKey = `流命疊本${yPalace.overlayOnRoot.replace('宮', '')}`;
      narrative = dict.overlay_narratives?.[overlayKey] || `流年命宮疊在本命「${yPalace.overlayOnRoot}」。`;
    }

    const directives = (staticPalace.stars || []).map(s => {
      const baseName = s.name.split('(')[0];
      return dict.star_transformation_advice?.[baseName]?.[s.name.includes("(忌)") ? "忌" : "祿"] || `【${s.name}】：發揮其廟旺特性。`;
    });

    return {
      title: `${palaceName} 諮詢`,
      score: score,
      decisionSpectrum: decisionText,
      narrative: narrative,
      starDirectives: directives,
      summary: `${decisionText} ${narrative}`
    };
  },

  predictFutureTrend: function(fullData, dict, analyzer) {
    if (!fullData?.yearlyLuck) return null;
    
    // 解決 yLifeIdx 可能為 undefined 的問題
    const yLifeIdx = (typeof fullData.yearlyLuck.yLifeIdx === 'number') ? fullData.yearlyLuck.yLifeIdx : 0;
    
    const report = this.interpretPalace(yLifeIdx, fullData, dict, analyzer);
    const conflicts = analyzer.detectConflicts(fullData);
    const crisis = conflicts.find(c => c.isTripleTaboo || c.isClash);

    return {
      yearLabel: `${fullData.yearlyLuck.year} ${fullData.yearlyLuck.stemBranch}年`,
      mainTheme: report.narrative,
      score: report.score,
      strategy: report.decisionSpectrum,
      warning: crisis ? `⚠️ 注意：【${crisis.palaceName}】偵測到氣數衝突，宜採取守勢。` : "年度推演路徑相對穩定。"
    };
  }
};

export default ZiweiInterpreter;

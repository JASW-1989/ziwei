/**
 * ZiweiInterpreter - 紫微斗數解讀引擎 (Interpreter v1.2 - Interaction Edition)
 * 負責：將 Analyzer 的邏輯數據轉換為結構化的白話報告。
 * 更新：新增交互分析 (Interaction) 轉譯功能。
 */

import ZiweiAnalyzer from './ziwei_analyzer.js';
import dictionary from './ziwei_dictionary.json';

const ZiweiInterpreter = {
  /**
   * 生成單一宮位的綜合解析報告 (運勢面)
   */
  interpretPalace: function(palaceIdx, fullData) {
    const score = ZiweiAnalyzer.getPalaceScore(palaceIdx, fullData);
    const palaceName = fullData.staticChart.palaces[palaceIdx].name;
    const traits = dictionary.palace_traits[palaceName];
    
    let report = {
      title: `${palaceName} 運勢深度解析`,
      score: score,
      summary: score >= 70 ? traits.high_score : score <= 40 ? traits.low_score : "此領域能量平穩發展中。",
      advice: []
    };

    // 抓取主星建議
    fullData.staticChart.palaces[palaceIdx].stars.forEach(s => {
      const baseName = s.name.split('(')[0];
      if (dictionary.star_advice[baseName]) report.advice.push(dictionary.star_advice[baseName]);
    });

    return report;
  },

  /**
   * 生成主題式交互關係報告 (關係面)
   * 轉譯飛化關係為對待語句
   */
  interpretInteraction: function(theme, fullData) {
    const rawData = ZiweiAnalyzer.analyzeTheme(theme, fullData);
    let themeTitle = { "couple": "感情與配偶對待", "family": "家庭與家宅磁場", "parent_child": "親子對待關係" }[theme];
    
    let report = {
      title: themeTitle,
      details: []
    };

    rawData.interactions.forEach(item => {
      let analysisText = `【${item.desc}】：`;
      if (item.data.length === 0) {
        analysisText += "互動模式較為平淡或獨立，彼此能量干擾較少。";
      } else {
        item.data.forEach(inf => {
          const dictKey = theme === "parent_child" ? "parent_to_child" : theme === "couple" ? "couple" : "family";
          const traitText = dictionary.interaction_traits[dictKey]?.[inf.type] || "存在特定的交互引動。";
          analysisText += `[${inf.star}化${inf.type}] ${traitText} `;
        });
      }
      report.details.push(analysisText);
    });

    return report;
  }
};

export default ZiweiInterpreter;

/**
 * ZiweiInterpreter - 紫微斗數解讀引擎 (v1.3 - Browser Compatibility Edition)
 * 修正說明：
 * 1. 移除不相容的 JSON 靜態導入，改由參數注入 dictionary。
 * 2. 移除模組間的強耦合，確保在 GitHub Pages 環境下正常執行。
 */

const ZiweiInterpreter = {
  /**
   * 生成單一宮位的綜合解析報告
   * @param {number} palaceIdx - 宮位索引 (0-11)
   * @param {Object} fullData - 包含 staticChart, decadeInfo, yearlyLuck 的完整資料
   * @param {Object} dict - 由外部 fetch 載入的 ziwei_dictionary.json 物件
   * @param {Object} analyzer - (選填) ZiweiAnalyzer 模組，若不傳入則嘗試從全域尋找
   */
  interpretPalace: function(palaceIdx, fullData, dict, analyzer) {
    if (!dict) return { summary: "錯誤：尚未載入辭典數據。", advice: [] };
    
    // 優先使用傳入的 analyzer，否則嘗試從全域獲取
    const engineAnalyzer = analyzer || (typeof window !== 'undefined' && window.ZiweiAnalyzer);
    if (!engineAnalyzer) return { summary: "錯誤：分析核心未就緒。", advice: [] };

    const score = engineAnalyzer.getPalaceScore(palaceIdx, fullData);
    const palaceName = fullData.staticChart.palaces[palaceIdx].name;
    const traits = dict.palace_traits ? dict.palace_traits[palaceName] : null;
    
    let report = {
      title: `${palaceName} 深度解析`,
      score: score,
      summary: "",
      advice: []
    };

    // 依據分數區間轉譯斷語
    if (traits) {
      if (score >= 70) report.summary = traits.high || traits.high_score || "目前能量鼎盛，適合積極發揮。";
      else if (score <= 40) report.summary = traits.low || traits.low_score || "目前能量重整中，宜保守待時。";
      else report.summary = "此領域能量平穩，適合按部就班發展。";
    } else {
      report.summary = "目前宮位能量場趨於中性平衡。";
    }

    // 抓取主星行為建議
    if (dict.star_advice) {
      fullData.staticChart.palaces[palaceIdx].stars.forEach(s => {
        const baseName = s.name.split('(')[0];
        if (dict.star_advice[baseName]) {
          report.advice.push(dict.star_advice[baseName]);
        }
      });
    }

    return report;
  },

  /**
   * 生成主題式交互關係報告
   * @param {string} theme - 'couple', 'family', 'parent_child'
   * @param {Object} fullData - 完整推演資料
   * @param {Object} dict - 辭典物件
   * @param {Object} analyzer - 分析核心
   */
  interpretInteraction: function(theme, fullData, dict, analyzer) {
    if (!dict || !dict.interaction_traits) return { title: "數據缺失", details: ["尚未載入交互辭典。"] };
    
    const engineAnalyzer = analyzer || (typeof window !== 'undefined' && window.ZiweiAnalyzer);
    if (!engineAnalyzer || !engineAnalyzer.analyzeTheme) {
        return { title: "分析受阻", details: ["分析引擎不支援交互運算。"] };
    }

    const rawData = engineAnalyzer.analyzeTheme(theme, fullData);
    let themeTitle = { "couple": "感情與配偶對待", "family": "家庭與家宅磁場", "parent_child": "親子對待關係" }[theme] || "主題分析";
    
    let report = {
      title: themeTitle,
      details: []
    };

    rawData.interactions.forEach(item => {
      let analysisText = `【${item.desc}】：`;
      if (item.data.length === 0) {
        analysisText += "互動模式平淡，彼此能量干擾較少。";
      } else {
        item.data.forEach(inf => {
          // 修正對應字典 Key 的邏輯
          const dictKey = theme === "parent_child" ? "parent_child" : theme === "couple" ? "couple" : "family";
          const traitText = dict.interaction_traits[dictKey] ? dict.interaction_traits[dictKey][inf.type] : "存在特定引動感應。";
          analysisText += `[${inf.star}化${inf.type}] ${traitText} `;
        });
      }
      report.details.push(analysisText);
    });

    return report;
  }
};

export default ZiweiInterpreter;

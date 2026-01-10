/**
 * ZiweiInterpreter - 紫微斗數解讀引擎 (v1.4 - Absolute Clean Edition)
 * 此版本不包含任何 'import' 語句，確保在瀏覽器環境 100% 相容。
 * 所有依賴 (辭典與分析器) 皆透過參數注入。
 */

const ZiweiInterpreter = {
  /**
   * 生成單一宮位的綜合解析報告
   * @param {number} palaceIdx - 宮位索引
   * @param {Object} fullData - 包含 staticChart, decadeInfo, yearlyLuck 的完整資料
   * @param {Object} dict - 外部傳入的 ziwei_dictionary.json
   * @param {Object} analyzer - 外部傳入的 ZiweiAnalyzer 模組
   */
  interpretPalace: function(palaceIdx, fullData, dict, analyzer) {
    if (!dict || !dict.palace_traits) {
      return { summary: "數據異常：辭典未就緒。", advice: ["請確認辭典檔案載入狀態。"] };
    }
    
    // 優先使用傳入的 analyzer
    if (!analyzer || !analyzer.getPalaceScore) {
      return { summary: "分析受阻：分析核心未就緒。", advice: [] };
    }

    const score = analyzer.getPalaceScore(palaceIdx, fullData);
    const palaceName = fullData.staticChart.palaces[palaceIdx].name;
    const traits = dict.palace_traits[palaceName];
    
    let report = {
      title: `${palaceName} 深度解析`,
      score: score,
      summary: "目前宮位能量場趨於平穩。",
      advice: []
    };

    if (traits) {
      if (score >= 70) report.summary = traits.high || traits.high_score;
      else if (score <= 40) report.summary = traits.low || traits.low_score;
      else report.summary = "此領域能量平穩，適合按部就班發展。";
    }

    // 抓取星曜建議
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
   */
  interpretInteraction: function(theme, fullData, dict, analyzer) {
    if (!dict || !dict.interaction_traits) return { title: "數據缺失", details: ["尚未載入交互辭典。"] };
    if (!analyzer || !analyzer.analyzeTheme) return { title: "分析受阻", details: ["分析引擎不支援交互運算。"] };

    const rawData = analyzer.analyzeTheme(theme, fullData);
    const themeTitleMap = { "couple": "感情與配偶對待", "family": "家庭與家宅磁場", "parent_child": "親子對待關係" };
    
    let report = {
      title: themeTitleMap[theme] || "主題分析",
      details: []
    };

    rawData.interactions.forEach(item => {
      let analysisText = `【${item.desc}】：`;
      if (item.data.length === 0) {
        analysisText += "互動模式平淡，能量干擾較少。";
      } else {
        item.data.forEach(inf => {
          const dictKey = theme === "parent_child" ? "parent_child" : theme === "couple" ? "couple" : "family";
          const traitText = dict.interaction_traits[dictKey] ? dict.interaction_traits[dictKey][inf.type] : "存在特定的交互感應。";
          analysisText += `[${inf.star}化${inf.type}] ${traitText} `;
        });
      }
      report.details.push(analysisText);
    });

    return report;
  }
};

export default ZiweiInterpreter;

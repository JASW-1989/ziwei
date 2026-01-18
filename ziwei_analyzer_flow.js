/**
 * FlowAnalyzer - 流動應期分析器 (Flow Engine v2.1 - Enhanced)
 * 驗算結論：
 * 1. [對接 Luck v5.1]：確認使用正確的 yearLifeIdx 進行定位。
 * 2. [共振邏輯]：強化了「本命忌」與「大限忌」的區分，讓 AI 警示更精確。
 * 3. [對接 Decade v3.3]：正確處理 siHuaPath 結構。
 */

const FlowAnalyzer = {
  /**
   * 全方位流年分析入口
   */
  analyze: function(fullData, dict, decadeResult, natalResult) {
    const { yearlyLuck, monthlyLuck } = fullData;
    if (!yearlyLuck) return null;

    // 1. 三代疊宮主題分析
    const theme = this._analyzeYearlyTheme(yearlyLuck, dict);

    // 2. 高階能量共振掃描 (核心風險偵測)
    const resonance = this._detectAdvancedResonance(fullData, dict);

    // 3. 飛星觸發事件偵測
    const triggers = this._detectFlowTriggers(fullData, dict, decadeResult);

    // 4. 流月應期細化
    const monthForecast = monthlyLuck ? this._analyzeMonthlyForecast(monthlyLuck, dict, yearlyLuck) : null;

    // 5. 綜合流年評價
    const summary = this._generateFlowSummary(theme, resonance, triggers, natalResult);

    return {
      type: "Flow",
      year: yearlyLuck.year,
      stemBranch: yearlyLuck.stemBranch,
      theme: theme,
      resonanceRisk: resonance,
      triggers: triggers,
      monthlyForecast: monthForecast,
      summary: summary
    };
  },

  _analyzeYearlyTheme: function(yearlyLuck, dict) {
    const yLifePalace = yearlyLuck.palaces.find(p => p.yearlyName === "流命");
    const rootName = yLifePalace.overlayOnRoot; 
    const decadeName = yLifePalace.overlayOnDecade; 

    const palaceDef = dict.palace_definitions?.[rootName] || {};
    
    return {
      focus: rootName,
      decade_context: decadeName,
      description: `流年命宮疊於「本命${rootName}」與「${decadeName}」。`,
      impact_summary: palaceDef.overlay_context || `重心在於${rootName}相關事務。`,
      tactical_advice: `應以${rootName}為核心戰場，結合${decadeName}的十年計畫進行佈局。`
    };
  },

  _detectAdvancedResonance: function(fullData, dict) {
    const { staticChart, decadeInfo, yearlyLuck } = fullData;
    const logicDict = dict.si_hua_collision_logic || {};
    let resonanceResults = [];

    // 對流年 12 宮進行逐一掃描
    yearlyLuck.palaces.forEach(yPalace => {
      const pName = yPalace.overlayOnRoot;
      let collisionTracker = { "祿": [], "忌": [] };

      // A. 搜集本命四化
      yPalace.rootStars.forEach(s => {
        if (s.transformation === "祿") collisionTracker["祿"].push("本命祿");
        if (s.transformation === "忌") collisionTracker["忌"].push("本命忌");
      });

      // B. 搜集大限四化 (Decade v3.3 siHuaPath)
      if (decadeInfo?.siHuaPath?.祿?.targetPalaceName === pName) collisionTracker["祿"].push("大限祿");
      if (decadeInfo?.siHuaPath?.忌?.targetPalaceName === pName) collisionTracker["忌"].push("大限忌");

      // C. 搜集流年四化 (Luck v5.1 siHuaPath)
      if (yearlyLuck.siHuaPath?.祿?.impactRoot === pName) collisionTracker["祿"].push("流年祿");
      if (yearlyLuck.siHuaPath?.忌?.impactRoot === pName) collisionTracker["忌"].push("流年忌");

      // D. 格局邏輯判定
      // 1. 雙忌或三忌
      if (collisionTracker["忌"].length >= 2) {
        resonanceResults.push({
          palace: pName,
          type: collisionTracker["忌"].length === 3 ? "TRIPLE_JI" : "DOUBLE_JI",
          severity: collisionTracker["忌"].length === 3 ? "🛑 紅色警戒" : "⚠️ 黃色警戒",
          desc: logicDict["雙忌"]?.desc || "多重壓力匯聚點，易生變故。",
          sources: collisionTracker["忌"].join(" + ")
        });
      }

      // 2. 雙祿或三祿
      if (collisionTracker["祿"].length >= 2) {
        resonanceResults.push({
          palace: pName,
          type: "DOUBLE_LU",
          severity: "🟢 綠色機會",
          desc: logicDict["雙祿"]?.desc || "資源倍增效應。",
          sources: collisionTracker["祿"].join(" + ")
        });
      }

      // 3. 祿忌沖
      if (collisionTracker["祿"].length >= 1 && collisionTracker["忌"].length >= 1) {
        resonanceResults.push({
          palace: pName,
          type: "LU_JI_CLASH",
          severity: "🟠 橙色警告",
          desc: logicDict["祿忌沖"]?.desc || "吉處藏凶，表面機會實則陷阱。",
          sources: `${collisionTracker["祿"].join("/")} 遇 ${collisionTracker["忌"].join("/")}`
        });
      }
    });

    return resonanceResults;
  },

  _detectFlowTriggers: function(fullData, dict, decadeResult) {
    const { yearlyLuck } = fullData;
    const causalityRules = dict.flying_star_causality || {};
    let activeTriggers = [];

    const jiPalace = yearlyLuck.siHuaPath.忌.impactRoot;
    const yLifeOnRoot = yearlyLuck.palaces[yearlyLuck.yearLifeIdx].overlayOnRoot;

    Object.keys(causalityRules).forEach(key => {
      const rule = causalityRules[key];
      let isMatch = false;

      // 規則匹配邏輯
      if (rule.trigger === "財忌沖命" && yLifeOnRoot === "財帛宮" && jiPalace === "遷移宮") isMatch = true;
      if (rule.trigger.includes("忌入") && rule.trigger.includes(jiPalace)) isMatch = true;

      if (isMatch) {
        activeTriggers.push({
          label: rule.label,
          desc: rule.desc,
          strategy: rule.strategy
        });
      }
    });

    // 基礎結構補償
    if (activeTriggers.length === 0) {
      activeTriggers.push({
        label: `【${jiPalace}】受壓`,
        desc: `流年化忌進入${jiPalace}，相關事務可能面臨阻礙或延誤。`,
        strategy: "保持耐心，優先處理基礎建設，暫緩大規模變動。"
      });
    }

    return activeTriggers;
  },

  _analyzeMonthlyForecast: function(monthlyLuck, dict, yearlyLuck) {
    // 預留給未來流月功能
    return null;
  },

  _generateFlowSummary: function(theme, resonance, triggers, natalResult) {
    const highRisks = resonance.filter(r => r.type === "TRIPLE_JI" || r.type === "DOUBLE_JI");
    const luckLevel = resonance.filter(r => r.type === "DOUBLE_LU").length;
    
    let summary = `【年度主題】：${theme.description}\n`;
    
    if (highRisks.length > 0) {
      summary += `🛑 警示：本年需特別注意「${highRisks[0].palace}」的壓力，受 ${highRisks[0].sources} 影響，屬高風險期。\n`;
    }

    if (luckLevel > 0) {
      summary += `✅ 機會：在「${resonance.find(r => r.type === "DOUBLE_LU").palace}」具備強大助力，可多加利用。\n`;
    }

    summary += `💡 建議：${triggers[0]?.strategy || "本年宜穩紮穩打，順勢而為。"}`;

    return summary;
  }
};

export default FlowAnalyzer;

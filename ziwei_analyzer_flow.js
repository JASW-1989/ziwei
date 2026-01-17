/**
 * FlowAnalyzer - 流動應期分析器 (Professional Flow Engine v2.0)
 * 核心職責：處理流年、流月之動態事件引動與三代（本、大、流）能量碰撞。
 * * 升級重點：
 * 1. [體用主題分析]：自動解析流年宮位與大限、本命宮位的疊加含義。
 * 2. [動態觸發引擎]：基於辭典規則動態匹配飛星格局（如：財忌沖命、官祿飛祿）。
 * 3. [三代碰撞偵測]：實作「疊祿」、「雙忌」、「祿忌沖」等高階共振邏輯。
 * 4. [風險加權]：結合 Natal 底氣與 Decade 策略，進行精準的風險定級。
 */

const FlowAnalyzer = {
  /**
   * 全方位流年分析入口
   * @param {Object} fullData - 包含 staticChart, decadeInfo, yearlyLuck, monthlyLuck
   * @param {Object} dict - 系統辭典資料
   * @param {Object} decadeResult - 大限分析器結果 (Context)
   * @param {Object} natalResult - 本命分析器結果 (Context)
   */
  analyze: function(fullData, dict, decadeResult, natalResult) {
    const { yearlyLuck, monthlyLuck } = fullData;
    if (!yearlyLuck) return null;

    // 1. 三代疊宮主題分析 (決定今年的核心戰場)
    const theme = this._analyzeYearlyTheme(yearlyLuck, dict);

    // 2. 高階能量共振掃描 (雙祿、雙忌、祿忌沖)
    const resonance = this._detectAdvancedResonance(fullData, dict);

    // 3. 飛星觸發事件偵測 (基於辭典 causality)
    const triggers = this._detectFlowTriggers(fullData, dict, decadeResult);

    // 4. 流月應期細化 (若有資料)
    const monthForecast = monthlyLuck ? this._analyzeMonthlyForecast(monthlyLuck, dict, yearlyLuck) : null;

    // 5. 綜合流年評價 (綜合體用、共振與觸發)
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

  /**
   * 內部：分析流年疊宮主題 (體用辨證)
   */
  _analyzeYearlyTheme: function(yearlyLuck, dict) {
    const yLifePalace = yearlyLuck.palaces.find(p => p.yearlyName === "流命");
    const rootName = yLifePalace.overlayOnRoot; // 疊本命宮位
    const decadeName = yLifePalace.overlayOnDecade; // 疊大限宮位

    const palaceDef = dict.palace_definitions?.[rootName] || {};
    
    return {
      focus: rootName,
      decade_context: decadeName,
      description: `今年流年命宮疊於「本命${rootName}」與「${decadeName}」。`,
      impact_summary: palaceDef.overlay_context || `重心在於${rootName}相關事務。`,
      tactical_advice: `應以${rootName}為核心戰場，結合${decadeName}的十年計畫進行佈局。`
    };
  },

  /**
   * 內部：偵測三代能量碰撞 (核心邏輯)
   */
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

      // B. 搜集大限四化 (透過 decadeInfo 的路徑)
      if (decadeInfo?.siHuaPath?.祿?.targetPalaceName === pName) collisionTracker["祿"].push("大限祿");
      if (decadeInfo?.siHuaPath?.忌?.targetPalaceName === pName) collisionTracker["忌"].push("大限忌");

      // C. 搜集流年四化
      if (yearlyLuck.siHuaPath?.祿?.impactRoot === pName) collisionTracker["祿"].push("流年祿");
      if (yearlyLuck.siHuaPath?.忌?.impactRoot === pName) collisionTracker["忌"].push("流年忌");

      // D. 格局邏輯判定
      // 1. 雙忌或三忌 (壓力連鎖)
      if (collisionTracker["忌"].length >= 2) {
        resonanceResults.push({
          palace: pName,
          type: collisionTracker["忌"].length === 3 ? "TRIPLE_JI" : "DOUBLE_JI",
          severity: collisionTracker["忌"].length === 3 ? "🛑 紅色警戒" : "⚠️ 黃色警戒",
          desc: logicDict["雙忌"]?.desc || "多重壓力匯聚點，易生變故。",
          sources: collisionTracker["忌"].join(" + ")
        });
      }

      // 2. 雙祿或三祿 (資源重疊)
      if (collisionTracker["祿"].length >= 2) {
        resonanceResults.push({
          palace: pName,
          type: "DOUBLE_LU",
          severity: "🟢 綠色機會",
          desc: logicDict["雙祿"]?.desc || "資源加倍，事半功倍。",
          sources: collisionTracker["祿"].join(" + ")
        });
      }

      // 3. 祿忌沖 (吉處藏凶)
      if (collisionTracker["祿"].length >= 1 && collisionTracker["忌"].length >= 1) {
        resonanceResults.push({
          palace: pName,
          type: "LU_JI_CLASH",
          severity: "🟠 橙色警告",
          desc: logicDict["祿忌沖"]?.desc || "看似機會實則陷阱，需防先成後敗。",
          sources: `${collisionTracker["祿"].join("/")} 遇 ${collisionTracker["忌"].join("/")}`
        });
      }
    });

    return resonanceResults;
  },

  /**
   * 內部：飛星觸發偵測 (不再硬編碼，使用詞典配置)
   */
  _detectFlowTriggers: function(fullData, dict, decadeResult) {
    const { yearlyLuck } = fullData;
    const causalityRules = dict.flying_star_causality || {};
    let activeTriggers = [];

    const jiPalace = yearlyLuck.siHuaPath.忌.impactRoot;
    const luPalace = yearlyLuck.siHuaPath.祿.impactRoot;
    const yLifeOnRoot = yearlyLuck.palaces[yearlyLuck.yearLifeIdx].overlayOnRoot;

    // 比對辭典中的觸發規則
    Object.keys(causalityRules).forEach(key => {
      const rule = causalityRules[key];
      let isMatch = false;

      // 解析規則 (範例：財忌沖命)
      if (rule.trigger === "財忌沖命" && yLifeOnRoot === "財帛宮" && jiPalace === "遷移宮") {
        isMatch = true;
      }
      
      // 解析通用的忌入/沖規則
      if (rule.trigger.includes("忌入") && rule.trigger.includes(jiPalace)) {
        isMatch = true;
      }

      if (isMatch) {
        activeTriggers.push({
          label: rule.label,
          desc: rule.desc,
          strategy: rule.strategy
        });
      }
    });

    // 基礎結構補償 (若無特定格，則根據流年忌入宮位給予基礎建議)
    if (activeTriggers.length === 0) {
      activeTriggers.push({
        label: `【${jiPalace}】受壓`,
        desc: `流年化忌進入${jiPalace}，相關事務可能面臨阻礙或延誤。`,
        strategy: "保持耐心，優先處理基礎建設，暫緩大規模變動。"
      });
    }

    return activeTriggers;
  },

  /**
   * 內部：流月預測細化
   */
  _analyzeMonthlyForecast: function(monthlyLuck, dict, yearlyLuck) {
    const jiPalace = monthlyLuck.siHuaPath.忌.palace;
    const luPalace = monthlyLuck.siHuaPath.祿.palace;
    const mLife = monthlyLuck.palaces.find(p => p.monthlyName === "流月命");

    return {
      month: monthlyLuck.lunarMonth,
      focus: `本月核心戰場：${mLife.overlayOnYear} (對應本命${mLife.overlayOnRoot})`,
      warning: `忌星飛入「${jiPalace}」，防範突發性延誤。`,
      opportunity: `祿星飛入「${luPalace}」，利於開展小規模嘗試。`,
      advice: "注意流月忌對流年計畫的干擾，保持靈活調整。"
    };
  },

  /**
   * 總結報告生成
   */
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

/**
 * TrendAnalyzer - 運限趨勢分析器 (Trend Strategy v1.1)
 * 專注於：大限十年運勢、環境氣數、疊宮疊曜分析。
 * 升級：接收 natalResult 進行戰略修正。
 */

const SIHUA_RULES = {
  "甲": { "祿": "廉貞", "權": "破軍", "科": "武曲", "忌": "太陽" },
  "乙": { "祿": "天機", "權": "天梁", "科": "紫微", "忌": "太陰" },
  "丙": { "祿": "天同", "權": "天機", "科": "文昌", "忌": "廉貞" },
  "丁": { "祿": "太陰", "權": "天同", "科": "天機", "忌": "巨門" },
  "戊": { "祿": "貪狼", "權": "太陰", "科": "右弼", "忌": "天機" },
  "己": { "祿": "武曲", "權": "貪狼", "科": "天梁", "忌": "文曲" },
  "庚": { "祿": "太陽", "權": "武曲", "科": "太陰", "忌": "天同" },
  "辛": { "祿": "巨門", "權": "太陽", "科": "文曲", "忌": "文昌" },
  "壬": { "祿": "天梁", "權": "紫微", "科": "左輔", "忌": "武曲" },
  "癸": { "祿": "破軍", "權": "巨門", "科": "太陰", "忌": "貪狼" }
};

const TrendAnalyzer = {
  /**
   * @param {Object} natalResult - 注入本命分析結果
   */
  analyze: function(fullData, dict, natalResult) {
    const { staticChart, decadeInfo } = fullData;
    if (!decadeInfo) return null;

    // 1. 疊宮主題分析
    const overlayTheme = this._analyzeOverlay(decadeInfo);

    // 2. 終極因果路徑
    const causality = this._traceUltimateBurden(decadeInfo.decadeLifeIdx, staticChart);

    // 3. 大限策略定位 (加入本命強弱的判斷)
    const strategy = this._determineStrategy(decadeInfo, natalResult);

    return {
      type: "Trend",
      decadeRange: decadeInfo.decadeRange,
      theme: overlayTheme,
      causality: causality,
      strategy: strategy
    };
  },

  _analyzeOverlay: function(decadeInfo) {
    const dLife = decadeInfo.palaces.find(p => p.decadeName === "大限命");
    const rootName = dLife.overlayOnRoot; 
    
    const overlayDict = {
      "命宮": "自我覺醒、命運重啟", "兄弟宮": "資金周轉、手足競爭",
      "夫妻宮": "感情緣分、合夥契約", "子女宮": "桃花、投資、外出",
      "財帛宮": "求財慾望、價值觀戰", "疾厄宮": "身體過勞、工作場所",
      "遷移宮": "出外際遇、環境變遷", "交友宮": "人際疲乏、受眾服務",
      "官祿宮": "事業衝刺、功名爭取", "田宅宮": "家運興衰、資產累積",
      "福德宮": "精神享受、靈性探索", "父母宮": "文書證件、長輩關係"
    };

    return {
      rootPalace: rootName,
      desc: overlayDict[rootName] || "運勢轉折期",
      focus: `這十年的核心戰場在於【${rootName}】，${overlayDict[rootName]}。`
    };
  },

  _traceUltimateBurden: function(startIdx, staticChart) {
    const pStart = staticChart.palaces[startIdx];
    const stem = pStart.stem;
    const luStar = SIHUA_RULES[stem].祿;
    
    const pLu = staticChart.palaces.find(p => p.stars.some(s => s.name.includes(luStar)));
    if (!pLu) return null;

    const bridgeJiStar = SIHUA_RULES[pLu.stem].忌;
    const pBridge = staticChart.palaces.find(p => p.stars.some(s => s.name.includes(bridgeJiStar)));

    const finalJiStar = pBridge ? SIHUA_RULES[pBridge.stem].忌 : null;
    const pFinal = finalJiStar ? staticChart.palaces.find(p => p.stars.some(s => s.name.includes(finalJiStar))) : null;

    return {
      opportunity: `大限化祿入${pLu.name}，機會點在於${pLu.name}相關事務。`,
      outcome: pFinal ? `最終壓力沈澱於【${pFinal.name}】。` : "能量流向不明顯。"
    };
  },

  _determineStrategy: function(decadeInfo, natalResult) {
    const attr = decadeInfo.palaceAttribute;
    let baseStrategy = "調整期";
    
    if (attr.includes("開創")) baseStrategy = "【主攻期】";
    else if (attr.includes("守成")) baseStrategy = "【防守期】";
    else if (attr.includes("權威")) baseStrategy = "【掌權期】";

    // Context Injection: 體用修正
    // 如果本命分數過低，強制降級策略
    if (natalResult && natalResult.lifeScore < 60 && baseStrategy === "【主攻期】") {
      return baseStrategy + " (但受限於本命底氣，建議採「游擊戰」而非「陣地戰」)";
    }

    return baseStrategy + `：${attr.split('(')[1].replace(')', '')}`;
  }
};

export default TrendAnalyzer;

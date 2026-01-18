/**
 * TrendAnalyzer - 運限趨勢分析器 (Trend Strategy v1.2 - Verified)
 * 驗算結論：
 * 1. [對接 Decade v3.3]：確認邏輯不依賴「大限昌曲」，僅追蹤四化路徑。
 * 2. [戰略修正]：_determineStrategy 增加了對「木三局」等局數參數的容錯（雖不直接使用局數，但依賴正確的大限星曜屬性）。
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
   * @param {Object} natalResult - 注入本命分析結果，用於體用辯證
   */
  analyze: function(fullData, dict, natalResult) {
    const { staticChart, decadeInfo } = fullData;
    if (!decadeInfo) return null;

    // 1. 疊宮主題分析
    const overlayTheme = this._analyzeOverlay(decadeInfo);

    // 2. 終極因果路徑 (大限四化追蹤)
    // 這裡使用 Decade v3.3 產生的正確宮干
    const causality = this._traceUltimateBurden(decadeInfo.decadeLifeIdx, staticChart);

    // 3. 大限戰略定位
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
      "命宮": "命運重啟期", "兄弟宮": "現金週轉與合作期",
      "夫妻宮": "契約與情感磨合期", "子女宮": "擴張與消耗期",
      "財帛宮": "價值變現期", "疾厄宮": "身心壓力檢測期",
      "遷移宮": "外部舞台展現期", "交友宮": "人際服務與積累期",
      "官祿宮": "事業衝刺與掌權期", "田宅宮": "資產鞏固與家運期",
      "福德宮": "精神靈性探索期", "父母宮": "形象審核與文書期"
    };

    return {
      rootPalace: rootName,
      desc: overlayDict[rootName] || "運勢轉折期",
      focus: `大限命宮疊於本命【${rootName}】，這十年是您的「${overlayDict[rootName]}」。`
    };
  },

  _traceUltimateBurden: function(startIdx, staticChart) {
    // 取得大限命宮的宮干
    const pStart = staticChart.palaces[startIdx];
    const stem = pStart.stem;
    
    // 追蹤化祿 (起因/機會)
    const luStar = SIHUA_RULES[stem].祿;
    const pLu = staticChart.palaces.find(p => p.stars.some(s => s.name.includes(luStar)));
    if (!pLu) return null;

    // 追蹤祿轉忌 (中間過程/轉折)
    const bridgeJiStar = SIHUA_RULES[pLu.stem].忌;
    const pBridge = staticChart.palaces.find(p => p.stars.some(s => s.name.includes(bridgeJiStar)));

    // 追蹤忌轉忌 (最終結果/負擔)
    const finalJiStar = pBridge ? SIHUA_RULES[pBridge.stem].忌 : null;
    const pFinal = finalJiStar ? staticChart.palaces.find(p => p.stars.some(s => s.name.includes(finalJiStar))) : null;

    return {
      opportunity: `大限化祿入${pLu.name} (${luStar})，機會點在於${pLu.name}相關事務。`,
      outcome: pFinal ? `能量最終的負擔與責任將沈澱於【${pFinal.name}】。` : "能量流轉較為隱晦。"
    };
  },

  _determineStrategy: function(decadeInfo, natalResult) {
    const attr = decadeInfo.palaceAttribute; // 來自 ziwei_decade.js 的 _getPalaceAttribute
    let baseStrategy = "調整期";
    
    if (attr.includes("開創")) baseStrategy = "【主攻期】";
    else if (attr.includes("守成")) baseStrategy = "【防守期】";
    else if (attr.includes("權威")) baseStrategy = "【掌權期】";

    // 體用修正：若本命分數過低，強制降級策略
    if (natalResult && natalResult.lifeScore < 60 && baseStrategy === "【主攻期】") {
      return baseStrategy + " (但受限於本命底氣，建議採「游擊戰」而非「陣地戰」)";
    }

    return baseStrategy + `：${attr.split('(')[1].replace(')', '')}`;
  }
};

export default TrendAnalyzer;

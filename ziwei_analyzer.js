/**
 * ZiweiAnalyzer - 紫微斗數邏輯分析引擎 (Analysis Engine v1.6 - Interaction Edition)
 * 負責：三方四正數據聚合、能量評分、格局判定，以及新增的「宮位飛化對待」運算。
 * 特色：實作宮位飛化 (Flying Stars)，偵測宮位間的引動關係。
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

const ZiweiAnalyzer = {
  /**
   * 1. 數據聚合 (Aggregation)
   * 建立三方四正模型，對應本、大、流、月四層數據
   */
  getRelationalData: function(palaceIdx, fullData) {
    const { staticChart, decadeInfo, yearlyLuck, monthlyLuck } = fullData;
    const relations = [
      palaceIdx, 
      (palaceIdx + 6) % 12, // 對宮
      (palaceIdx + 4) % 12, // 合宮1
      (palaceIdx + 8) % 12  // 合宮2
    ];

    return relations.map(idx => {
      const staticPalace = staticChart.palaces[idx];
      return {
        index: idx,
        palaceName: staticPalace.name,
        stem: staticPalace.stem,
        isBodyPalace: staticPalace.isBodyPalace || false,
        rootStars: staticPalace.stars,
        decadePalace: decadeInfo ? decadeInfo.palaces[idx] : null,
        yearlyPalace: yearlyLuck ? yearlyLuck.palaces[idx] : null,
        monthlyPalace: monthlyLuck ? monthlyLuck.palaces[idx] : null
      };
    });
  },

  /**
   * 2. 宮位飛化偵測 (Flying Stars Detection)
   * 偵測「發射宮位 (From)」的天干引動「接收宮位 (To)」的星曜
   * @returns {Array} 包含 {type: '祿/權/科/忌', star: '星名'} 的陣列
   */
  detectFlyingInfluence: function(fromIdx, toIdx, fullData) {
    const fromPalace = fullData.staticChart.palaces[fromIdx];
    const toPalace = fullData.staticChart.palaces[toIdx];
    const stem = fromPalace.stem;
    const rules = SIHUA_RULES[stem];
    
    let influences = [];
    toPalace.stars.forEach(s => {
      const baseName = s.name.split('(')[0];
      for (let type in rules) {
        if (rules[type] === baseName) {
          influences.push({ type, star: baseName });
        }
      }
    });
    return influences;
  },

  /**
   * 3. 主題式交互分析 (Thematic Interaction Analysis)
   * 針對：夫妻關係、家庭環境、父母子女關係進行對待分析
   */
  analyzeTheme: function(theme, fullData) {
    const findIdx = (name) => fullData.staticChart.palaces.findIndex(p => p.name === name);
    const lifeIdx = findIdx("命宮");
    let report = { theme, interactions: [] };

    switch(theme) {
      case "couple":
        const coupleIdx = findIdx("夫妻");
        report.interactions.push({ desc: "配偶對我的態度", data: this.detectFlyingInfluence(coupleIdx, lifeIdx, fullData) });
        report.interactions.push({ desc: "我對配偶的期望", data: this.detectFlyingInfluence(lifeIdx, coupleIdx, fullData) });
        break;
      case "family":
        const propertyIdx = findIdx("田宅");
        report.interactions.push({ desc: "家庭環境對我的能量支持", data: this.detectFlyingInfluence(propertyIdx, lifeIdx, fullData) });
        break;
      case "parent_child":
        const parentIdx = findIdx("父母");
        const childIdx = findIdx("子女");
        report.interactions.push({ desc: "父母對子女的教育風格", data: this.detectFlyingInfluence(parentIdx, childIdx, fullData) });
        report.interactions.push({ desc: "子女對我的回饋感", data: this.detectFlyingInfluence(childIdx, lifeIdx, fullData) });
        break;
    }
    return report;
  },

  /**
   * 4. 能量評分與衝突偵測 (維持原有穩定邏輯)
   */
  getPalaceScore: function(palaceIdx, fullData) {
    const relData = this.getRelationalData(palaceIdx, fullData);
    let score = 50; 
    const brightnessWeight = { "廟": 10, "旺": 7, "得": 4, "利": 2, "平": 0, "陷": -10 };
    relData.forEach((p, rIdx) => {
      let multiplier = rIdx === 0 ? 1.0 : rIdx === 1 ? 0.7 : 0.4;
      p.rootStars.forEach(s => {
        score += (brightnessWeight[s.brightness] || 0) * multiplier;
        if (s.name.includes("(祿)")) score += 15 * multiplier;
        if (s.name.includes("(忌)")) score -= 20 * multiplier;
      });
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  }
};

export default ZiweiAnalyzer;

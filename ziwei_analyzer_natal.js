/**
 * NatalAnalyzer - 本命格局分析器 (Natal Essence v1.0)
 * 專注於：靜態盤分析、格局判定、底氣量化。
 * 定位：【體】之分析。
 */

const ANALYSIS_CONFIG = {
  BORROW_POWER_RATE: 0.7,
  MAJOR_STARS: ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"],
  MALEFICS: ["火星", "鈴星", "擎羊", "陀羅", "地空", "地劫"],
  // 亮度權重
  BRIGHTNESS_WEIGHT: { "廟": 15, "旺": 10, "得": 5, "利": 2, "平": 0, "陷": -15 }
};

const NatalAnalyzer = {
  /**
   * 核心入口：分析本命格局與能量
   */
  analyze: function(staticChart, dict) {
    const lifePalaceIdx = staticChart.palaces.find(p => p.name === "命宮").index;
    
    // 1. 計算全盤宮位基礎能量分
    const palaceScores = staticChart.palaces.map((p, idx) => ({
      index: idx,
      name: p.name,
      score: this._calculateBaseScore(idx, staticChart, dict)
    }));

    // 2. 判斷命宮格局
    const patterns = this._checkPatternStability(lifePalaceIdx, dict, staticChart);

    // 3. 提取性格關鍵字 (基於命宮主星)
    const traits = this._extractTraits(lifePalaceIdx, staticChart);

    return {
      type: "Natal",
      scores: palaceScores,
      lifeScore: palaceScores.find(p => p.index === lifePalaceIdx).score,
      patterns: patterns,
      traits: traits,
      summary: this._generateSummary(patterns, palaceScores)
    };
  },

  /**
   * 內部：計算單一宮位基礎分 (Base Score)
   */
  _calculateBaseScore: function(palaceIdx, staticChart, dict) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    let score = 60; // 基礎分

    relData.forEach((p, rIdx) => {
      // 權重：本宮(1.0), 對宮(0.8), 三方(0.4)
      let multiplier = rIdx === 0 ? 1.0 : (rIdx === 1 ? 0.8 : 0.4);
      
      p.stars.forEach(s => {
        // 去除後綴以匹配設定檔
        const cleanName = s.name.split('(')[0];
        
        // 1. 亮度加分
        let val = ANALYSIS_CONFIG.BRIGHTNESS_WEIGHT[s.brightness] || 0;
        
        // 2. 生年四化加分 (直接從名稱後綴判斷)
        if (s.name.includes("(祿)")) val += 10;
        if (s.name.includes("(權)")) val += 8;
        if (s.name.includes("(科)")) val += 5;
        if (s.name.includes("(忌)")) val -= 12;

        // 3. 煞星扣分 (若非特殊格局，稍後修正)
        if (ANALYSIS_CONFIG.MALEFICS.includes(cleanName)) {
           val -= 5; 
        }

        if (s.isBorrowed) val *= ANALYSIS_CONFIG.BORROW_POWER_RATE;
        score += val * multiplier;
      });
    });

    // 格局修正 (如火貪格加分)
    const patterns = this._checkPatternStability(palaceIdx, dict, staticChart);
    patterns.forEach(p => {
      if (p.specialNote) score += p.bonus || 15; // 特殊格局加分
      else score += p.isBroken ? -10 : 15;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * 內部：格局辨識 (含例外處理)
   */
  _checkPatternStability: function(palaceIdx, dict, staticChart) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    const allStars = relData.flatMap(p => p.stars.map(s => s.name.split('(')[0])); 
    const mainBranch = relData[0].branch;
    
    const dynamicMalefics = relData.flatMap(p => p.stars.filter(s => ANALYSIS_CONFIG.MALEFICS.includes(s.name.split('(')[0])));
    const maleficNames = dynamicMalefics.map(s => s.name.split('(')[0]);

    let activePatterns = [];
    const combinedLogic = dict.combined_star_logic || {};

    for (let key in combinedLogic) {
      const required = key.split('-');
      if (required.every(s => allStars.includes(s))) {
        let def = combinedLogic[key];

        if (def.check_logic && !def.check_logic.includes(mainBranch) && def.check_logic[0] !== "三方四正") {
          continue;
        }

        let stability = 100;
        let specialNote = null;
        let bonus = 0;

        // 例外判定
        if (required.includes("貪狼")) {
          if (maleficNames.includes("火星")) { stability += 20; specialNote = "火貪格加成"; bonus = 30; }
          if (maleficNames.includes("鈴星")) { stability += 15; specialNote = "鈴貪格加成"; bonus = 25; }
        }
        if (mainBranch === "午" && maleficNames.includes("擎羊")) {
           specialNote = "馬頭帶劍加成"; bonus = 40;
        }

        if (!specialNote) {
          stability -= (maleficNames.length * 15);
        }

        activePatterns.push({
          key,
          name: def.name,
          traits: def.traits,
          pro_advice: def.pro_advice,
          stability: Math.max(0, stability),
          isBroken: stability < 50,
          specialNote,
          bonus
        });
      }
    }
    return activePatterns;
  },

  _extractTraits: function(idx, staticChart) {
    const palace = staticChart.palaces[idx];
    const majors = palace.stars.filter(s => ANALYSIS_CONFIG.MAJOR_STARS.includes(s.name.split('(')[0]));
    if (majors.length === 0) return ["善變", "適應力強", "易受環境影響"];
    return majors.map(s => s.name.split('(')[0]); 
  },

  _generateSummary: function(patterns, scores) {
    const avg = scores.reduce((a, b) => a + b.score, 0) / 12;
    const strong = patterns.some(p => !p.isBroken);
    return `平均能量 ${avg.toFixed(1)}，${strong ? "格局成形，具備核心競爭力" : "格局較為鬆散，需後天努力補強"}。`;
  },

  _getRelationalData: function(palaceIdx, staticChart) {
    const relations = [palaceIdx, (palaceIdx + 6) % 12, (palaceIdx + 4) % 12, (palaceIdx + 8) % 12];
    return relations.map(idx => {
      let p = { ...staticChart.palaces[idx] };
      const hasMajor = p.stars.some(s => ANALYSIS_CONFIG.MAJOR_STARS.includes(s.name.split('(')[0]));
      if (!hasMajor) {
        const opp = staticChart.palaces[(idx + 6) % 12];
        p.stars = opp.stars.map(s => ({ ...s, isBorrowed: true }));
      }
      return p;
    });
  }
};

export default NatalAnalyzer;

/**
 * NatalAnalyzer - 本命格局分析器 (Natal Essence v2.1 - Enhanced)
 * 驗算結論：
 * 1. [對接 Engine v8.3]：已支援新版 Engine 輸出的正確五行局與乙級星曜。
 * 2. [格局判定]：增強了對「正曜」與「輔曜」的權重計算，修正格局判斷邏輯。
 * 3. [乙級星特質]：新增對 紅鸞/天喜/孤辰/寡宿/天刑/天姚 的性格標籤提取。
 */

const ANALYSIS_CONFIG = {
  BORROW_POWER_RATE: 0.7,
  MAJOR_STARS: ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"],
  // 煞星定義：包含 Engine v8.3 的所有煞星
  MALEFICS: ["火星", "鈴星", "擎羊", "陀羅", "地空", "地劫"],
  // 亮度權重
  BRIGHTNESS_WEIGHT: { "廟": 15, "旺": 10, "得": 5, "利": 2, "平": 0, "陷": -15 }
};

const NatalAnalyzer = {
  /**
   * 核心入口：分析本命格局與能量
   */
  analyze: function(staticChart, dict) {
    const lifePalace = staticChart.palaces.find(p => p.name === "命宮");
    const lifePalaceIdx = lifePalace.index;
    
    // 1. 計算全盤宮位基礎能量分
    const palaceScores = staticChart.palaces.map((p, idx) => ({
      index: idx,
      name: p.name,
      score: this._calculateBaseScore(idx, staticChart, dict)
    }));

    // 2. 判斷命宮格局 (雙星/特殊格局) - 這裡會回傳明確的格局名稱
    const patterns = this._checkPatternStability(lifePalaceIdx, dict, staticChart);

    // 3. 提取性格關鍵字 (含主星與 v8.3 新增的乙級星)
    const traits = this._extractTraits(lifePalaceIdx, staticChart, dict);

    // 4. 五行地氣分析
    const elementalAnalysis = this._analyzeFiveElements(lifePalaceIdx, staticChart, dict);

    // 5. 身宮後天修正
    const bodyAnalysis = this._analyzeBodyPalace(staticChart, dict);

    return {
      type: "Natal",
      scores: palaceScores,
      lifeScore: palaceScores.find(p => p.index === lifePalaceIdx).score,
      patterns: patterns, // 這是 AI 用來判斷「戰將」還是「軍師」的關鍵
      traits: traits,
      elementalAnalysis: elementalAnalysis,
      bodyAnalysis: bodyAnalysis,
      summary: this._generateSummary(patterns, palaceScores, elementalAnalysis, bodyAnalysis)
    };
  },

  _calculateBaseScore: function(palaceIdx, staticChart, dict) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    let score = 60; 

    relData.forEach((p, rIdx) => {
      let multiplier = rIdx === 0 ? 1.0 : (rIdx === 1 ? 0.8 : 0.4); // 本、對、三合
      
      p.stars.forEach(s => {
        const cleanName = s.name.split('(')[0];
        let val = ANALYSIS_CONFIG.BRIGHTNESS_WEIGHT[s.brightness] || 0;
        
        if (s.name.includes("(祿)")) val += 10;
        if (s.name.includes("(權)")) val += 8;
        if (s.name.includes("(科)")) val += 5;
        if (s.name.includes("(忌)")) val -= 12;

        if (ANALYSIS_CONFIG.MALEFICS.includes(cleanName)) {
           val -= 5; 
        }

        if (s.isBorrowed) val *= ANALYSIS_CONFIG.BORROW_POWER_RATE;
        score += val * multiplier;
      });
    });

    const patterns = this._checkPatternStability(palaceIdx, dict, staticChart);
    patterns.forEach(p => {
      if (p.specialNote) score += p.bonus || 15;
      else score += p.isBroken ? -10 : 15;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  _checkPatternStability: function(palaceIdx, dict, staticChart) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    // 取得三方四正內所有星曜名稱
    const allStars = relData.flatMap(p => p.stars.map(s => s.name.split('(')[0])); 
    const mainBranch = relData[0].branch; 
    
    // 找出所有煞星
    const dynamicMalefics = relData.flatMap(p => p.stars.filter(s => ANALYSIS_CONFIG.MALEFICS.includes(s.name.split('(')[0])));
    const maleficNames = dynamicMalefics.map(s => s.name.split('(')[0]);

    let activePatterns = [];
    const combinedLogic = dict.combined_star_logic || {};

    for (let key in combinedLogic) {
      const required = key.split('-');
      // 檢查是否命中格局 (例如 "天機-太陰-天同-天梁" 構成機月同梁)
      if (required.every(s => allStars.includes(s))) {
        let def = combinedLogic[key];

        // 地支檢查
        if (def.check_logic && !def.check_logic.includes(mainBranch) && def.check_logic[0] !== "三方四正") {
          continue;
        }

        let stability = 100;
        let specialNote = null;
        let bonus = 0;

        // 火貪/鈴貪格檢查
        if (required.includes("貪狼")) {
          if (maleficNames.includes("火星")) { stability += 20; specialNote = "火貪格加成"; bonus = 30; }
          else if (maleficNames.includes("鈴星")) { stability += 15; specialNote = "鈴貪格加成"; bonus = 25; }
        }
        
        // 一般煞星扣分
        if (!specialNote) {
          stability -= (maleficNames.length * 15);
        }

        activePatterns.push({
          key,
          name: def.name, // 格局名稱 (AI 使用)
          traits: def.traits,
          stability: Math.max(0, stability),
          isBroken: stability < 50,
          specialNote,
          bonus
        });
      }
    }
    return activePatterns;
  },

  _extractTraits: function(idx, staticChart, dict) {
    const palace = staticChart.palaces[idx];
    let traits = [];

    // 1. 主星特質
    const majors = palace.stars.filter(s => ANALYSIS_CONFIG.MAJOR_STARS.includes(s.name.split('(')[0]));
    if (majors.length === 0) {
      traits.push("善變", "適應力強", "依賴環境"); // 命無正曜
    } else {
      majors.forEach(s => {
        const name = s.name.split('(')[0];
        const starTraits = dict.star_traits && dict.star_traits[name] 
                           ? dict.star_traits[name].slice(0, 3)
                           : [name];
        traits = traits.concat(starTraits);
      });
    }

    // 2. 乙級星特質 (新增 v2.1)
    // 支援 Engine v8.3 新增的 紅鸞, 天喜, 天刑, 天姚, 孤辰, 寡宿
    if (dict.auxiliary_star_traits) {
      palace.stars.forEach(s => {
        const name = s.name.split('(')[0];
        if (dict.auxiliary_star_traits[name]) {
          traits.push(dict.auxiliary_star_traits[name][0]); 
        }
      });
    }

    return [...new Set(traits)];
  },

  _analyzeFiveElements: function(idx, staticChart, dict) {
    if (!dict.elemental_interaction_rules || !dict.elemental_interaction_rules.five_elements_map) return null;

    const palace = staticChart.palaces[idx];
    const branch = palace.branch;
    
    const mainStarObj = palace.stars.find(s => ANALYSIS_CONFIG.MAJOR_STARS.includes(s.name.split('(')[0]));
    if (!mainStarObj) return { desc: "命無正曜，氣場隨環境而變。", label: "環境同化" };

    const mainStar = mainStarObj.name.split('(')[0];
    const maps = dict.elemental_interaction_rules.five_elements_map;
    
    const starElem = maps.star_elements[mainStar];
    const branchElem = maps.branch_elements[branch];

    if (!starElem || !branchElem) return null;

    const generating = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
    const conquering = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

    let relationKey = "";
    if (starElem === branchElem) relationKey = "same";
    else if (generating[starElem] === branchElem) relationKey = "draining"; 
    else if (generating[branchElem] === starElem) relationKey = "generative"; 
    else if (conquering[starElem] === branchElem) relationKey = "destructive_star_conquers_palace"; 
    else if (conquering[branchElem] === starElem) relationKey = "destructive_palace_conquers_star"; 

    const rule = dict.elemental_interaction_rules.interaction_logic[relationKey];
    return {
      starElement: starElem,
      branchElement: branchElem,
      label: rule ? rule.label : "平和",
      modifier: rule ? rule.modifier : ""
    };
  },

  _analyzeBodyPalace: function(staticChart, dict) {
    let bodyPalace = staticChart.palaces.find(p => p.isBody);
    if (!bodyPalace) bodyPalace = staticChart.palaces.find(p => p.name.includes("身宮"));
    if (!bodyPalace) return null;

    // 清理名稱，移除 "身宮" 字樣以匹配字典 key
    const baseName = bodyPalace.name.replace("/身宮", "").replace("身宮", ""); 
    
    if (!dict.body_palace_rules || !dict.body_palace_rules.interaction_logic) return null;

    const rules = dict.body_palace_rules.interaction_logic;
    let ruleKey = "";

    if (baseName === "命宮") ruleKey = "命身同宮";
    else if (baseName === "福德") ruleKey = "身在福德";
    else if (baseName === "官祿") ruleKey = "身在官祿";
    else if (baseName === "遷移") ruleKey = "身在遷移";
    else if (baseName === "財帛") ruleKey = "身在財帛";
    else if (baseName === "夫妻") ruleKey = "身在夫妻";

    const rule = rules[ruleKey];
    return {
      location: baseName,
      title: rule ? rule.title : `身居${baseName}`,
      desc: rule ? rule.desc : "",
      keyword: rule ? rule.keyword : ""
    };
  },

  _generateSummary: function(patterns, scores, elemental, body) {
    const avg = scores.reduce((a, b) => a + b.score, 0) / 12;
    const strong = patterns.some(p => !p.isBroken);
    
    let summary = `命盤能量均分 ${avg.toFixed(1)}。`;
    if (patterns.length > 0) {
        summary += ` 成格為【${patterns.map(p => p.name).join("、")}】。`;
    } else {
        summary += ` 格局較為隱晦，需後天開展。`;
    }
    
    if (body) {
      summary += ` 中年後性格重心修正為「${body.keyword}」。`;
    }

    return summary;
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

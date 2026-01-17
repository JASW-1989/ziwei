/**
 * NatalAnalyzer - 本命格局分析器 (Natal Essence v2.0 - Config Driven)
 * 修正：
 * 1. 移除 ANALYSIS_CONFIG 硬編碼。
 * 2. _calculateBaseScore 改讀取 dict.scoring_config。
 */

const NatalAnalyzer = {
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

    // 3. 提取性格關鍵字
    const traits = this._extractTraits(lifePalaceIdx, staticChart, dict);

    return {
      type: "Natal",
      scores: palaceScores,
      lifeScore: palaceScores.find(p => p.index === lifePalaceIdx).score,
      patterns: patterns,
      traits: traits,
      summary: this._generateSummary(patterns, palaceScores)
    };
  },

  _calculateBaseScore: function(palaceIdx, staticChart, dict) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    
    // 讀取配置
    const config = dict.scoring_config || {
        base_score: 60,
        brightness_modifiers: { "廟": 15, "旺": 10, "得": 5, "利": 2, "平": 0, "陷": -15 },
        sihua_modifiers: { "祿": 10, "權": 8, "科": 5, "忌": -12 },
        malefic_penalty: -5,
        borrowed_star_rate: 0.7
    };

    let score = config.base_score; 

    relData.forEach((p, rIdx) => {
      // 權重：本宮(1.0), 對宮(0.8), 三方(0.4)
      let multiplier = rIdx === 0 ? 1.0 : (rIdx === 1 ? 0.8 : 0.4);
      
      p.stars.forEach(s => {
        const cleanName = s.name.split('(')[0]; // 暫時保留兼容
        
        // 1. 亮度加分
        let val = config.brightness_modifiers[s.brightness] || 0;
        
        // 2. 生年四化加分 (優先使用 transformation 屬性，兼容舊版後綴)
        const trans = s.transformation || 
                      (s.name.includes("(祿)") ? "祿" : 
                       s.name.includes("(權)") ? "權" :
                       s.name.includes("(科)") ? "科" :
                       s.name.includes("(忌)") ? "忌" : null);

        if (trans && config.sihua_modifiers[trans]) {
            val += config.sihua_modifiers[trans];
        }

        // 3. 煞星扣分 (使用字典 malefic_interactions 的 key 來判斷)
        if (dict.malefic_interactions && dict.malefic_interactions[cleanName]) {
           val += config.malefic_penalty; 
        } else if (["火星", "鈴星", "擎羊", "陀羅", "地空", "地劫"].includes(cleanName)) {
           // Fallback
           val += config.malefic_penalty;
        }

        if (s.isBorrowed) val *= config.borrowed_star_rate;
        score += val * multiplier;
      });
    });

    // 格局修正
    const patterns = this._checkPatternStability(palaceIdx, dict, staticChart);
    patterns.forEach(p => {
      if (p.specialNote) score += p.bonus || 15;
      else score += p.isBroken ? -10 : 15;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  _checkPatternStability: function(palaceIdx, dict, staticChart) {
    const relData = this._getRelationalData(palaceIdx, staticChart);
    const allStars = relData.flatMap(p => p.stars.map(s => s.name.split('(')[0])); 
    const mainBranch = relData[0].branch;
    
    // 煞星清單：優先從字典獲取
    const maleficList = dict.malefic_interactions ? Object.keys(dict.malefic_interactions) : ["火星", "鈴星", "擎羊", "陀羅", "地空", "地劫"];
    const maleficNames = relData.flatMap(p => p.stars.filter(s => maleficList.includes(s.name.split('(')[0])).map(s => s.name.split('(')[0]));

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

  _extractTraits: function(idx, staticChart, dict) {
    const palace = staticChart.palaces[idx];
    const traits = [];
    const majors = dict.star_traits ? Object.keys(dict.star_traits) : [];
    
    palace.stars.forEach(s => {
        const clean = s.name.split('(')[0];
        if (majors.includes(clean)) {
            traits.push(clean);
        }
    });

    if (traits.length === 0) return ["善變", "適應力強", "易受環境影響"];
    return traits; 
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
      // 借星處理 (簡單判定：若無主星則借對宮)
      // 注意：這裡假設 Engine 的資料結構，若要更嚴謹需判斷 type='major'
      const hasMajor = p.stars.some(s => s.type === 'major');
      
      if (!hasMajor) {
        const opp = staticChart.palaces[(idx + 6) % 12];
        p.stars = opp.stars.map(s => ({ ...s, isBorrowed: true }));
      }
      return p;
    });
  }
};

export default NatalAnalyzer;

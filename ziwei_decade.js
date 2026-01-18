/**
 * ZiweiDecade - 紫微斗數大限推演引擎 (Decade Engine v3.3 - Strict Verified)
 * 驗算結論：
 * 1. [大限起訖]：經 1989 陰男 案例驗算，逆行邏輯正確 (33-42 在丑)。
 * 2. [大限四化]：經 丁丑大限 驗算，丁陰同機巨 邏輯正確。
 * 3. [大限流曜]：僅保留祿存、羊陀、魁鉞，移除不應飛動的昌曲。
 */

const ZiweiDecade = {
  // 大限流曜規則 (僅祿羊陀魁鉞)
  DECADE_STAR_RULES: {
    luCun: { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 },
    kui: { "甲": 1, "乙": 0, "丙": 11, "丁": 11, "戊": 1, "己": 0, "庚": 1, "辛": 6, "壬": 3, "癸": 3 },
    yue: { "甲": 7, "乙": 8, "丙": 9, "丁": 9, "戊": 7, "己": 8, "庚": 7, "辛": 2, "壬": 5, "癸": 5 }
  },

  getDecadeInfo: function(targetAge, staticChart, dict) {
    // 1. 找出對應年齡的大限命宮
    const decadeLifePalace = staticChart.palaces.find(p => 
      targetAge >= p.ageStart && targetAge <= (p.ageStart + 9)
    );

    if (!decadeLifePalace) return null;

    const dStem = decadeLifePalace.stem;
    const dLifeIdx = decadeLifePalace.index;
    const dSiHuaRules = this.getSiHuaRules(dStem);
    const dPalaceNames = ["大限命", "大限兄", "大限夫", "大限子", "大限財", "大限疾", "大限遷", "大限友", "大限官", "大限田", "大限福", "大限父"];
    
    // 2. 計算大限流曜位置
    const starsLoc = this._calculateDecadeStars(dStem);

    // 3. 建立大限十二宮
    const palaces = staticChart.palaces.map((p, idx) => {
      const nameIdx = (dLifeIdx - idx + 12) % 12;
      const decadeName = dPalaceNames[nameIdx];
      
      const dStars = [];
      if (idx === starsLoc.lu) dStars.push({ name: "大限祿存", type: "decade_lu" });
      if (idx === starsLoc.yang) dStars.push({ name: "大限擎羊", type: "decade_malefic" });
      if (idx === starsLoc.tuo) dStars.push({ name: "大限陀羅", type: "decade_malefic" });
      if (idx === starsLoc.kui) dStars.push({ name: "大限天魁", type: "decade_lucky" });
      if (idx === starsLoc.yue) dStars.push({ name: "大限天鉞", type: "decade_lucky" });

      return {
        index: idx,
        decadeName: decadeName,
        overlayOnRoot: p.name,
        rootStars: p.stars,
        decadeStars: dStars,
        palaceStem: p.stem,
        palaceBranch: p.branch
      };
    });

    // 4. 分析四化互動 (Interactions)
    const { siHuaPath, interactions } = this._analyzeSiHuaInteractions(dSiHuaRules, palaces, dict);
    
    // 5. 取得三方四正
    const sfIdx = this._getSanFangSiZhengIndices(dLifeIdx);
    const sanFangSiZheng = sfIdx.map(idx => palaces[idx]);

    return {
      type: "Decade",
      targetAge: targetAge,
      decadeStem: dStem,
      decadeRange: decadeLifePalace.ageStart + "-" + (decadeLifePalace.ageStart + 9),
      decadeLifeIdx: dLifeIdx,
      palaceAttribute: this._getPalaceAttribute(decadeLifePalace.stars),
      palaces: palaces,
      sanFangSiZheng: sanFangSiZheng,
      siHua: dSiHuaRules,
      siHuaPath: siHuaPath,
      interactions: interactions
    };
  },

  _calculateDecadeStars: function(stem) {
    const rules = this.DECADE_STAR_RULES;
    const lu = rules.luCun[stem];
    return {
      lu: lu,
      yang: (lu + 1) % 12,
      tuo: (lu - 1 + 12) % 12,
      kui: rules.kui[stem],
      yue: rules.yue[stem]
    };
  },

  _analyzeSiHuaInteractions: function(dRules, palaces, dict) {
    const siHuaPath = {};
    const interactions = [];

    for (let type in dRules) {
      const starName = dRules[type];
      const targetPalace = palaces.find(p => 
        p.rootStars.some(s => s.name.startsWith(starName))
      );

      if (targetPalace) {
        siHuaPath[type] = {
          star: starName,
          targetPalaceName: targetPalace.overlayOnRoot,
          targetDecadeName: targetPalace.decadeName
        };

        const rootStar = targetPalace.rootStars.find(s => s.name.startsWith(starName));
        if (rootStar) {
          let rType = rootStar.transformation;
          if (!rType && rootStar.name.includes("(祿)")) rType = "祿";
          if (!rType && rootStar.name.includes("(權)")) rType = "權";
          if (!rType && rootStar.name.includes("(科)")) rType = "科";
          if (!rType && rootStar.name.includes("(忌)")) rType = "忌";

          if (rType) {
             this._recordInteraction(interactions, type, rType, starName, targetPalace, dict);
          }
        }
      } else {
        siHuaPath[type] = { star: starName, targetPalaceName: "借星或未知", targetDecadeName: "未知" };
      }
    }
    return { siHuaPath, interactions };
  },

  _recordInteraction: function(list, dType, rType, star, palace, dict) {
    let desc = "";
    let score = 0;
    
    const scores = dict?.scoring_config?.resonance_scores || {
       "double_lu": 20, "triple_lu": 35, "double_ji": -30, "triple_ji": -50, "lu_ji_clash": -15
    };

    if (dType === "祿" && rType === "祿") { desc = "雙祿交流"; score = scores.double_lu; }
    else if (dType === "祿" && rType === "忌") { desc = "祿逢沖破"; score = scores.lu_ji_clash; }
    else if (dType === "忌" && rType === "祿") { desc = "雙忌沖祿"; score = scores.lu_ji_clash; }
    else if (dType === "忌" && rType === "忌") { desc = "雙忌交加"; score = scores.double_ji; }
    else if (dType === "權" && rType === "權") { desc = "權力加倍"; score = 15; }
    else if (dType === "科" && rType === "科") { desc = "名聲顯赫"; score = 10; }
    else { desc = `大限${dType}疊本命${rType}`; score = 0; }

    list.push({
      star: star,
      palace: palace.decadeName,
      rootPalace: palace.overlayOnRoot,
      desc: desc,
      score: score,
      dType, rType
    });
  },

  getSiHuaRules: function(stem) {
    const rules = {
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
    return rules[stem];
  },

  _getSanFangSiZhengIndices: function(idx) {
    return [idx, (idx + 4) % 12, (idx + 6) % 12, (idx + 8) % 12];
  },

  _getPalaceAttribute: function(stars) {
    const starNames = stars.map(s => s.name);
    if (starNames.some(s => s.includes("七殺") || s.includes("破軍") || s.includes("貪狼"))) {
      return "變動開創型 (波動大，適合積極進取)";
    }
    if (starNames.some(s => s.includes("天府") || s.includes("天相") || s.includes("太陰") || s.includes("天梁"))) {
      return "穩健守成型 (環境安定，宜積累資源)";
    }
    if (starNames.some(s => s.includes("紫微") || s.includes("太陽") || s.includes("武曲"))) {
      return "權威主導型 (具備掌控力，適合建立體制)";
    }
    return "平穩型 (重心在於協調與適應)";
  }
};

export default ZiweiDecade;

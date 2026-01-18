/**
 * ZiweiLuck - 紫微斗數動態推演引擎 (Yearly/Monthly Engine v5.1 - Verified)
 * 驗算結論：
 * 1. [流年命宮]：2026(午)年 命宮在午，邏輯正確。
 * 2. [流年四化]：2026(丙)年 同機昌廉，邏輯正確。
 * 3. [流年桃花]：午年 紅鸞在酉，邏輯正確。
 */

import ZiweiEngine from './ziwei_engine.js';

const YEARLY_STAR_RULES = {
  luCun: { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 },
  kui: { "甲": 1, "乙": 0, "丙": 11, "丁": 11, "戊": 1, "己": 0, "庚": 1, "辛": 6, "壬": 3, "癸": 3 },
  yue: { "甲": 7, "乙": 8, "丙": 9, "丁": 9, "戊": 7, "己": 8, "庚": 7, "辛": 2, "壬": 5, "癸": 5 },
  wenChang: { "甲": 5, "乙": 6, "丙": 8, "丁": 9, "戊": 11, "己": 0, "庚": 2, "辛": 5, "壬": 6, "癸": 8 },
  wenQu: { "甲": 9, "乙": 8, "丙": 6, "丁": 5, "戊": 3, "己": 2, "庚": 0, "辛": 9, "壬": 8, "癸": 6 },
  ma: { "寅": 8, "午": 8, "戌": 8, "申": 2, "子": 2, "辰": 2, "巳": 11, "酉": 11, "丑": 11, "亥": 5, "卯": 5, "未": 5 }
};

const ZiweiLuck = {
  getYearlyLuck: function(targetYear, staticChart, decadeInfo, dict) {
    const { stem, branch, branchIdx } = this.getYearToStemBranch(targetYear);
    // 流年命宮永遠在太歲位 (地支)
    const yLifeIdx = branchIdx; 
    const ySiHuaRules = this._getSiHuaMap(stem);
    
    const yNames = ["流命", "流兄", "流夫", "流子", "流財", "流疾", "流遷", "流友", "流官", "流田", "流福", "流父"];
    const suiQianNames = ["歲建", "晦氣", "喪門", "貫索", "官符", "小耗", "大耗", "龍德", "白虎", "天德", "弔客", "病符"];

    const starsLoc = this._calculateYearlyStars(stem, branch);

    const luckPalaces = staticChart.palaces.map((p, idx) => {
      const nameIdx = (yLifeIdx - idx + 12) % 12;
      
      const yStars = [];
      if (idx === starsLoc.lu) yStars.push({ name: "流年祿存", type: "yearly_lu" });
      if (idx === starsLoc.yang) yStars.push({ name: "流年擎羊", type: "yearly_malefic" });
      if (idx === starsLoc.tuo) yStars.push({ name: "流年陀羅", type: "yearly_malefic" });
      if (idx === starsLoc.kui) yStars.push({ name: "流年天魁", type: "yearly_lucky" });
      if (idx === starsLoc.yue) yStars.push({ name: "流年天鉞", type: "yearly_lucky" });
      if (idx === starsLoc.chang) yStars.push({ name: "流年文昌", type: "yearly_lucky" });
      if (idx === starsLoc.qu) yStars.push({ name: "流年文曲", type: "yearly_lucky" });
      if (idx === starsLoc.ma) yStars.push({ name: "流年天馬", type: "yearly_lucky" });
      
      // 流年紅鸞 (卯宮起子逆行)
      const luanIdx = (3 - branchIdx + 12) % 12; 
      if (idx === luanIdx) yStars.push({ name: "流年紅鸞", type: "yearly_romance" });
      if (idx === (luanIdx + 6) % 12) yStars.push({ name: "流年天喜", type: "yearly_romance" });

      const dPalace = decadeInfo ? decadeInfo.palaces[idx] : null;
      // 歲建星順行 (歲建在流年支)
      const suiQianIdx = (idx - branchIdx + 12) % 12;

      return {
        index: idx,
        yearlyName: yNames[nameIdx],
        overlayOnRoot: p.name,
        overlayOnDecade: dPalace ? dPalace.decadeName : "未知",
        yearlyStars: yStars,
        suiQianStar: suiQianNames[suiQianIdx],
        rootStars: p.stars,
        decadeStars: dPalace ? dPalace.decadeStars : []
      };
    });

    const sfIdx = this._getSanFangSiZhengIndices(yLifeIdx);
    const sanFangSiZheng = sfIdx.map(idx => luckPalaces[idx]);
    
    const { siHuaPath, interactions } = this._analyzeTripleLayerInteractions(ySiHuaRules, luckPalaces, decadeInfo, dict);

    return {
      type: "Yearly",
      year: targetYear,
      stem: stem,
      branch: branch,
      stemBranch: `${stem}${branch}`,
      yearLifeIdx: yLifeIdx,
      palaces: luckPalaces,
      sanFangSiZheng: sanFangSiZheng,
      siHua: ySiHuaRules,
      siHuaPath: siHuaPath,
      interactions: interactions
    };
  },

  getMonthlyLuck: function(lunarMonth, yearlyLuck, birthInfo) {
    if (!yearlyLuck || !birthInfo) return null;

    const yearBranchIdx = ZiweiEngine.BRANCHES.indexOf(yearlyLuck.branch);
    const birthMonth = birthInfo.month;
    const birthHourIdx = birthInfo.hourIdx;
    
    // 斗君計算：流年支 - 生月 + 生時 + 1 (寅宮起)
    // 修正公式：(yearBranchIdx - (birthMonth - 1) + birthHourIdx + 12) % 12
    const douJunIdx = (yearBranchIdx - (birthMonth - 1) + birthHourIdx + 12) % 12;
    const mLifeIdx = (douJunIdx + (lunarMonth - 1)) % 12;

    const yearStem = yearlyLuck.stem;
    const mStem = yearlyLuck.palaces[mLifeIdx].rootStars[0]?.stem || ZiweiEngine.getPalaceStems(yearStem)[mLifeIdx];
    
    const mSiHuaRules = this._getSiHuaMap(mStem);
    const mNames = ["流月命", "流月兄", "流月夫", "流月子", "流月財", "流月疾", "流月遷", "流月友", "流月官", "流月田", "流月福", "流月父"];

    const monthlyPalaces = yearlyLuck.palaces.map((p, idx) => {
      const nameIdx = (mLifeIdx - idx + 12) % 12;
      return {
        index: idx,
        monthlyName: mNames[nameIdx],
        overlayOnYear: p.yearlyName,
        overlayOnRoot: p.overlayOnRoot,
        rootStars: p.rootStars,
        yearlyStars: p.yearlyStars
      };
    });

    const siHuaPath = {};
    for (let type in mSiHuaRules) {
      const star = mSiHuaRules[type];
      const target = monthlyPalaces.find(p => p.rootStars.some(s => s.name.startsWith(star)));
      siHuaPath[type] = {
        star: star,
        palace: target ? target.monthlyName : "未知",
        overlayYear: target ? target.overlayOnYear : "未知"
      };
    }

    return {
      type: "Monthly",
      lunarMonth: lunarMonth,
      monthStem: mStem,
      monthLifeIdx: mLifeIdx,
      siHua: mSiHuaRules,
      siHuaPath: siHuaPath,
      palaces: monthlyPalaces
    };
  },

  _calculateYearlyStars: function(stem, branch) {
    const rules = YEARLY_STAR_RULES;
    const lu = rules.luCun[stem];
    return {
      lu: lu,
      yang: (lu + 1) % 12,
      tuo: (lu - 1 + 12) % 12,
      kui: rules.kui[stem],
      yue: rules.yue[stem],
      chang: rules.wenChang[stem],
      qu: rules.wenQu[stem],
      ma: rules.ma[branch]
    };
  },

  _analyzeTripleLayerInteractions: function(yRules, luckPalaces, decadeInfo, dict) {
    const siHuaPath = {};
    const interactions = [];

    for (let type in yRules) {
      const starName = yRules[type];
      const targetPalace = luckPalaces.find(p => 
        p.rootStars.some(s => s.name.startsWith(starName))
      );

      if (targetPalace) {
        siHuaPath[type] = {
          star: starName,
          impactRoot: targetPalace.overlayOnRoot,
          impactDecade: targetPalace.overlayOnDecade,
          impactYearly: targetPalace.yearlyName
        };

        const rootStar = targetPalace.rootStars.find(s => s.name.startsWith(starName));
        if (rootStar) {
          let rType = rootStar.transformation; 
          if (!rType && rootStar.name.includes("(祿)")) rType = "祿";
          if (!rType && rootStar.name.includes("(權)")) rType = "權";
          if (!rType && rootStar.name.includes("(科)")) rType = "科";
          if (!rType && rootStar.name.includes("(忌)")) rType = "忌";

          if (rType) {
            this._recordInteraction(interactions, type, `本命${rType}`, rType, starName, targetPalace, dict);
          }
        }

        if (decadeInfo && decadeInfo.siHua) {
          const dRules = decadeInfo.siHua;
          for (let dType in dRules) {
            if (dRules[dType] === starName) {
              this._recordInteraction(interactions, type, `大限${dType}`, dType, starName, targetPalace, dict);
            }
          }
        }
      } else {
        siHuaPath[type] = { star: starName, impactRoot: "未知", impactDecade: "未知", impactYearly: "未知" };
      }
    }
    return { siHuaPath, interactions };
  },

  _recordInteraction: function(list, yType, targetLayerName, targetType, star, palace, dict) {
    let desc = "";
    let score = 0;
    
    const scores = dict?.scoring_config?.resonance_scores || {
       "double_lu": 20, "triple_lu": 35, "double_ji": -30, "triple_ji": -50, "lu_ji_clash": -15
    };

    if (yType === "祿" && targetType === "祿") { 
        desc = "疊祿 (吉利加倍)"; 
        score = scores.double_lu; 
    }
    else if (yType === "祿" && targetType === "忌") { 
        desc = "祿入忌鄉 (吉處藏凶)"; 
        score = scores.lu_ji_clash; 
    }
    else if (yType === "忌" && targetType === "祿") { 
        desc = "忌沖祿 (運勢折損)"; 
        score = scores.lu_ji_clash; 
    }
    else if (yType === "忌" && targetType === "忌") { 
        desc = "雙忌鎖定 (壓力極大)"; 
        score = scores.double_ji; 
    }
    else { 
        desc = `流年${yType} 遇 ${targetLayerName}`; 
        score = 0; 
    }

    list.push({
      star: star,
      palace: palace.yearlyName,
      desc: desc,
      score: score,
      yType, targetType
    });
  },

  getYearToStemBranch: function(year) {
    const stemIdx = (year - 4 + 12000000) % 10;
    const branchIdx = (year - 4 + 12000000) % 12;
    return {
      stem: ZiweiEngine.STEMS[stemIdx],
      branch: ZiweiEngine.BRANCHES[branchIdx],
      stemIdx,
      branchIdx
    };
  },

  _getSanFangSiZhengIndices: function(idx) {
    return [idx, (idx + 4) % 12, (idx + 6) % 12, (idx + 8) % 12];
  },

  _getSiHuaMap: function(stem) {
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
  }
};

export default ZiweiLuck;

/**
 * ZiweiLuck - 紫微斗數動態推演引擎 (Luck Engine v1.5)
 * 負責：流年運算與三疊邏輯。
 * 嚴謹對齊：ZiweiEngine v5.1 & ZiweiDecade v1.1
 */

import ZiweiEngine from './ziwei_engine.js';

const YEARLY_STAR_RULES = {
  luCun: { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 },
  kui: { "甲": 1, "乙": 0, "丙": 11, "丁": 11, "戊": 1, "己": 0, "庚": 1, "辛": 2, "壬": 3, "癸": 3 },
  yue: { "甲": 7, "乙": 8, "丙": 9, "丁": 9, "戊": 7, "己": 8, "庚": 7, "辛": 6, "壬": 5, "癸": 5 },
  ma: { "寅": 8, "午": 8, "戌": 8, "申": 2, "子": 2, "辰": 2, "巳": 11, "酉": 11, "丑": 11, "亥": 5, "卯": 5, "未": 5 },
  wenChang: { "甲": 5, "乙": 6, "丙": 8, "丁": 9, "戊": 11, "己": 0, "庚": 2, "辛": 5, "壬": 6, "癸": 8 },
  wenQu: { "甲": 9, "乙": 8, "丙": 6, "丁": 5, "戊": 3, "己": 2, "庚": 0, "辛": 9, "壬": 8, "癸": 6 }
};

const ZiweiLuck = {
  /**
   * 輔助：西元年轉干支
   */
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

  /**
   * 流年推演核心
   * @param {number} targetYear - 西元年
   * @param {Object} staticChart - 靜態本命盤數據 (ZiweiEngine產出)
   * @param {Object} decadeInfo - 動態大限數據 (ZiweiDecade產出)
   */
  getYearlyLuck: function(targetYear, staticChart, decadeInfo = null) {
    const { stem, branch, branchIdx } = this.getYearToStemBranch(targetYear);
    const yLifeIdx = branchIdx;
    const ySiHua = this._getSiHuaMap(stem);
    const yNames = ["流命", "流兄", "流夫", "流子", "流財", "流疾", "流遷", "流友", "流官", "流田", "流福", "流父"];
    const suiQianNames = ["歲建", "晦氣", "喪門", "貫索", "官符", "小耗", "大耗", "龍德", "白虎", "天德", "弔客", "病符"];

    const luckPalaces = staticChart.palaces.map((p, idx) => {
      const nameIdx = (yLifeIdx - idx + 12) % 12;
      const yStars = [];
      
      // 1. 流年星曜計算
      const lIdx = YEARLY_STAR_RULES.luCun[stem];
      if (idx === lIdx) yStars.push({ name: "流年祿存", type: "yearly" });
      if (idx === (lIdx + 1) % 12) yStars.push({ name: "流年擎羊", type: "yearly" });
      if (idx === (lIdx - 1 + 12) % 12) yStars.push({ name: "流年陀羅", type: "yearly" });
      if (idx === YEARLY_STAR_RULES.kui[stem]) yStars.push({ name: "流年天魁", type: "yearly" });
      if (idx === YEARLY_STAR_RULES.yue[stem]) yStars.push({ name: "流年天鉞", type: "yearly" });
      if (idx === YEARLY_STAR_RULES.ma[branch]) yStars.push({ name: "流年天馬", type: "yearly" });
      if (idx === YEARLY_STAR_RULES.wenChang[stem]) yStars.push({ name: "流年文昌", type: "yearly" });
      if (idx === YEARLY_STAR_RULES.wenQu[stem]) yStars.push({ name: "流年文曲", type: "yearly" });
      
      const yLuanIdx = (3 - branchIdx + 12) % 12;
      if (idx === yLuanIdx) yStars.push({ name: "流年紅鸞", type: "yearly" });
      if (idx === (yLuanIdx + 6) % 12) yStars.push({ name: "流年天喜", type: "yearly" });

      // 2. 疊宮對接 (核心：與 ZiweiDecade 的 decadeName 對接)
      let overlayOnDecade = "";
      if (decadeInfo && decadeInfo.palaces) {
        overlayOnDecade = decadeInfo.palaces[idx].decadeName;
      }

      return {
        index: idx,
        yearlyName: yNames[nameIdx],
        overlayOnRoot: p.name,
        overlayOnDecade: overlayOnDecade,
        yearlyStars: yStars,
        yearlySiHua: ySiHua,
        suiQianStar: suiQianNames[(idx - branchIdx + 12) % 12]
      };
    });

    return {
      type: "Yearly",
      year: targetYear,
      stemBranch: `${stem}${branch}`,
      palaces: luckPalaces,
      siHua: ySiHua
    };
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

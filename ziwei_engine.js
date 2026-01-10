/**
 * ZiweiEngine - 紫微斗數靜態核心引擎 (Standard Core v5.1)
 * 負責：曆法修正、命身宮、五虎遁、五行局、起紫微星、安十四主星、安輔煞小星、生年四化、命身主、大限起點。
 * 此檔案為「常數」邏輯，確保靜態底盤之 100% 正確性。
 */

const ZiweiEngine = {
  BRANCHES: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
  STEMS: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],

  // 1. 時間修正 (含均時差)
  fixSolarTime: function(dateStr, timeStr, lng) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const lonOffset = (lng - 120.0) * 4;
    const d = Math.floor((new Date(year, month - 1, day) - new Date(year, 0, 0)) / 86400000);
    const b = (2 * Math.PI * (d - 81)) / 365;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    const totalCorrection = lonOffset + eot;
    let date = new Date(year, month - 1, day, hours, minutes);
    date.setSeconds(date.getSeconds() + Math.round(totalCorrection * 60));
    return {
      correctedDate: date.toISOString().split('T')[0],
      correctedTime: date.toTimeString().split(' ')[0].substring(0, 5),
      hourIndex: this.getHourIndex(date.getHours(), date.getMinutes())
    };
  },

  getHourIndex: function(h, m) {
    if (h >= 23 || h < 1) return 0;
    return Math.floor((h + 1) / 2);
  },

  // 2. 定命身宮
  locateLifeBody: function(lunarMonth, hourIdx) {
    const yinIdx = 2;
    let lifeIdx = (yinIdx + (lunarMonth - 1) - hourIdx + 12) % 12;
    let bodyIdx = (yinIdx + (lunarMonth - 1) + hourIdx) % 12;
    return { lifeIdx, bodyIdx };
  },

  // 3. 五虎遁 (起宮干)
  getPalaceStems: function(yearStem) {
    const startMap = { "甲": 2, "己": 2, "乙": 4, "庚": 4, "丙": 6, "辛": 6, "丁": 8, "壬": 8, "戊": 0, "癸": 0 };
    let startStemIdx = startMap[yearStem];
    let ziStemIdx = (startStemIdx - 2 + 10) % 10;
    let palaceStems = [];
    for (let i = 0; i < 12; i++) {
      palaceStems.push(this.STEMS[(ziStemIdx + i) % 10]);
    }
    return palaceStems;
  },

  // 4. 五行局 (納音)
  getFiveElementsBureau: function(stem, branch) {
    const stemValue = { "甲": 1, "乙": 1, "丙": 2, "丁": 2, "戊": 3, "己": 3, "庚": 4, "辛": 4, "壬": 5, "癸": 5 };
    const branchValue = { "子": 1, "丑": 1, "午": 1, "未": 1, "寅": 2, "卯": 2, "申": 2, "酉": 2, "辰": 3, "巳": 3, "戌": 3, "亥": 3 };
    let sum = stemValue[stem] + branchValue[branch];
    if (sum > 5) sum -= 5;
    const bureauMap = { 1: { name: "金四局", value: 4 }, 2: { name: "水二局", value: 2 }, 3: { name: "火六局", value: 6 }, 4: { name: "土五局", value: 5 }, 5: { name: "木三局", value: 3 } };
    return bureauMap[sum];
  },

  // 5. 起紫微星
  locateZiweiStar: function(bureauValue, lunarDay) {
    let quotient = Math.ceil(lunarDay / bureauValue);
    let remainder = (quotient * bureauValue) - lunarDay;
    let startIdx = 2;
    let finalIdx;
    if (remainder % 2 === 0) {
      finalIdx = (startIdx + (quotient - 1) + remainder) % 12;
    } else {
      finalIdx = (startIdx + (quotient - 1) - remainder + 12) % 12;
    }
    return finalIdx;
  },

  // 6. 安星曜廟旺資料
  STAR_BRIGHTNESS: {
    "紫微": [1, 5, 5, 4, 3, 4, 5, 5, 3, 4, 3, 5], "天機": [5, 0, 3, 4, 2, 1, 5, 0, 3, 4, 2, 1],
    "太陽": [0, 0, 4, 5, 5, 5, 5, 3, 2, 1, 0, 0], "武曲": [4, 5, 3, 1, 5, 1, 4, 5, 3, 1, 5, 1],
    "天同": [4, 0, 2, 5, 1, 0, 1, 0, 4, 0, 2, 5], "廉貞": [2, 2, 5, 1, 5, 0, 2, 2, 5, 1, 5, 0],
    "天府": [5, 5, 5, 3, 5, 3, 4, 5, 3, 4, 5, 4], "太陰": [5, 5, 2, 1, 0, 0, 0, 0, 1, 2, 4, 5],
    "貪狼": [4, 5, 1, 2, 5, 0, 4, 5, 1, 2, 5, 0], "巨門": [4, 4, 5, 5, 0, 0, 1, 1, 5, 5, 0, 0],
    "天相": [5, 5, 5, 0, 5, 3, 0, 0, 5, 0, 5, 0], "天梁": [5, 5, 5, 5, 5, 0, 5, 4, 0, 0, 5, 0],
    "七殺": [4, 5, 5, 1, 5, 0, 4, 5, 5, 1, 5, 0], "破軍": [5, 4, 0, 0, 5, 0, 5, 4, 0, 0, 5, 0],
    "文昌": [5, 1, 5, 3, 2, 5, 0, 4, 5, 5, 0, 2], "文曲": [5, 4, 5, 1, 5, 3, 0, 4, 5, 0, 1, 5],
    "火星": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], "鈴星": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    "擎羊": [0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5], "陀羅": [0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5]
  },

  getBrightnessText: function(star, branchIdx) {
    const baseStar = star.split('(')[0];
    const score = this.STAR_BRIGHTNESS[baseStar]?.[branchIdx];
    return score !== undefined ? ["陷", "平", "利", "得", "旺", "廟"][score] : "";
  },

  // 7. 內部輔助：安星曜 (完整星曜映射)
  _getStarMapping: function(ziweiIdx, input) {
    const starPalaces = Array(12).fill(null).map(() => []);
    const { yearStem, yearBranch, month, hourIdx } = input;
    ["紫微", "天機", null, "太陽", "武曲", "天同", null, null, "廉貞"].forEach((s, i) => {
      if (s) starPalaces[(ziweiIdx - i + 12) % 12].push(s);
    });
    const tfIdx = (4 - ziweiIdx + 12) % 12;
    ["天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", null, null, null, "破軍"].forEach((s, i) => {
      if (s) starPalaces[(tfIdx + i) % 12].push(s);
    });
    const luMap = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 };
    const lIdx = luMap[yearStem];
    starPalaces[lIdx].push("祿存");
    starPalaces[(lIdx + 1) % 12].push("擎羊");
    starPalaces[(lIdx - 1 + 12) % 12].push("陀羅");
    starPalaces[(10 - hourIdx + 12) % 12].push("文昌");
    starPalaces[(4 + hourIdx) % 12].push("文曲");
    starPalaces[(4 + (month - 1)) % 12].push("左輔");
    starPalaces[(10 - (month - 1) + 12) % 12].push("右弼");
    const kyMap = { "甲": [1, 7], "乙": [0, 8], "丙": [11, 9], "丁": [11, 9], "戊": [1, 7], "己": [0, 8], "庚": [1, 7], "辛": [2, 6], "壬": [3, 5], "癸": [3, 5] };
    const [k, y] = kyMap[yearStem];
    starPalaces[k].push("天魁");
    starPalaces[y].push("天鉞");
    starPalaces[(11 - hourIdx + 12) % 12].push("地空");
    starPalaces[(11 + hourIdx) % 12].push("地劫");
    const hlBase = { "寅": [1, 3], "午": [1, 3], "戌": [1, 3], "申": [2, 10], "子": [2, 10], "辰": [2, 10], "巳": [3, 10], "酉": [3, 10], "丑": [3, 10], "亥": [9, 10], "卯": [9, 10], "未": [9, 10] };
    const [hB, lB] = hlBase[yearBranch];
    starPalaces[(hB + hourIdx) % 12].push("火星");
    starPalaces[(lB + hourIdx) % 12].push("鈴星");
    const tmMap = { "寅": 8, "午": 8, "戌": 8, "申": 2, "子": 2, "辰": 2, "巳": 11, "酉": 11, "丑": 11, "亥": 5, "卯": 5, "未": 5 };
    starPalaces[tmMap[yearBranch]].push("天馬");
    return starPalaces;
  },

  // 8. 命主、身主計算
  getMasters: function(lifeBranch, yearBranch) {
    const lifeMasterMap = { "子": "貪狼", "丑": "巨門", "寅": "祿存", "卯": "文曲", "辰": "廉貞", "巳": "武曲", "午": "破軍", "未": "武曲", "申": "廉貞", "酉": "文曲", "戌": "祿存", "亥": "巨門" };
    const bodyMasterMap = { "子": "鈴星", "午": "鈴星", "丑": "天相", "未": "天相", "寅": "天梁", "申": "天梁", "卯": "天同", "酉": "天同", "辰": "文昌", "戌": "文昌", "巳": "天機", "亥": "天機" };
    return { lifeMaster: lifeMasterMap[lifeBranch], bodyMaster: bodyMasterMap[yearBranch] };
  },

  // 9. 生成本命完整 JSON 命盤
  getFullChart: function(input) {
    const { yearStem, yearBranch, month, day, hourIdx, gender } = input;
    const { lifeIdx, bodyIdx } = this.locateLifeBody(month, hourIdx);
    const palaceStems = this.getPalaceStems(yearStem);
    const bureau = this.getFiveElementsBureau(palaceStems[lifeIdx], this.BRANCHES[lifeIdx]);
    const ziweiIdx = this.locateZiweiStar(bureau.value, day);
    const starMap = this._getStarMapping(ziweiIdx, input);
    
    const siHuaMap = {
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
    }[yearStem];

    const { lifeMaster, bodyMaster } = this.getMasters(this.BRANCHES[lifeIdx], yearBranch);

    const palaces = this.BRANCHES.map((branch, idx) => {
      const nameIdx = (lifeIdx - idx + 12) % 12;
      const names = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"];
      const stars = starMap[idx].map(s => {
        let t = "";
        for (let k in siHuaMap) { if (siHuaMap[k] === s) t = k; }
        const name = t ? `${s}(${t})` : s;
        return { name, brightness: this.getBrightnessText(name, idx) };
      });

      const isYang = ["甲", "丙", "戊", "庚", "壬"].includes(yearStem);
      const isForward = (gender === "男" && isYang) || (gender === "女" && !isYang);
      const decadeIndex = isForward ? (idx - lifeIdx + 12) % 12 : (lifeIdx - idx + 12) % 12;
      const ageStart = bureau.value + (decadeIndex * 10);

      return {
        index: idx,
        branch: branch,
        stem: palaceStems[idx],
        name: names[nameIdx],
        stars: stars,
        isBodyPalace: idx === bodyIdx,
        ageStart: ageStart, // 新增：數值格式便於運算
        ageRange: `${ageStart} - ${ageStart + 9}`
      };
    });

    return {
      info: { ...input, bureau: bureau.name, lifeMaster, bodyMaster },
      palaces: palaces
    };
  }
};

export default ZiweiEngine;

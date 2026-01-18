/**
 * ZiweiEngine - 紫微斗數靜態核心引擎 (v8.3 - Critical Fix)
 * 修正記錄：
 * 1. [嚴重修正] 廢除不可靠的五行局速算公式，改用完整的「六十甲子納音」查表法，確保「戊辰」必為「木三局」。
 * 2. [校準] 修正紫微星起星公式，確保針對「餘數」的處理符合正統安星法。
 */

const ZiweiEngine = {
  BRANCHES: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
  STEMS: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  
  // 宮位地支五行屬性
  PALACE_METADATA: {
    "子": { element: "水", type: "陰" }, "丑": { element: "土", type: "陰" },
    "寅": { element: "木", type: "陽" }, "卯": { element: "木", type: "陰" },
    "辰": { element: "土", type: "陽" }, "巳": { element: "火", type: "陽" },
    "午": { element: "火", type: "陰" }, "未": { element: "土", type: "陰" },
    "申": { element: "金", type: "陽" }, "酉": { element: "金", type: "陰" },
    "戌": { element: "土", type: "陽" }, "亥": { element: "水", type: "陽" }
  },

  // 星曜基本屬性定義
  STAR_DEFINITIONS: {
    "紫微": { element: "土", type: "major" }, "天機": { element: "木", type: "major" },
    "太陽": { element: "火", type: "major" }, "武曲": { element: "金", type: "major" },
    "天同": { element: "水", type: "major" }, "廉貞": { element: "火", type: "major" },
    "天府": { element: "土", type: "major" }, "太陰": { element: "水", type: "major" },
    "貪狼": { element: "木", type: "major" }, "巨門": { element: "水", type: "major" },
    "天相": { element: "水", type: "major" }, "天梁": { element: "土", type: "major" },
    "七殺": { element: "金", type: "major" }, "破軍": { element: "水", type: "major" },
    "文昌": { element: "金", type: "lucky" }, "文曲": { element: "水", type: "lucky" },
    "左輔": { element: "土", type: "lucky" }, "右弼": { element: "水", type: "lucky" },
    "天魁": { element: "火", type: "lucky" }, "天鉞": { element: "火", type: "lucky" },
    "祿存": { element: "土", type: "lucky" }, "天馬": { element: "火", type: "lucky" },
    "擎羊": { element: "金", type: "malefic" }, "陀羅": { element: "金", type: "malefic" },
    "火星": { element: "火", type: "malefic" }, "鈴星": { element: "火", type: "malefic" },
    "地空": { element: "火", type: "malefic" }, "地劫": { element: "火", type: "malefic" },
    "紅鸞": { element: "水", type: "romance" }, "天喜": { element: "水", type: "romance" },
    "天姚": { element: "水", type: "minor_malefic" }, "天刑": { element: "火", type: "minor_malefic" },
    "孤辰": { element: "火", type: "minor_malefic" }, "寡宿": { element: "火", type: "minor_malefic" }
  },

  BRIGHTNESS_DB: {
    "紫微": ["P", "M", "M", "W", "X", "W", "M", "M", "W", "P", "P", "W"],
    "天機": ["M", "X", "W", "W", "L", "P", "M", "X", "W", "W", "L", "P"],
    "太陽": ["X", "X", "W", "M", "W", "W", "M", "D", "D", "P", "X", "X"],
    "武曲": ["W", "M", "D", "X", "M", "P", "W", "M", "D", "X", "M", "P"],
    "天同": ["W", "X", "L", "P", "P", "M", "X", "X", "W", "P", "P", "M"],
    "廉貞": ["L", "L", "M", "P", "L", "X", "L", "L", "M", "P", "L", "X"],
    "天府": ["M", "M", "M", "P", "M", "D", "W", "M", "D", "P", "M", "M"],
    "太陰": ["M", "M", "X", "X", "X", "X", "X", "L", "L", "W", "W", "M"],
    "貪狼": ["W", "M", "P", "P", "M", "X", "W", "M", "P", "P", "M", "X"],
    "巨門": ["W", "W", "M", "M", "X", "P", "W", "X", "M", "M", "W", "W"],
    "天相": ["M", "M", "M", "X", "W", "P", "W", "D", "M", "X", "D", "P"],
    "天梁": ["M", "W", "M", "W", "W", "X", "M", "W", "H", "X", "W", "X"],
    "七殺": ["W", "M", "M", "W", "M", "P", "W", "M", "M", "W", "M", "P"],
    "破軍": ["M", "W", "X", "X", "W", "X", "M", "W", "X", "X", "W", "X"]
  },

  _processCalendar: function(input) {
    let { month: birthMonth, day: birthDay, isLeap, hourIdx } = input;
    let effectiveMonth = birthMonth;
    if (isLeap && birthDay > 15) {
      effectiveMonth = (birthMonth % 12) + 1;
    }
    let effectiveDay = birthDay;
    return { effectiveMonth, effectiveDay, hourIdx };
  },

  locateLifeBody: function(lunarMonth, hourIdx) {
    const yinIdx = 2; 
    return {
      lifeIdx: (yinIdx + (lunarMonth - 1) - hourIdx + 12) % 12,
      bodyIdx: (yinIdx + (lunarMonth - 1) + hourIdx) % 12
    };
  },

  getPalaceStems: function(yearStem) {
    const startMap = { "甲": 2, "己": 2, "乙": 4, "庚": 4, "丙": 6, "辛": 6, "丁": 8, "壬": 8, "戊": 0, "癸": 0 };
    let ziStemIdx = (startMap[yearStem] - 2 + 10) % 10;
    return Array.from({ length: 12 }, (_, i) => this.STEMS[(ziStemIdx + i) % 10]);
  },

  // [修正] 五行局計算：改用納音查表法
  getFiveElementsBureau: function(stem, branch) {
    const naYinMap = {
      "甲子": 4, "乙丑": 4, "丙寅": 3, "丁卯": 3, "戊辰": 3, "己巳": 3, "庚午": 5, "辛未": 5, "壬申": 4, "癸酉": 4, "甲戌": 3, "乙亥": 3,
      "丙子": 2, "丁丑": 2, "戊寅": 5, "己卯": 5, "庚辰": 4, "辛巳": 4, "壬午": 3, "癸未": 3, "甲申": 2, "乙酉": 2, "丙戌": 5, "丁亥": 5,
      "戊子": 3, "己丑": 3, "庚寅": 3, "辛卯": 3, "壬辰": 2, "癸巳": 2, "甲午": 4, "乙未": 4, "丙申": 3, "丁酉": 3, "戊戌": 3, "己亥": 3,
      "庚子": 5, "辛丑": 5, "壬寅": 4, "癸卯": 4, "甲辰": 6, "乙巳": 6, "丙午": 2, "丁未": 2, "戊申": 5, "己酉": 5, "庚戌": 4, "辛亥": 4,
      "壬子": 3, "癸丑": 3, "甲寅": 2, "乙卯": 2, "丙辰": 5, "丁巳": 5, "戊午": 6, "己未": 6, "庚申": 3, "辛酉": 3, "壬戌": 2, "癸亥": 2
    };

    const key = stem + branch;
    const val = naYinMap[key] || 3; // 預設木三局防呆
    
    const bureauMap = { 
      4: { name: "金四局", value: 4 }, 
      2: { name: "水二局", value: 2 }, 
      6: { name: "火六局", value: 6 }, 
      5: { name: "土五局", value: 5 }, 
      3: { name: "木三局", value: 3 } 
    };
    return bureauMap[val];
  },

  // [修正] 紫微星定位公式 (確保處理餘數邏輯正確)
  locateZiweiStar: function(bureauValue, lunarDay) {
    // 算法：生日 / 局數
    // 若整除：商數即為位置
    // 若不整除：需借數 (bureauValue - rem)
    // 借數為奇數：商數+1 的位置逆行 (Borrow)
    // 借數為偶數：商數+1 的位置順行 (Borrow)
    
    let quotient = Math.floor(lunarDay / bureauValue);
    let remainder = lunarDay % bureauValue;
    
    let finalPos; // 相對於寅宮(Index 2)的位移

    if (remainder === 0) {
      // 整除：位置 = 商數 - 1 (因為寅宮是1)
      finalPos = quotient - 1;
    } else {
      // 不整除
      let borrow = bureauValue - remainder;
      let nextQuotient = quotient + 1; // 實際上用的商是下一個倍數
      
      if (borrow % 2 !== 0) {
        // 借數為奇數：逆數
        // 公式：商 - 借
        finalPos = (nextQuotient - borrow) - 1;
      } else {
        // 借數為偶數：順數
        // 公式：商 + 借
        finalPos = (nextQuotient + borrow) - 1;
      }
    }

    // 加上起始點 寅宮(Index 2)
    // 處理負數與超過 11 的情況
    let ziweiIdx = (2 + finalPos) % 12;
    if (ziweiIdx < 0) ziweiIdx += 12;

    return ziweiIdx;
  },

  _getStarMapping: function(ziweiIdx, input, lunarMonth) {
    const starPalaces = Array(12).fill(null).map(() => []);
    const { yearStem, yearBranch, hourIdx } = input;
    const yearBranchIdx = this.BRANCHES.indexOf(yearBranch);

    const addStar = (idx, starName) => {
      const def = this.STAR_DEFINITIONS[starName] || { element: "土", type: "misc" };
      starPalaces[idx % 12].push({
        key: starName,
        name: starName,
        type: def.type,
        element: def.element,
        brightness: this._getBrightness(starName, idx % 12),
        transformation: null
      });
    };

    // A. 紫微星系
    const zwPath = [0, -1, null, -3, -4, -5, null, null, -8];
    ["紫微", "天機", null, "太陽", "武曲", "天同", null, null, "廉貞"].forEach((s, i) => {
      if (s) addStar(ziweiIdx + (zwPath[i] || 0) + 12, s);
    });

    // B. 天府星系
    const tfIdx = (4 - ziweiIdx + 12) % 12;
    ["天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", null, null, null, "破軍"].forEach((s, i) => {
      if (s) addStar(tfIdx + i, s);
    });

    // C. 月系星
    addStar(4 + (lunarMonth - 1), "左輔");
    addStar(10 - (lunarMonth - 1) + 12, "右弼");
    addStar(9 + (lunarMonth - 1), "天刑");
    addStar(1 + (lunarMonth - 1), "天姚");

    // D. 時系星
    addStar(4 + hourIdx, "文曲");
    addStar(10 - hourIdx + 12, "文昌");
    addStar(11 + hourIdx, "地劫");
    addStar(11 - hourIdx + 12, "地空");

    // E. 年干系星
    const luCunMap = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 };
    const luIdx = luCunMap[yearStem];
    addStar(luIdx, "祿存");
    addStar(luIdx + 1, "擎羊");
    addStar(luIdx - 1 + 12, "陀羅");

    const kuiYueMap = { "甲": [1, 7], "乙": [0, 8], "丙": [11, 9], "丁": [11, 9], "戊": [1, 7], "己": [0, 8], "庚": [1, 7], "辛": [6, 2], "壬": [3, 5], "癸": [3, 5] };
    const [kui, yue] = kuiYueMap[yearStem];
    addStar(kui, "天魁");
    addStar(yue, "天鉞");

    // 四化
    const siHuaRules = {
      "甲": { "廉貞": "祿", "破軍": "權", "武曲": "科", "太陽": "忌" },
      "乙": { "天機": "祿", "天梁": "權", "紫微": "科", "太陰": "忌" },
      "丙": { "天同": "祿", "天機": "權", "文昌": "科", "廉貞": "忌" },
      "丁": { "太陰": "祿", "天同": "權", "天機": "科", "巨門": "忌" },
      "戊": { "貪狼": "祿", "太陰": "權", "右弼": "科", "天機": "忌" },
      "己": { "武曲": "祿", "貪狼": "權", "天梁": "科", "文曲": "忌" },
      "庚": { "太陽": "祿", "武曲": "權", "太陰": "科", "天同": "忌" },
      "辛": { "巨門": "祿", "太陽": "權", "文曲": "科", "文昌": "忌" },
      "壬": { "天梁": "祿", "紫微": "權", "左輔": "科", "武曲": "忌" },
      "癸": { "破軍": "祿", "巨門": "權", "太陰": "科", "貪狼": "忌" }
    };
    const currentSiHua = siHuaRules[yearStem];
    
    starPalaces.forEach(palace => {
      palace.forEach(star => {
        if (currentSiHua[star.key]) {
          star.transformation = currentSiHua[star.key];
          star.name = `${star.key}(${star.transformation})`;
        }
      });
    });

    // F. 年支系
    const fireBase = { "寅": 1, "午": 1, "戌": 1, "申": 2, "子": 2, "辰": 2, "巳": 3, "酉": 3, "丑": 3, "亥": 9, "卯": 9, "未": 9 };
    const bellBase = { "寅": 3, "午": 3, "戌": 3, "申": 10, "子": 10, "辰": 10, "巳": 10, "酉": 10, "丑": 10, "亥": 10, "卯": 10, "未": 10 };
    addStar(fireBase[yearBranch] + hourIdx, "火星");
    addStar(bellBase[yearBranch] + hourIdx, "鈴星");

    const maMap = { "寅": 8, "午": 8, "戌": 8, "申": 2, "子": 2, "辰": 2, "巳": 11, "酉": 11, "丑": 11, "亥": 5, "卯": 5, "未": 5 };
    addStar(maMap[yearBranch], "天馬");

    const luanIdx = (3 - yearBranchIdx + 12) % 12;
    addStar(luanIdx, "紅鸞");
    addStar(luanIdx + 6, "天喜");

    let guIdx, guaIdx;
    if (["亥", "子", "丑"].includes(yearBranch)) { guIdx = 2; guaIdx = 10; } 
    else if (["寅", "卯", "辰"].includes(yearBranch)) { guIdx = 5; guaIdx = 1; }
    else if (["巳", "午", "未"].includes(yearBranch)) { guIdx = 8; guaIdx = 4; } 
    else { guIdx = 11; guaIdx = 7; }

    addStar(guIdx, "孤辰");
    addStar(guaIdx, "寡宿");

    return starPalaces;
  },

  _getBrightness: function(starName, branchIdx) {
    if (!this.BRIGHTNESS_DB[starName]) return "平";
    const brightnessMap = { "M": "廟", "W": "旺", "D": "得", "L": "利", "P": "平", "B": "平", "X": "陷", "H": "廟" };
    return brightnessMap[this.BRIGHTNESS_DB[starName][branchIdx]] || "平";
  },

  getFullChart: function(rawInput) {
    const { effectiveMonth, effectiveDay, hourIdx } = this._processCalendar(rawInput);
    const { yearStem, yearBranch, gender } = rawInput;

    const { lifeIdx, bodyIdx } = this.locateLifeBody(effectiveMonth, hourIdx);
    const stems = this.getPalaceStems(yearStem);
    // 使用新的五行局計算
    const bureau = this.getFiveElementsBureau(stems[lifeIdx], this.BRANCHES[lifeIdx]);
    // 使用新的紫微定位
    const ziweiIdx = this.locateZiweiStar(bureau.value, effectiveDay);
    
    const starPalaces = this._getStarMapping(ziweiIdx, rawInput, effectiveMonth);

    const palaces = this.BRANCHES.map((branch, idx) => {
      const nameIdx = (lifeIdx - idx + 12) % 12;
      const palaceNames = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"];
      
      return {
        index: idx,
        branch: branch,
        stem: stems[idx],
        name: palaceNames[nameIdx],
        stars: starPalaces[idx],
        palace_element: this.PALACE_METADATA[branch].element,
        isBodyPalace: idx === bodyIdx,
        ageStart: this._calculateDecadeRange(bureau.value, idx, lifeIdx, yearStem, gender)
      };
    });

    return { 
      info: { ...rawInput, effectiveMonth, effectiveDay }, 
      palaces, 
      bureau 
    };
  },

  _calculateDecadeRange: function(bureauValue, currentIdx, lifeIdx, yearStem, gender) {
    const isYangStem = ["甲", "丙", "戊", "庚", "壬"].includes(yearStem);
    const isMale = gender === "M";
    let isClockwise = (isMale && isYangStem) || (!isMale && !isYangStem);

    let diff = isClockwise ? (currentIdx - lifeIdx + 12) % 12 : (lifeIdx - currentIdx + 12) % 12;
    return bureauValue + (diff * 10);
  }
};

export default ZiweiEngine;

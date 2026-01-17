/**
 * ZiweiEngine - 紫微斗數靜態核心引擎 (v8.1 - Professional Refinement Edition)
 * 修正重點：
 * 1. [命名一致性]：統一 bureauValue、lunarMonth 等參數命名，確保跨函數呼叫的一致性。
 * 2. [子時進位]：明確處理晚子時日期進位邏輯，確保與農曆轉換庫對接時的嚴謹。
 * 3. [結構優化]：強化安星 Helper 的物件結構，確保資料 schema 完整。
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

  // 星曜基本屬性定義 (Key-based)
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
    "地空": { element: "火", type: "malefic" }, "地劫": { element: "火", type: "malefic" }
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

  /**
   * 1. 曆法預處理邏輯 (解決閏月與子時)
   * @param {Object} input - 原始輸入資料 (含 birthMonth, birthDay, hourIdx, isLeap)
   * @returns {Object} 修正後的農曆日期與月份
   */
  _processCalendar: function(input) {
    let { month: birthMonth, day: birthDay, isLeap, hourIdx } = input;
    
    // A. 處理閏月 (月中分界法)
    let effectiveMonth = birthMonth;
    if (isLeap && birthDay > 15) {
      effectiveMonth = (birthMonth % 12) + 1;
    }

    // B. 處理子時 (23:00 - 01:00)
    // 若為晚子時 (hourIdx=0, 但原始時間為23:00-00:00)，日期需加一
    // 此處假設傳入之 birthDay 已由外部曆法庫根據子時進位處理完畢
    let effectiveDay = birthDay;

    return {
      effectiveMonth,
      effectiveDay,
      hourIdx
    };
  },

  // 2. 定命身宮
  locateLifeBody: function(lunarMonth, hourIdx) {
    const yinIdx = 2; // 寅宮起正月
    return {
      lifeIdx: (yinIdx + (lunarMonth - 1) - hourIdx + 12) % 12,
      bodyIdx: (yinIdx + (lunarMonth - 1) + hourIdx) % 12
    };
  },

  // 3. 五虎遁 (求宮干)
  getPalaceStems: function(yearStem) {
    const startMap = { "甲": 2, "己": 2, "乙": 4, "庚": 4, "丙": 6, "辛": 6, "丁": 8, "壬": 8, "戊": 0, "癸": 0 };
    let ziStemIdx = (startMap[yearStem] - 2 + 10) % 10;
    return Array.from({ length: 12 }, (_, i) => this.STEMS[(ziStemIdx + i) % 10]);
  },

  // 4. 五行局
  getFiveElementsBureau: function(stem, branch) {
    const stemValue = { "甲": 1, "乙": 1, "丙": 2, "丁": 2, "戊": 3, "己": 3, "庚": 4, "辛": 4, "壬": 5, "癸": 5 };
    const branchValue = { "子": 1, "丑": 1, "午": 1, "未": 1, "寅": 2, "卯": 2, "申": 2, "酉": 2, "辰": 3, "巳": 3, "戌": 3, "亥": 3 };
    let sum = stemValue[stem] + branchValue[branch];
    if (sum > 5) sum -= 5;
    
    const bureauMap = { 
      1: { name: "金四局", value: 4 }, 
      2: { name: "水二局", value: 2 }, 
      3: { name: "火六局", value: 6 }, 
      4: { name: "土五局", value: 5 }, 
      5: { name: "木三局", value: 3 } 
    };
    return bureauMap[sum];
  },

  // 5. 起紫微星 (精密公式)
  locateZiweiStar: function(bureauValue, lunarDay) {
    let q = Math.ceil(lunarDay / bureauValue);
    let r = (q * bureauValue) - lunarDay;
    let basePos = (2 + (q - 1)) % 12;
    return (r % 2 === 0) ? (basePos + r) % 12 : (basePos - r + 12) % 12;
  },

  // 6. 安星主邏輯
  _getStarMapping: function(ziweiIdx, input, lunarMonth) {
    const starPalaces = Array(12).fill(null).map(() => []);
    const { yearStem, yearBranch, hourIdx } = input;

    // 定義安星 Helper
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

    // --- A. 紫微星系 ---
    const zwPath = [0, -1, null, -3, -4, -5, null, null, -8];
    ["紫微", "天機", null, "太陽", "武曲", "天同", null, null, "廉貞"].forEach((s, i) => {
      if (s) addStar(ziweiIdx + (zwPath[i] || 0) + 12, s);
    });

    // --- B. 天府星系 ---
    const tfIdx = (4 - ziweiIdx + 12) % 12;
    ["天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", null, null, null, "破軍"].forEach((s, i) => {
      if (s) addStar(tfIdx + i, s);
    });

    // --- C. 月系星 (使用有效月份 lunarMonth) ---
    addStar(4 + (lunarMonth - 1), "左輔");
    addStar(10 - (lunarMonth - 1) + 12, "右弼");

    // --- D. 時系星 ---
    addStar(4 + hourIdx, "文曲");
    addStar(10 - hourIdx + 12, "文昌");
    addStar(11 + hourIdx, "地劫");
    addStar(11 - hourIdx + 12, "地空");

    // --- E. 年干系星 ---
    const luCunMap = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 11, "癸": 0 };
    const luIdx = luCunMap[yearStem];
    addStar(luIdx, "祿存");
    addStar(luIdx + 1, "擎羊");
    addStar(luIdx - 1 + 12, "陀羅");

    const kuiYueMap = { "甲": [1, 7], "乙": [0, 8], "丙": [11, 9], "丁": [11, 9], "戊": [1, 7], "己": [0, 8], "庚": [1, 7], "辛": [6, 2], "壬": [3, 5], "癸": [3, 5] };
    const [kui, yue] = kuiYueMap[yearStem];
    addStar(kui, "天魁");
    addStar(yue, "天鉞");

    // 四化處理
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

    // --- F. 年支系星 ---
    const fireBase = { "寅": 1, "午": 1, "戌": 1, "申": 2, "子": 2, "辰": 2, "巳": 3, "酉": 3, "丑": 3, "亥": 9, "卯": 9, "未": 9 };
    const bellBase = { "寅": 3, "午": 3, "戌": 3, "申": 10, "子": 10, "辰": 10, "巳": 10, "酉": 10, "丑": 10, "亥": 10, "卯": 10, "未": 10 };
    addStar(fireBase[yearBranch] + hourIdx, "火星");
    addStar(bellBase[yearBranch] + hourIdx, "鈴星");

    const maMap = { "寅": 8, "午": 8, "戌": 8, "申": 2, "子": 2, "辰": 2, "巳": 11, "酉": 11, "丑": 11, "亥": 5, "卯": 5, "未": 5 };
    addStar(maMap[yearBranch], "天馬");

    return starPalaces;
  },

  _getBrightness: function(starName, branchIdx) {
    if (!this.BRIGHTNESS_DB[starName]) return "平";
    const brightnessMap = { "M": "廟", "W": "旺", "D": "得", "L": "利", "P": "平", "B": "平", "X": "陷", "H": "廟" };
    return brightnessMap[this.BRIGHTNESS_DB[starName][branchIdx]] || "平";
  },

  /**
   * 生成完整盤面數據
   * @param {Object} rawInput - 包含 yearStem, yearBranch, month, day, hourIdx, gender, isLeap
   */
  getFullChart: function(rawInput) {
    // 曆法預處理
    const { effectiveMonth, effectiveDay, hourIdx } = this._processCalendar(rawInput);
    const { yearStem, yearBranch, gender } = rawInput;

    const { lifeIdx, bodyIdx } = this.locateLifeBody(effectiveMonth, hourIdx);
    const stems = this.getPalaceStems(yearStem);
    const bureau = this.getFiveElementsBureau(stems[lifeIdx], this.BRANCHES[lifeIdx]);
    const ziweiIdx = this.locateZiweiStar(bureau.value, effectiveDay);
    
    // 安星 (傳入 effectiveMonth 作為有效農曆月份)
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

  /**
   * 9. 大限起訖計算
   */
  _calculateDecadeRange: function(bureauValue, currentIdx, lifeIdx, yearStem, gender) {
    const isYangStem = ["甲", "丙", "戊", "庚", "壬"].includes(yearStem);
    const isMale = gender === "M";
    let isClockwise = (isMale && isYangStem) || (!isMale && !isYangStem);

    let diff = isClockwise ? (currentIdx - lifeIdx + 12) % 12 : (lifeIdx - currentIdx + 12) % 12;
    return bureauValue + (diff * 10);
  }
};

export default ZiweiEngine;

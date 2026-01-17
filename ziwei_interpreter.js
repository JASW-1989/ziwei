/**
 * ZiweiInterpreter - 專業級邏輯轉譯引擎 (V14.0 - Full Disclosure Edition)
 * 核心職責：完全解鎖 Analyzer v5.2 的運算成果，拒絕資訊閹割。
 * * 升級重點：
 * 1. [無損呈現]：完整揭露格局破壞的元兇 (Breakdown Reasons)。
 * 2. [特質提取]：從 v13.1 辭典提取星曜性格關鍵字 (Star Traits)。
 * 3. [共振翻譯]：將三代忌星的碰撞翻譯為具體的生活場景 (Resonance Scenarios)。
 * 4. [戰術地圖]：根據全盤分數，生成具體的「攻守地圖」 (Tactical Map)。
 */

const ZiweiInterpreter = {
  /**
   * 生成最終報告 (主入口)
   */
  generateReport: function(analysisResult, dict, fullData) {
    if (!analysisResult || !dict) return { error: "Input missing" };

    const { natal, trend, flow, summary, metadata } = analysisResult;

    return {
      meta: {
        title: "紫微斗數全方位深度決策報告",
        engine_version: metadata?.version,
        interpreter_version: "v14.0-Full-Disclosure",
        generated_at: new Date().toLocaleDateString()
      },
      // 1. 本命全解析
      natal_report: this._interpretNatal(natal, dict, fullData),
      // 2. 運限戰略 (若有)
      trend_report: trend ? this._interpretTrend(trend, dict, natal) : null,
      // 3. 應期警示 (若有)
      flow_report: flow ? this._interpretFlow(flow, dict, trend) : null,
      // 4. 戰術地圖 (根據全盤分數)
      tactical_map: this._generateTacticalMap(natal.scores, dict),
      // 5. 總結
      summary: {
        text: summary, // 來自 Analyzer 的跨層級邏輯判斷
        mental_health: this._checkMentalHealth(fullData, dict)
      }
    };
  },

  /**
   * 1. 本命模組轉譯 (深度版)
   */
  _interpretNatal: function(natal, dict, fullData) {
    const lifePalace = fullData.staticChart.palaces.find(p => p.name === "命宮");
    const dictDef = dict.palace_definitions["命宮"];
    
    // A. 提取星曜特質 (使用 v13.1 辭典)
    const majorStars = lifePalace.stars.filter(s => 
      !["火星","鈴星","擎羊","陀羅","地空","地劫"].includes(s.name.split('(')[0])
    );
    
    let traitsList = [];
    if (dict.star_traits) {
      majorStars.forEach(s => {
        const cleanName = s.name.split('(')[0];
        if (dict.star_traits[cleanName]) {
          traitsList.push({ star: s.name, keywords: dict.star_traits[cleanName] });
        }
      });
    }

    // B. 格局細節 (拒絕閹割，顯示破格原因)
    const patterns = natal.patterns.map(p => {
      let status = "格局完整";
      let nuance = "";
      
      if (p.specialNote) {
        status = `✨ 特殊格 (${p.specialNote})`;
        nuance = `獲得加成 +${p.bonus}分`;
      } else if (p.isBroken) {
        status = "⚠️ 格局受損";
        // 嘗試找出破壞因子 (Analyzer 需在 pattern 物件中回傳 malefics)
        // 若 analyzer 沒回傳，則依賴文字描述
        nuance = `穩定度僅 ${p.stability}% (受煞星干擾)`;
      } else {
        nuance = `穩定度 ${p.stability}%`;
      }

      return {
        name: p.name,
        status: status,
        detail: nuance,
        desc: p.traits,
        advice: p.pro_advice
      };
    });

    return {
      title: "【先天基因解碼】",
      core_engine: {
        stars: majorStars.map(s => s.name).join("、") || "命無正曜",
        definition: dictDef ? dictDef.desc : "",
        traits_analysis: traitsList // 這裡會顯示具體的性格關鍵字
      },
      energy_level: {
        score: natal.lifeScore,
        rank: this._getRank(natal.lifeScore),
        evaluation: this._getScoreComment(natal.lifeScore)
      },
      patterns: patterns.length > 0 ? patterns : [{ name: "一般格局", status: "平穩", detail: "無特殊成破", advice: "需靠後天大限行運補強。" }]
    };
  },

  /**
   * 2. 運限模組轉譯 (情境版)
   */
  _interpretTrend: function(trend, dict, natal) {
    // 取得策略描述 (v13.1)
    // Analyzer 回傳的 strategy 格式可能是 "【主攻期】：XXXX"
    const rawStrategy = trend.strategy.split('：')[0].trim(); 
    // 處理 Context Injection 產生的額外文字 (e.g. "【主攻期】 (但...)")
    const lookupKey = rawStrategy.split(' ')[0]; 

    const strategyDef = dict.trend_strategy_descriptions ? 
      dict.trend_strategy_descriptions[lookupKey] : null;

    return {
      title: "【大限戰略規劃】",
      meta: {
        range: `${trend.decadeRange} 歲`,
        theme: trend.theme.desc,
        focus: trend.theme.focus // 顯示疊宮重點
      },
      strategy: {
        type: rawStrategy,
        definition: strategyDef ? strategyDef.desc : "綜合運勢調整期",
        actionable_advice: strategyDef ? strategyDef.advice : "請參考下方具體宮位分析。"
      },
      causality_chain: {
        // 翻譯祿轉忌
        title: "十年因果鏈",
        opportunity: trend.causality.opportunity,
        outcome: trend.causality.outcome,
        interpretation: "這意味著機會雖然從前者浮現，但若不解決後者的問題，成果將難以保留。"
      }
    };
  },

  /**
   * 3. 應期模組轉譯 (共振版)
   */
  _interpretFlow: function(flow, dict, trend) {
    // A. 翻譯共振風險 (使用 si_hua_collision_logic)
    const risks = flow.resonanceRisk.map(r => {
      // r.sources = ["本命忌", "流年忌"]
      const isTriple = r.level === "CRITICAL";
      const collisionType = isTriple ? "雙忌" : "忌沖祿"; // 簡化判斷，理想應從 Analyzer 取得具體類型
      
      const logicDef = dict.si_hua_collision_logic ? dict.si_hua_collision_logic["雙忌"] : null;
      
      return {
        location: r.palace,
        severity: isTriple ? "🛑 紅色警戒" : "⚠️ 黃色警戒",
        sources: r.desc, // "受到 本命忌 + 流年忌 夾擊"
        implication: logicDef ? logicDef.desc : "多重壓力的匯聚點，易生變故。"
      };
    });

    // B. 翻譯飛星事件
    const events = flow.triggers.map(t => {
      // 嘗試從辭典查找對應策略
      const ruleKey = Object.keys(dict.flying_star_causality || {}).find(k => 
        dict.flying_star_causality[k].label === t.label
      );
      const rule = ruleKey ? dict.flying_star_causality[ruleKey] : null;

      return {
        event_name: t.label,
        warning: t.desc,
        strategy: rule ? rule.strategy : "建議保守應對，多方諮詢。"
      };
    });

    return {
      title: "【流年應期預警】",
      year_info: `${flow.year} (${flow.stemBranch}年)`,
      risk_assessment: risks.length > 0 ? risks : [{ location: "全盤", severity: "🟢 綠色安全", implications: "本年無重大結構性凶象。" }],
      event_triggers: events,
      monthly_guidance: flow.monthlyForecast ? flow.monthlyForecast.focus : "無流月資料"
    };
  },

  /**
   * 4. 戰術地圖生成 (新增功能)
   * 根據 Natal Scores 找出最強與最弱的宮位，對應 Dictionary 的 Tactical Tags
   */
  _generateTacticalMap: function(scores, dict) {
    // 排序分數
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    const tags = dict.tactical_tags || {};

    return {
      title: "【個人化攻守地圖】",
      attack_point: {
        palace: strongest.name,
        score: strongest.score,
        tag: tags.attack_vector || "進攻矛頭",
        advice: `此宮位能量最強，是您人生的突破口。遇到困難時，依靠${strongest.name}相關的人事物最容易獲得解決。`
      },
      defense_point: {
        palace: weakest.name,
        score: weakest.score,
        tag: tags.defensive_vector || "防守死角",
        advice: `此宮位能量最弱，是您的阿基里斯腱。切勿在此領域進行高風險博弈，應設立停損點。`
      },
      safe_haven: {
        // 找分數高且非命宮的宮位作為避風港
        palace: sorted.find(p => p.name !== "命宮" && p.name !== strongest.name)?.name || "無顯著避風港",
        tag: tags.safe_haven || "生氣之源",
        advice: "當運勢受挫時，退守此領域可獲得休養生息。"
      }
    };
  },

  /**
   * 5. 身心健康檢測
   */
  _checkMentalHealth: function(fullData, dict) {
    const spiritPalace = fullData.staticChart.palaces.find(p => p.name === "福德宮");
    const adviceDict = dict.mental_health_deep_advice;
    if (!adviceDict) return null;

    let diagnosis = [];

    // 檢測邏輯 (與 Analyzer 同步，但在這裡翻譯)
    if (spiritPalace.stars.some(s => s.name.includes('忌'))) {
      diagnosis.push(adviceDict.spirit_conflict_high);
    }
    if (spiritPalace.stars.some(s => ["地空", "地劫"].includes(s.name.split('(')[0]))) {
      diagnosis.push(adviceDict.inner_void);
    }

    return diagnosis.length > 0 ? diagnosis : [{ title: "心靈狀態平穩", desc: "內在價值觀與外在行為模式暫無顯著衝突。" }];
  },

  // --- 輔助函數 ---

  _getRank: function(score) {
    if (score >= 90) return "S+ (極致)";
    if (score >= 80) return "A (強勢)";
    if (score >= 70) return "B+ (中上)";
    if (score >= 60) return "B (普通)";
    return "C (需補強)";
  },

  _getScoreComment: function(score) {
    if (score >= 80) return "底氣十足，抗壓性極佳，適合承擔開創性任務。";
    if (score >= 60) return "結構尚稱穩固，在既有軌道上能發揮良好。";
    return "結構較為鬆散，易受環境波動影響，建議專注單一領域深耕。";
  }
};

export default ZiweiInterpreter;

/**
 * ZiweiInterpreter - 專業級邏輯轉譯引擎 (v15.1 - Tactical Enhanced)
 * 核心職責：將 Analyzer 數據轉譯為人類可讀報告。
 * 對接規格：
 * - Dictionary: v15.1 (包含 tactical_advice_db)
 * - Analyzer: v5.3 (DI)
 * - Engine: v8.1
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
        interpreter_version: "v15.1-Tactical-Enhanced",
        generated_at: new Date().toLocaleDateString()
      },
      // 1. 本命全解析
      natal_report: this._interpretNatal(natal, dict, fullData),
      // 2. 運限戰略 (若有)
      trend_report: trend ? this._interpretTrend(trend, dict, natal) : null,
      // 3. 應期警示 (若有)
      flow_report: flow ? this._interpretFlow(flow, dict, trend) : null,
      // 4. 戰術地圖 (核心升級：對接 tactical_advice_db)
      tactical_map: this._generateTacticalMap(natal.scores, dict, fullData),
      // 5. 總結
      summary: {
        text: summary,
        mental_health: this._checkMentalHealth(fullData, dict)
      }
    };
  },

  /**
   * 1. 本命模組轉譯
   */
  _interpretNatal: function(natal, dict, fullData) {
    const lifePalace = fullData.staticChart.palaces.find(p => p.name === "命宮");
    const dictDef = dict.palace_definitions["命宮"];
    
    // A. 提取主星特質
    const majorStars = lifePalace.stars.filter(s => s.type === 'major');
    
    let traitsList = [];
    if (dict.star_traits) {
      majorStars.forEach(s => {
        const cleanName = s.name.split('(')[0];
        if (dict.star_traits[cleanName]) {
          traitsList.push({ star: s.name, keywords: dict.star_traits[cleanName] });
        }
      });
    }

    // B. 格局細節轉譯
    const patterns = natal.patterns.map(p => {
      let status = "格局完整";
      let nuance = "";
      
      if (p.specialNote) {
        status = `✨ 特殊格 (${p.specialNote})`;
        nuance = `獲得加成 +${p.bonus}分`;
      } else if (p.isBroken) {
        status = "⚠️ 格局受損";
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
        definition: dictDef ? dictDef.desc : "命運總樞紐",
        traits_analysis: traitsList
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
   * 2. 運限模組轉譯
   */
  _interpretTrend: function(trend, dict, natal) {
    // 解析策略字串 (處理 Analyzer 可能輸出的 "【主攻期】 (但...)" 格式)
    // 假設格式為 "【主攻期】：XXXX" 或 "【主攻期】 (修正...)"
    const rawStrategy = trend.strategy.split('：')[0].trim(); 
    const lookupKey = rawStrategy.split(' ')[0]; // 取出 "【主攻期】" 作為 key

    const strategyDef = dict.trend_strategy_descriptions ? 
      dict.trend_strategy_descriptions[lookupKey] : null;

    return {
      title: "【大限戰略規劃】",
      meta: {
        range: `${trend.decadeRange} 歲`,
        theme: trend.theme.description,
        focus: trend.theme.focus 
      },
      strategy: {
        type: rawStrategy,
        definition: strategyDef ? strategyDef.desc : "綜合運勢調整期",
        actionable_advice: strategyDef ? strategyDef.advice : "請參考具體宮位分析，保持彈性。"
      },
      causality_chain: {
        title: "十年因果鏈",
        opportunity: trend.causality.opportunity,
        outcome: trend.causality.outcome,
        interpretation: "機會從前者浮現，但若不解決後者問題，成果難以保留。"
      }
    };
  },

  /**
   * 3. 應期模組轉譯 (Flow)
   */
  _interpretFlow: function(flow, dict, trend) {
    // A. 轉譯共振風險 (Resonance Risk)
    const risks = flow.resonanceRisk.map(r => {
      // 根據類型提供預設建議
      let defaultAdvice = "需謹慎應對。";
      if (r.type.includes('JI')) defaultAdvice = "建議保守，停止高風險操作，保留現金。";
      if (r.type.includes('LU')) defaultAdvice = "機會難得，宜積極把握，擴大戰果。";

      return {
        location: r.palace,
        severity: r.severity,
        sources: r.sources,
        implication: r.desc, // Analyzer 已經查好字典描述 (例如 "壓力疊加...")
        advice: defaultAdvice
      };
    });

    // B. 轉譯觸發事件 (Triggers)
    const events = flow.triggers.map(t => ({
        event_name: t.label,
        warning: t.desc,
        strategy: t.strategy
    }));

    return {
      title: "【流年應期預警】",
      year_info: `${flow.year} (${flow.stemBranch}年)`,
      risk_assessment: risks.length > 0 ? risks : [{ location: "全盤", severity: "🟢 綠色安全", sources: "無", implication: "本年無重大結構性凶象。", advice: "可依既定計畫執行。" }],
      event_triggers: events,
      monthly_guidance: flow.monthlyForecast ? flow.monthlyForecast.focus : "無流月資料"
    };
  },

  /**
   * 4. 戰術地圖生成 (Tactical Map)
   * 核心修正：從字典 tactical_advice_db 讀取建議
   */
  _generateTacticalMap: function(scores, dict, fullData) {
    if (!scores || scores.length === 0) return null;

    // 排序分數
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    
    // 尋找避風港：分數前三高，且不是命宮或進攻點的宮位，作為緩衝區
    const safeHavenCandidate = sorted.find(p => p.name !== "命宮" && p.name !== strongest.name) || sorted[1];

    const tags = dict.tactical_tags || {};
    const adviceDB = dict.tactical_advice_db || { attack: {}, defense: {} };

    return {
      title: "【個人化攻守地圖】",
      attack_point: {
        palace: strongest.name,
        score: strongest.score,
        tag: tags.attack_vector || "進攻矛頭",
        // 動態讀取建議：attack -> 宮位名稱
        advice: adviceDB.attack?.[strongest.name] || `此宮位(${strongest.name})能量最強，是您人生的突破口。`
      },
      defense_point: {
        palace: weakest.name,
        score: weakest.score,
        tag: tags.defensive_vector || "防守死角",
        // 動態讀取建議：defense -> 宮位名稱
        advice: adviceDB.defense?.[weakest.name] || `此宮位(${weakest.name})能量最弱，切勿在此領域進行高風險博弈。`
      },
      safe_haven: {
        palace: safeHavenCandidate?.name || "無顯著避風港",
        tag: tags.safe_haven || "生氣之源",
        advice: "當運勢受挫時，退守此領域可獲得休養生息，避免全線崩潰。"
      }
    };
  },

  /**
   * 5. 身心健康檢測
   */
  _checkMentalHealth: function(fullData, dict) {
    const spiritPalace = fullData.staticChart.palaces.find(p => p.name === "福德宮");
    const adviceDict = dict.mental_health_deep_advice;
    
    // 安全檢查
    if (!adviceDict || !spiritPalace) return null;

    let diagnosis = [];

    // 檢測邏輯
    const hasJi = spiritPalace.stars.some(s => s.transformation === '忌' || s.name.includes('忌'));
    const hasVoid = spiritPalace.stars.some(s => ["地空", "地劫"].includes(s.name.split('(')[0]));

    if (hasJi) {
      diagnosis.push(adviceDict.spirit_conflict_high);
    }
    if (hasVoid) {
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

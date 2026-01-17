/**
 * ZiweiAnalyzer - 紫微斗數分析系統總控 (v5.3 - Dependency Injection 版)
 * 核心職責：協調本命(Natal)、趨勢(Trend)、應期(Flow)三大分析模組。
 * * 【介面合約說明】
 * 1. Natal 模組: analyze(staticChart, dict) -> { lifeScore, summary, patterns, ... }
 * 2. Trend 模組: analyze(fullData, dict, natalResult) -> { strategy, theme: { desc }, ... }
 * 3. Flow 模組: analyze(fullData, dict, decadeResult, natalResult) -> { resonanceRisk: [], ... }
 */

const ZiweiAnalyzer = {
  /**
   * 全方位分析入口
   * @param {Object} modules - 外部注入的分析器實體容器 { Natal, Trend, Flow }
   * @param {Object} fullData - 包含 { staticChart, decadeInfo, yearlyLuck, monthlyLuck }
   * @param {Object} dict - 系統辭典資料 (JSON)
   */
  analyzeAll: function(modules, fullData, dict) {
    // 解構注入的子分析器實體
    const { Natal, Trend, Flow } = modules;

    // 基礎邊界檢查
    if (!fullData || !fullData.staticChart) {
      return { error: "核心數據(staticChart)缺失，無法執行分析。" };
    }

    if (!Natal || !Trend || !Flow) {
      return { error: "分析模組注入不完全，請檢查模組載入狀態。" };
    }

    // 1. 執行本命分析 (Base Layer)
    // 職責：提取性格基因、計算宮位能量、判定先性格局
    const natalResult = Natal.analyze(fullData.staticChart, dict);

    // 2. 執行運限分析 (Trend Layer)
    // 職責：十年大限運勢定位、疊宮主題、體用修正
    // 連動邏輯：傳入 natalResult 供 TrendAnalyzer 判斷「身強/身弱」以修正策略
    const decadeResult = fullData.decadeInfo ? 
      Trend.analyze(fullData, dict, natalResult) : null;

    // 3. 執行應期分析 (Flow Layer)
    // 職責：流年事件觸發、三代忌星碰撞、月份動態
    // 連動邏輯：傳入 decadeResult 與 natalResult 進行風險權重分級
    const flowResult = fullData.yearlyLuck ? 
      Flow.analyze(fullData, dict, decadeResult, natalResult) : null;

    // 4. 整合各層級數據並合成決策建議
    return {
      metadata: {
        version: "5.3-GrandMaster-DI-Standard",
        timestamp: new Date().toISOString()
      },
      natal: natalResult,
      trend: decadeResult,
      flow: flowResult,
      // 合成具備「體用辯證」邏輯的最終摘要
      summary: this._synthesizeSummary(natalResult, decadeResult, flowResult)
    };
  },

  /**
   * 跨層級綜合摘要生成
   * 邏輯：體(本命) x 用(大限/流年) 的連動分析
   */
  _synthesizeSummary: function(n, d, f) {
    let text = `【本命格局】：${n.summary}\n`;
    
    // --- 邏輯連動層 A: 本命 vs 大限 ---
    if (d) {
      text += `【大限運勢】：目前行運策略為 ${d.strategy}，重點在於 ${d.theme.desc}。\n`;
      
      // 體用平衡檢測：命弱運強 (虛不受補)
      if (n.lifeScore < 65 && d.strategy.includes("主攻")) {
        text += `⚠️ 戰略修正：考量本命底氣稍弱（${n.lifeScore}分），建議將大限「主攻」調整為「穩健推進」，防範過度擴張導致的後勁不足。\n`;
      }
      
      // 體用平衡檢測：命強運弱 (潛龍勿用)
      if (n.lifeScore > 80 && d.strategy.includes("防守")) {
        text += `💡 戰略修正：本命格局強健（${n.lifeScore}分），目前雖處於防守期，但具備極佳的抗壓與優化能力，適合進行內部系統性的升級。\n`;
      }
    }

    // --- 邏輯連動層 B: 大限 vs 流年 (應期判斷) ---
    if (f && d) {
      if (f.resonanceRisk && f.resonanceRisk.length > 0) {
        text += `【流年警示】：本年偵測到 ${f.resonanceRisk.length} 個結構性高風險宮位。\n`;
        
        // 應期引動檢測：流年凶星是否引動了大限的隱憂
        const isDecadeRiskTriggered = f.resonanceRisk.some(r => r.desc && r.desc.includes("大限忌"));
        if (isDecadeRiskTriggered) {
           text += `🛑 嚴重警告：流年凶星已引動大限之因果樞紐，屬「應期」已至，請務必針對風險宮位採取強制避險措施。\n`;
        }
      } else {
        // 吉向連動
        if (d.strategy.includes("主攻")) {
          text += `✅ 流年利好：本年外部環境平穩，無重大衝突星曜干擾，有利於全力推進大限之擴張計畫。\n`;
        }
      }
    }
    
    return text;
  }
};

export default ZiweiAnalyzer;

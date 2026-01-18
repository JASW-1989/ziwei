/**
 * ZiweiAnalyzer - 紫微斗數分析系統總控 (v5.4 - Final Production)
 * 核心職責：協調本命(Natal v2.1)、趨勢(Trend v1.2)、應期(Flow v2.1)三大分析模組。
 * 升級重點：確保「體用辯證」邏輯使用更新後的數據結構。
 */

const ZiweiAnalyzer = {
  /**
   * 全方位分析入口
   */
  analyzeAll: function(modules, fullData, dict) {
    const { Natal, Trend, Flow } = modules;

    if (!fullData || !fullData.staticChart) {
      return { error: "核心數據(staticChart)缺失，無法執行分析。" };
    }

    // 1. 本命分析 (Base Layer)
    const natalResult = Natal.analyze(fullData.staticChart, dict);

    // 2. 運限分析 (Trend Layer)
    const decadeResult = fullData.decadeInfo ? 
      Trend.analyze(fullData, dict, natalResult) : null;

    // 3. 應期分析 (Flow Layer)
    const flowResult = fullData.yearlyLuck ? 
      Flow.analyze(fullData, dict, decadeResult, natalResult) : null;

    // 4. 整合決策
    return {
      metadata: {
        version: "5.4-Final-Production",
        timestamp: new Date().toISOString()
      },
      natal: natalResult,
      trend: decadeResult,
      flow: flowResult,
      summary: this._synthesizeSummary(natalResult, decadeResult, flowResult)
    };
  },

  _synthesizeSummary: function(n, d, f) {
    let text = `【本命格局】：${n.summary}\n`;
    
    // 體用連動 A: 本命 vs 大限
    if (d) {
      text += `【大限運勢】：目前行運策略為 ${d.strategy}，重點在於 ${d.theme.desc}。\n`;
      
      // 體用平衡檢測：命弱運強
      if (n.lifeScore < 65 && d.strategy.includes("主攻")) {
        text += `⚠️ 戰略修正：考量本命底氣稍弱（${n.lifeScore}分），建議將大限「主攻」調整為「穩健推進」，防範過度擴張導致的後勁不足。\n`;
      }
      
      // 體用平衡檢測：命強運弱
      if (n.lifeScore > 80 && d.strategy.includes("防守")) {
        text += `💡 戰略修正：本命格局強健（${n.lifeScore}分），目前雖處於防守期，但具備極佳的抗壓與優化能力，適合進行內部系統性的升級。\n`;
      }
    }

    // 體用連動 B: 大限 vs 流年
    if (f && d) {
      if (f.resonanceRisk && f.resonanceRisk.length > 0) {
        text += `【流年警示】：本年偵測到 ${f.resonanceRisk.length} 個結構性高風險宮位。\n`;
        
        // 應期引動檢測：流年凶星是否引動大限忌
        const isDecadeRiskTriggered = f.resonanceRisk.some(r => r.sources && r.sources.includes("大限忌"));
        if (isDecadeRiskTriggered) {
           text += `🛑 嚴重警告：流年凶星已引動大限之因果樞紐，屬「應期」已至，請務必針對風險宮位採取強制避險措施。\n`;
        }
      } else {
        if (d.strategy.includes("主攻")) {
          text += `✅ 流年利好：本年外部環境平穩，無重大衝突星曜干擾，有利於全力推進大限之擴張計畫。\n`;
        }
      }
    }
    
    return text;
  }
};

export default ZiweiAnalyzer;

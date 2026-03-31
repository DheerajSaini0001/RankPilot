import fs from 'fs';
import path from 'path';

class PromptBuilder {
    constructor() {
        this.prompts = {
            system: fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8'),
            weeklyInsight: fs.readFileSync(path.join(process.cwd(), 'prompts', 'weekly-insight.txt'), 'utf8'),
            suggestedQuestions: fs.readFileSync(path.join(process.cwd(), 'prompts', 'suggested-questions.txt'), 'utf8'),
        };
    }

    buildContext(data = {}) {
        if (!data) data = {};
        
        let ctx = `## 📊 Analytics Deep-Scan (Database Logs)\n`;
        if (data.startDate && data.endDate) {
            ctx += `**Analysis Period:** ${data.startDate} to ${data.endDate} (Today: ${data.today || 'N/A'})\n\n`;
        } else {
            ctx += `\n`;
        }

        // Section 1: Platform Connectivity Status
        ctx += `### 📡 Data Sources Active\n`;
        const activeFlags = [];
        if (data.ga4) activeFlags.push("✅ Google Analytics 4");
        if (data.gsc) activeFlags.push("✅ Search Console");
        if (data.googleAds) activeFlags.push("✅ Google Ads");
        if (data.facebookAds) activeFlags.push("✅ Meta Ads");
        ctx += activeFlags.length > 0 ? activeFlags.join(" | ") + "\n\n" : "⚠️ No active platform data found.\n\n";

        // Helper for calculated metrics
        const safeRatio = (num, den, multiplier = 1, prefix = '', suffix = '') => {
            if (!den || den === 0) return `${prefix}0${suffix}`;
            return prefix + ((num / den) * multiplier).toFixed(2) + suffix;
        };

        // Section 2: Aggregated Period Totals (Market-Intel Table)
        ctx += `### 🗓️ Period Performance & Profitability\n`;
        ctx += `| Metric Group | Value | Platform | Efficiency / Key Metrics |\n| :--- | :--- | :--- | :--- |\n`;
        
        if (data.ga4) {
            ctx += `| Traffic | **${data.ga4.users}** Users | GA4 | ${data.ga4.engagementRate}% Engaged |\n`;
            ctx += `| Profits | **$${data.ga4.revenue || 0}** | GA4 | ${data.ga4.transactions} Trans. |\n`;
            ctx += `| Retention | **${data.ga4.avgSessionDuration}s** Avg | GA4 | ${data.ga4.engagedSessions} Eng. Ses |\n`;
        }
        if (data.gsc) {
            ctx += `| Organic | **${data.gsc.clicks}** Clicks | GSC | ${data.gsc.ctr}% CTR |\n`;
            ctx += `| Visibility | **${data.gsc.impressions}** Impr. | GSC | Pos: ${data.gsc.position} |\n`;
        }
        if (data.googleAds) {
            const sym = data.googleAds.currencyCode || '$';
            ctx += `| Search Ads | **${sym}${data.googleAds.spend}** Spend | G.Ads | ${sym}${data.googleAds.cpc} CPC |\n`;
            ctx += `| Profits | **${sym}${data.googleAds.conversionValue}** Val | G.Ads | ${data.googleAds.conversions} Conv. |\n`;
            ctx += `| Audience | **${data.googleAds.impressions}** Impr. | G.Ads | ${data.googleAds.searchImpressionShare}% Impr. Share |\n`;
        }
        if (data.facebookAds) {
            const sym = data.facebookAds.currency || '$';
            ctx += `| Meta Ads | **${sym}${data.facebookAds.spend}** Spend | Meta | ${sym}${data.facebookAds.cpc} CPC |\n`;
            ctx += `| Audience | **${data.facebookAds.reach}** Reach | Meta | ${data.facebookAds.landingPageViews} LP Visits |\n`;
            ctx += `| Engagement | **${data.facebookAds.linkClicks}** Clicks | Meta | ${data.facebookAds.conversions} Results |\n`;
        }
        ctx += `\n`;

        // Section 3: High-Signal Granular Dimensions (Winners & Losers)
        if (data.topDimensions) {
            ctx += `### 🏆 Business Breakdown (Dimension Leaderboards)\n`;
            const { queries, pages, campaigns, devices, channels } = data.topDimensions;

            if (queries?.length) {
                ctx += `#### Top Keywords (GSC Performance):\n| Keyword | Clicks | Impr. | CTR | Pos. |\n| :--- | :--- | :--- | :--- | :--- |\n`;
                queries.slice(0, 10).forEach(q => ctx += `| ${q.name} | ${q.clicks} | ${q.impressions} | ${q.ctr}% | ${q.position} |\n`);
                ctx += `\n`;
            }

            if (pages?.length) {
                ctx += `#### Page-Level Intelligence (GA4 + GSC):\n| Page Path | Sessions | Bounce | Clicks | Rank | Top Keywords |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
                pages.slice(0, 10).forEach(p => ctx += `| ${p.name} | ${p.sessions} | ${p.bounceRate}% | ${p.gscClicks} | ${p.gscPosition} | ${p.topKeywords} |\n`);
                ctx += `\n`;
            }

            if (campaigns?.length) {
                ctx += `#### Best Performing Campaigns:\n| Campaign | Results |\n| :--- | :--- |\n`;
                campaigns.slice(0, 10).forEach(c => ctx += `| ${c.name} | ${c.value} |\n`);
                ctx += `\n`;
            }

            if (channels?.length) {
                ctx += `#### Traffic Channels:\n| Channel | Sessions |\n| :--- | :--- |\n`;
                channels.forEach(c => ctx += `| ${c.name} | ${c.value} |\n`);
                ctx += `\n`;
            }

            if (devices?.length) {
                ctx += `#### Device Segment:\n| Device | Sessions |\n| :--- | :--- |\n`;
                devices.forEach(d => ctx += `| ${d.name} | ${d.value} |\n`);
                ctx += `\n`;
            }
        }

        // Section 4: Time-Series Trend Analysis
        if (data.dailyBreakdown && Object.keys(data.dailyBreakdown).length > 0) {
            ctx += `### 📈 Historical Daily Logs\n`;
            ctx += `Use these logs for chart generation and identifying day-over-day momentum shifts.\n\n`;
            
            Object.keys(data.dailyBreakdown).forEach(source => {
                const sourceTitle = source.toUpperCase().replace('-', ' ');
                ctx += `#### [${sourceTitle} Trend Log]:\n`;
                ctx += `| Date | Key Metrics (Value) |\n| :--- | :--- |\n`;
                
                const sortedLogs = [...data.dailyBreakdown[source]].sort((a, b) => new Date(a.date) - new Date(b.date));
                sortedLogs.forEach(day => {
                    const metrics = Object.entries(day.metrics)
                        .map(([k, v]) => `**${k}**: ${v}`)
                        .join(' | ');
                    ctx += `| ${day.date} | ${metrics} |\n`;
                });
                ctx += `\n`;
            });
        }

        // Section 5: AI Visualization Guidelines (Conditional)
        ctx += `### 💡 Optional Visualization Logic\n`;
        ctx += `- **Line Charts**: Use ONLY for complex daily trends when requested.\n`;
        ctx += `- **Bar Charts**: Use ONLY for comparing Top dimensions when a visual comparison is requested.\n`;
        ctx += `- **Pie/Donut Charts**: Use for Channel/Device share if specifically requested.\n`;
        ctx += `**CRITICAL**: If the user asks for a simple list (like "top keywords"), provide it as a text table or list ONLY. No chart.\n\n`;

        return ctx;
    }


    buildAskPrompt(question, data, chatHistory = []) {
        let historyBlock = '';

        if (chatHistory.length > 0) {
            historyBlock = `\n\n## 💬 Conversation History (for context)\n`;
            chatHistory.forEach(msg => {
                const label = msg.role === 'user' ? '**User**' : '**Assistant**';
                // Truncate long assistant responses to save tokens
                const content = msg.role === 'assistant' && msg.content.length > 800
                    ? msg.content.slice(0, 800) + '...[truncated]'
                    : msg.content;
                historyBlock += `${label}: ${content}\n\n`;
            });
            historyBlock += `---\n`;
        }

        return `${this.prompts.system}\n\n${this.buildContext(data)}${historyBlock}\n\nUser Question: ${question}`;
    }

    buildWeeklyInsightPrompt(data) {
        return `${this.prompts.system}\n\n${this.buildContext(data)}\n\n${this.prompts.weeklyInsight}`;
    }

    buildSuggestionsPrompt(data) {
        const context = this.buildContext(data);
        return `${context}\n\n${this.prompts.suggestedQuestions}`;
    }
}

export default new PromptBuilder();

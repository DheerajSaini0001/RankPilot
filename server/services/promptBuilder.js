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
        
        let ctx = `## 📊 Analytics Deep-Scan (Database Logs)\n\n`;

        // Section 1: Platform Connectivity Status
        ctx += `### 📡 Data Sources Active\n`;
        const activeFlags = [];
        if (data.ga4) activeFlags.push("✅ Google Analytics 4");
        if (data.gsc) activeFlags.push("✅ Search Console");
        if (data.googleAds) activeFlags.push("✅ Google Ads");
        if (data.facebookAds) activeFlags.push("✅ Facebook Ads");
        ctx += activeFlags.length > 0 ? activeFlags.join(" | ") + "\n\n" : "⚠️ No active platform data found.\n\n";

        // Helper for calculated metrics
        const safeRatio = (num, den, multiplier = 1, prefix = '', suffix = '') => {
            if (!den || den === 0) return `${prefix}0${suffix}`;
            return prefix + ((num / den) * multiplier).toFixed(2) + suffix;
        };

        // Section 2: Aggregated Period Totals (Market-Intel Table)
        ctx += `### 🗓️ Period Performance & Profitability\n`;
        ctx += `| Metric Group | Value | Platform | Efficiency / ROI |\n| :--- | :--- | :--- | :--- |\n`;
        
        if (data.ga4) {
            ctx += `| Traffic | **${data.ga4.users}** Users | GA4 | ${safeRatio(data.ga4.sessions, data.ga4.users)} ses/user |\n`;
            ctx += `| Revenue | **$${data.ga4.revenue || 0}** | GA4 | ${data.ga4.engagementRate}% Engaged |\n`;
            ctx += `| Retention | **${data.ga4.avgSessionDuration}s** Avg | GA4 | ${data.ga4.bounceRate}% Bounce |\n`;
        }
        if (data.gsc) {
            ctx += `| Organic | **${data.gsc.clicks}** Clicks | GSC | ${data.gsc.ctr}% CTR |\n`;
            ctx += `| Visibility | **${data.gsc.impressions}** Impr. | GSC | Pos: ${data.gsc.position} |\n`;
        }
        if (data.googleAds) {
            const sym = data.googleAds.currencyCode || '$';
            const cpc = safeRatio(data.googleAds.spend, data.googleAds.clicks, 1, sym);
            const roas = safeRatio(data.googleAds.conversionValue, data.googleAds.spend, 1, '', 'x ROAS');
            ctx += `| Search Ads | **${sym}${data.googleAds.spend}** Spend | Google Ads | ${cpc} CPC |\n`;
            ctx += `| Profits | **${sym}${data.googleAds.conversionValue}** Val | Google Ads | ${roas} |\n`;
            ctx += `| Conversions | **${data.googleAds.conversions}** Conv. | Google Ads | ${data.googleAds.clicks} Clicks |\n`;
        }
        if (data.facebookAds) {
            const sym = data.facebookAds.currency || '$';
            const cpc = safeRatio(data.facebookAds.spend, data.facebookAds.clicks, 1, sym);
            const reach = data.facebookAds.reach || 0;
            ctx += `| Meta Ads | **${sym}${data.facebookAds.spend}** Spend | Meta Ads | ${cpc} CPC |\n`;
            ctx += `| Reach | **${reach}** People | Meta Ads | Conv: ${data.facebookAds.conversions} |\n`;
        }
        ctx += `\n`;

        // Section 3: High-Signal Granular Dimensions (Winners & Losers)
        if (data.topDimensions) {
            ctx += `### 🏆 Business Breakdown (Top Performing Dimensions)\n`;
            const { queries, pages, campaigns, devices, channels } = data.topDimensions;

            if (queries?.length) ctx += `**Top Keywords (GSC):** ${queries.map(q => `${q.name} (${q.value} clicks)`).join(', ')}\n\n`;
            if (pages?.length) ctx += `**Highest Traffic Pages:** ${pages.map(p => `${p.name} (${p.value} ses)`).join(', ')}\n\n`;
            if (campaigns?.length) ctx += `**Best Performing Campaigns:** ${campaigns.map(c => `${c.name} (${c.value} res)`).join(', ')}\n\n`;
            if (devices?.length) ctx += `**Device Segment:** ${devices.map(d => `${d.name} (${d.value} ses)`).join(', ')}\n\n`;
            if (channels?.length) ctx += `**Traffic Channels:** ${channels.map(c => `${c.name} (${c.value} ses)`).join(', ')}\n\n`;
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

        return ctx;
    }

    buildAskPrompt(question, data) {
        return `${this.prompts.system}\n\n${this.buildContext(data)}\n\nUser Question: ${question}`;
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

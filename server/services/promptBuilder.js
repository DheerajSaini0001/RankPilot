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
            ctx += `### 🏆 Business Breakdown (Dimension Leaderboards)\n`;
            const { queries, pages, campaigns, devices, channels } = data.topDimensions;

            if (queries?.length) {
                ctx += `#### Top Keywords (GSC):\n| Keyword | Clicks |\n| :--- | :--- |\n`;
                queries.slice(0, 10).forEach(q => ctx += `| ${q.name} | ${q.value} |\n`);
                ctx += `\n`;
            }

            if (pages?.length) {
                ctx += `#### Highest Traffic Pages:\n| Page Path | Sessions |\n| :--- | :--- |\n`;
                pages.slice(0, 10).forEach(p => ctx += `| ${p.name} | ${p.value} |\n`);
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

        // Section 5: AI Visualization Guidelines
        ctx += `### 💡 Visualization Logic\n`;
        ctx += `- **Line Charts**: Use for Daily Logs to show growth/decline over time.\n`;
        ctx += `- **Bar Charts**: Use for comparing Top Keywords, Pages, or Campaigns.\n`;
        ctx += `- **Pie/Donut Charts**: Use for Channel or Device distribution.\n`;
        ctx += `- **Composed Charts**: Use when comparing two related metrics (e.g., Bar for Revenue, Line for Users).\n\n`;

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

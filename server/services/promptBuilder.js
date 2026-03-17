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
        const safeRatio = (num, den, multiplier = 1, suffix = '') => {
            if (!den || den === 0) return `0${suffix}`;
            return ((num / den) * multiplier).toFixed(2) + suffix;
        };

        // Section 2: Aggregated Period Totals (Using Tables for Intelligence)
        ctx += `### 🗓️ Period Performance & Efficiency\n`;
        ctx += `| Metric | Value | Platform | Efficiency/Ratio |\n| :--- | :--- | :--- | :--- |\n`;
        
        if (data.ga4) {
            ctx += `| Traffic | ${data.ga4.users} Users | GA4 | ${safeRatio(data.ga4.sessions, data.ga4.users)} ses/user |\n`;
            ctx += `| Engagement | ${data.ga4.sessions} Sessions | GA4 | ${data.ga4.bounceRate}% Bounce \| ${data.ga4.engagementRate}% Engaged |\n`;
            ctx += `| Retention | ${data.ga4.avgSessionDuration}s Avg Duration | GA4 | ${safeRatio(data.ga4.pageViews, data.ga4.sessions)} views/ses |\n`;
        }
        if (data.gsc) {
            ctx += `| Organic | ${data.gsc.clicks} Clicks | GSC | ${data.gsc.ctr}% CTR |\n`;
            ctx += `| Visibility | ${data.gsc.impressions} Impr. | GSC | Pos: ${data.gsc.position} |\n`;
        }
        if (data.googleAds) {
            const cpc = safeRatio(data.googleAds.spend, data.googleAds.clicks, 1, '');
            const convRate = safeRatio(data.googleAds.conversions, data.googleAds.clicks, 100, '%');
            ctx += `| Search Ads | ${data.googleAds.currencyCode}${data.googleAds.spend} Spend | Google Ads | ${data.googleAds.currencyCode}${cpc} CPC |\n`;
            ctx += `| Conversions | ${data.googleAds.conversions} Conv. | Google Ads | ${convRate} cvr |\n`;
            ctx += `| Reach | ${data.googleAds.impressions} Impr. | Google Ads | ${data.googleAds.clicks} Clicks |\n`;
        }
        if (data.facebookAds) {
            const cpc = safeRatio(data.facebookAds.spend, data.facebookAds.clicks, 1, '');
            const convRate = safeRatio(data.facebookAds.conversions, data.facebookAds.clicks, 100, '%');
            ctx += `| Meta Ads | ${data.facebookAds.currency}${data.facebookAds.spend} Spend | Meta Ads | ${data.facebookAds.currency}${cpc} CPC |\n`;
            ctx += `| Conversions | ${data.facebookAds.conversions} Conv. | Meta Ads | ${convRate} cvr |\n`;
        }
        ctx += `\n`;

        // Section 3: Time-Series Trend Analysis
        if (data.dailyBreakdown && Object.keys(data.dailyBreakdown).length > 0) {
            ctx += `### 📈 Historical Daily Breakdown\n`;
            ctx += `The following are chronological logs. Use these to identify specific spikes, drops, or growth patterns.\n\n`;
            
            Object.keys(data.dailyBreakdown).forEach(source => {
                const sourceTitle = source.toUpperCase().replace('-', ' ');
                ctx += `#### [${sourceTitle} Trend Log]:\n`;
                ctx += `| Date | Metrics Map (Key: Value) |\n| :--- | :--- |\n`;
                
                const sortedLogs = [...data.dailyBreakdown[source]].sort((a, b) => new Date(a.date) - new Date(b.date));
                
                sortedLogs.forEach(day => {
                    const metrics = Object.entries(day.metrics)
                        .map(([k, v]) => `**${k}**: ${v}`)
                        .join(' \| ');
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

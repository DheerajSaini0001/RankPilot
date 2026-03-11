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

    buildContext(startDate, endDate, data = {}) {
        if (!data) data = {};
        let ctx = `## Analytics Context\n`;

        if (data.ga4) {
            ctx += `### Google Analytics 4\nUsers: ${data.ga4.users}\nSessions: ${data.ga4.sessions}\nBounce Rate: ${data.ga4.bounceRate}%\nAvg Session: ${data.ga4.avgSessionDuration}s\nPage Views: ${data.ga4.screenPageViews}\n`;
        }
        if (data.gsc) {
            ctx += `### Google Search Console\nClicks: ${data.gsc.clicks}\nImpressions: ${data.gsc.impressions}\nAvg CTR: ${data.gsc.ctr}%\nAvg Position: ${data.gsc.position}\n`;
        }
        if (data.googleAds) {
            ctx += `### Google Ads\nTotal Spend: ${data.googleAds.currencyCode}${data.googleAds.spend}\nImpressions: ${data.googleAds.impressions} | Clicks: ${data.googleAds.clicks} | CTR: ${data.googleAds.ctr}% | Avg CPC: ${data.googleAds.currencyCode}${data.googleAds.cpc}\nConversions: ${data.googleAds.conversions} | ROAS: ${data.googleAds.roas}\n`;
        }
        if (data.facebookAds) {
            ctx += `### Facebook Ads\nTotal Spend: ${data.facebookAds.currency}${data.facebookAds.spend}\nReach: ${data.facebookAds.reach} | Impressions: ${data.facebookAds.impressions} | Clicks: ${data.facebookAds.clicks} | CTR: ${data.facebookAds.ctr}%\nCPM: ${data.facebookAds.currency}${data.facebookAds.cpm} | CPC: ${data.facebookAds.currency}${data.facebookAds.cpc} | ROAS: ${data.facebookAds.roas}\n`;
        }

        return ctx;
    }

    buildAskPrompt(question, startDate, endDate, data) {
        return `${this.prompts.system}\n\n${this.buildContext(startDate, endDate, data)}\n\nUser Question: ${question}`;
    }

    buildWeeklyInsightPrompt(startDate, endDate, data) {
        return `${this.prompts.system}\n\n${this.buildContext(startDate, endDate, data)}\n\n${this.prompts.weeklyInsight}`;
    }

    buildSuggestionsPrompt(startDate, endDate, data) {
        return `${this.buildContext(startDate, endDate, data)}\n\n${this.prompts.suggestedQuestions}`;
    }
}

export default new PromptBuilder();

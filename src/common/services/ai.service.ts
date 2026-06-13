import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

export interface WebsiteAnalysisResult {
  businessSummary: string;
  brandVoice: string;
  targetAudience: string;
  customerPersonas: any[];
  advertisingAngles: any[];
  offerAnalysis: any;
}

export interface GeneratedCampaignStructure {
  adGroups: {
    name: string;
    theme: string;
    keywords: { text: string; matchType: 'EXACT' | 'PHRASE' | 'BROAD'; maxCpc?: number }[];
    ads: { headline: string; description: string; cta: string }[];
  }[];
  budgetRecommendation: {
    dailyBudget: number;
    rationale: string;
  };
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-compilation',
    });
  }

  async analyzeWebsiteContent(htmlContent: string): Promise<WebsiteAnalysisResult> {
    try {
      const truncatedHtml = htmlContent.substring(0, 20000);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert marketing analyst and copywriter. Analyze the provided website HTML and extract structured business intelligence. You MUST return a valid JSON object matching this exact schema:
            {
              "businessSummary": "string",
              "brandVoice": "string",
              "targetAudience": "string",
              "customerPersonas": [{"name": "string", "description": "string", "painPoints": ["string"]}],
              "advertisingAngles": [{"angle": "string", "rationale": "string"}],
              "offerAnalysis": {"pricing": "string", "guarantees": "string", "uniqueValueProps": ["string"]}
            }`,
          },
          {
            role: 'user',
            content: truncatedHtml,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException('AI returned empty content');
      }

      return JSON.parse(content) as WebsiteAnalysisResult;
    } catch (error) {
      throw new InternalServerErrorException(`AI Analysis failed: ${error.message}`);
    }
  }

  async generateCampaignStructure(
    websiteAnalysis: any,
    campaignName: string,
    network: 'GOOGLE' | 'META'
  ): Promise<GeneratedCampaignStructure> {
    try {
      const prompt = `
        You are an expert media buyer and AI campaign architect. 
        Based on the following website analysis, generate a highly optimized ${network} campaign structure.
        
        Website Analysis:
        - Summary: ${websiteAnalysis.businessSummary}
        - Brand Voice: ${websiteAnalysis.brandVoice}
        - Target Audience: ${websiteAnalysis.targetAudience}
        - Personas: ${JSON.stringify(websiteAnalysis.customerPersonas)}
        - Angles: ${JSON.stringify(websiteAnalysis.advertisingAngles)}
        
        Campaign Name: ${campaignName}
        
        You MUST return a valid JSON object matching this exact schema:
        {
          "adGroups": [
            {
              "name": "string (max 30 chars)",
              "theme": "string",
              "keywords": [
                {"text": "string (max 50 chars)", "matchType": "EXACT" | "PHRASE" | "BROAD", "maxCpc": number}
              ],
              "ads": [
                {"headline": "string (max 30 chars)", "description": "string (max 90 chars)", "cta": "string (max 25 chars)"}
              ]
            }
          ],
          "budgetRecommendation": {
            "dailyBudget": number,
            "rationale": "string"
          }
        }
        
        Rules:
        - Generate exactly 2-3 ad groups based on distinct product/service themes.
        - Generate exactly 3-5 highly relevant keywords per ad group.
        - Generate exactly 2-3 ad variations per ad group.
        - Strictly adhere to character limits for headlines (30) and descriptions (90).
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('AI returned empty content for campaign generation');
      }

      return JSON.parse(content) as GeneratedCampaignStructure;
    } catch (error) {
      throw new Error(`AI Campaign Generation failed: ${error.message}`);
    }
  }
}
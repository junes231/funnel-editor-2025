// 文件: junes231/funnel-editor-2025/funnel-editor-2025-8ec3b4a3cd21a700028b979ae1ec9e8ffeadd5c4/src/types /funnel.ts

interface Answer {
  id: string;
  text: string;
  nextStepId?: string; 
  clickCount?: number;
  // 【新增：用于评分或结果匹配的值】
  resultScore?: number; 
}
export interface FunnelComponent {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    question?: string;
    answers?: Answer[] | { [answerId: string]: Answer }; 
    buttonColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    affiliateLinks?: string[];
    
   [key: string]: any;
  };
}

// 【新增结果页接口】
export interface FunnelOutcome {
  id: string; // 例如: "result-A"
  name: string; // 例如: "高潜客户推荐"
  title: string; // 结果页面展示的标题
  summary: string; // 结果页面的总结文本
  ctaLink: string; // 专属的结果 CTA 链接
  imageUrl: string; // 专属的结果图片 URL (来自 Firebase Storage)
}
export interface ScoreOutcomeMapping {
  minScore: number;
  maxScore: number;
  outcomeId: string; // 引用 FunnelOutcome.id
}
// 【更新 FunnelData 接口以包含结果配置】
export interface FunnelData {
  questions: Question[];
  finalRedirectLink: string;
  tracking: string;
  conversionGoal: string;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
  enableLeadCapture?: boolean;
  leadCaptureWebhookUrl?: string;
  // 【新增：结果配置列表】
  outcomes: FunnelOutcome[];
  scoreMappings: ScoreOutcomeMapping[];
}

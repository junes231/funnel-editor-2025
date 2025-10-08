// 文件: junes231/funnel-editor-2025/funnel-editor-2025-8ec3b4a3cd21a700028b979ae1ec9e8ffeadd5c4/src/types /funnel.ts

interface Answer {
  id: string;
  text: string;
  nextStepId?: string; 
  clickCount?: number;
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


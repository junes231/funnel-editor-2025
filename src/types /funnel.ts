// 文件: junes231/funnel-editor-2025/funnel-editor-2025-8ec3b4a3cd21a700028b979ae1ec9e8ffeadd5c4/src/types /funnel.ts

export interface FunnelComponent {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    question?: string;
    answers?: { id: string; text: string; nextStepId?: string }[] | { [answerId: string]: { id: string; text: string; nextStepId?: string } };
    buttonColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    affiliateLinks?: string[];
    
    // 【中文注释：新增表单组件相关属性】
    formTitle?: string;            // 表单的标题
    formFields?: { type: 'text' | 'email'; label: string; placeholder: string }[]; // 表单字段定义
    webhookUrl?: string;           // 数据提交的 API 地址
    redirectAfterSubmit?: string;  // 提交后的重定向链接
    submitButtonText?: string;     // 提交按钮文本

    [key: string]: any;
  };
}

interface Answer {
  id: string;
  text: string;
  nextStepId?: string; 
  clickCount?: number;
}

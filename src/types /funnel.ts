export interface FunnelComponent {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    question?: string;
    answers?: { id: string; text: string; }[];
    buttonColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    affiliateLinks?: string[];
    [key: string]: any;
  };
}

export interface FunnelComponent {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    question?: string;
    answers?: string[];
    buttonColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    affiliateLinks?: string[];
    [key: string]: any;
  };
}

export interface Funnel {
  id: string;
  name: string;
  components: FunnelComponent[];
  createdAt: string;
  updatedAt: string;
}

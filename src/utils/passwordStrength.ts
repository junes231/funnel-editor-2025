/* 密码强度评估工具
 * 1. 首选动态加载 zxcvbn（更准确）
 * 2. 若加载失败，使用简单回退评分逻辑
 * 3. 暴露 evaluatePassword 返回统一结构
 */

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;         // 统一 0-4
  label: string;                    // 英文标签供 UI 展示
  suggestions: string[];            // 可选建议
  crackTimeDisplay?: string;        // 估计破解时间（若提供）
  calcBy: 'zxcvbn' | 'fallback';    // 指示使用哪种算法
}

let zxcvbnModule: any | null = null;
let loadingPromise: Promise<any> | null = null;

/* 动态加载 zxcvbn（只加载一次） */
async function loadZxcvbn(): Promise<any | null> {
  if (zxcvbnModule) return zxcvbnModule;
  if (loadingPromise) return loadingPromise;
  loadingPromise = import(/* webpackChunkName: "zxcvbn-chunk" */ 'zxcvbn')
    .then(mod => {
      zxcvbnModule = mod.default || mod;
      return zxcvbnModule;
    })
    .catch(() => null);
  return loadingPromise;
}

/* 回退评分（非常简单，作为兜底） */
function fallbackScore(pw: string): PasswordStrengthResult {
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;

  if (pw.length >= 12 && variety >= 3) score = 4;
  else if (pw.length >= 10 && variety >= 3) score = 3;
  else if (pw.length >= 8 && variety >= 2) score = 2;
  else if (pw.length >= 6) score = 1;
  else score = 0;

  const map = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return {
    score,
    label: map[score],
    suggestions: [],
    calcBy: 'fallback'
  };
}

/* 对外主函数 */
export async function evaluatePassword(pw: string): Promise<PasswordStrengthResult> {
  if (!pw) {
    return { score: 0, label: 'Very Weak', suggestions: [], calcBy: 'fallback' };
  }
  const lib = await loadZxcvbn();
  if (lib) {
    const result = lib(pw);
    const map = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return {
      score: result.score as 0 | 1 | 2 | 3 | 4,
      label: map[result.score],
      suggestions: (result.feedback?.suggestions || []).slice(0, 3),
      crackTimeDisplay: result.crack_times_display?.offline_slow_hashing_1e4_per_second,
      calcBy: 'zxcvbn'
    };
  }
  return fallbackScore(pw);
}

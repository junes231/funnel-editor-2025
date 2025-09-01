import { useEffect, useState } from 'react';
import { getAuth, applyActionCode } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

/**
 * 处理邮箱验证链接：
 * 期望链接格式（HashRouter 场景）:
 * https://funnel-editor2025.netlify.app/#/verify?mode=verifyEmail&oobCode=XXXX&apiKey=YYYY
 *
 * BrowserRouter 场景:
 * https://funnel-editor2025.netlify.app/verify?mode=verifyEmail&oobCode=XXXX&apiKey=YYYY
 */
export default function VerifyEmail() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const mode = sp.get('mode');
    const code = sp.get('oobCode');

    if (mode === 'verifyEmail' && code) {
      applyActionCode(getAuth(), code)
        .then(() => {
          setStatus('success');
        })
        .catch(e => {
          console.error('applyActionCode error', e);
          setStatus('error');
        });
    } else {
      setStatus('error');
    }
  }, []);

  // 成功后延迟跳转
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => {
        // 给登录页带一个标记参数
        navigate('/login?verified=1', { replace: true });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  const box: React.CSSProperties = {
    maxWidth: 480,
    margin: '100px auto',
    padding: 40,
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    border: '1px solid #e0e0e0',
    borderRadius: 12
  };

  return (
    <div style={box}>
      {status === 'checking' && <p>Verifying your email...</p>}
      {status === 'success' && <p>Email verified! Redirecting to sign in...</p>}
      {status === 'error' && (
        <div>
          <p style={{ color: '#d32f2f' }}>Invalid or expired verification link.</p>
          <p>
            <a href="/#/login">Back to Sign In</a>
          </p>
        </div>
      )}
    </div>
  );
}

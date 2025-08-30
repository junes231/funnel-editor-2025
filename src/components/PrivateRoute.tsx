import { Navigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import FinishSignIn from './pages/FinishSignIn.js'; 
interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  // 使用 Firebase Auth 来检查用户是否登录
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    // 如果用户未登录，重定向到登录页面
    return <Navigate to="/login" replace />;
  }

  // 如果用户已登录，显示受保护的内容
  return <>{children}</>;
};

export default PrivateRoute;

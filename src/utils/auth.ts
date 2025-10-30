import { getAuth } from "firebase/auth";

export const getAuthToken = async () => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) {
    throw new Error('User not authenticated for file deletion.');
  }
  return user.getIdToken();
};

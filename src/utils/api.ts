export const deleteFileApi = async (fileUrl: string, token: string) => {
  // 你需要把 REACT_APP_TRACK_CLICK_URL 配到 .env 里
  const trackClickBaseUrl = process.env.REACT_APP_TRACK_CLICK_URL;
  if (!trackClickBaseUrl) {
    throw new Error('REACT_APP_TRACK_CLICK_URL is not configured.');
  }
  // 拼接 API 地址
  const apiUrl = `${trackClickBaseUrl.replace(/\/$/, '')}/deleteFile`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ data: { fileUrl } }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const details = errorBody.error || response.statusText;
    throw new Error(`Deletion failed: ${details}`);
  }
};

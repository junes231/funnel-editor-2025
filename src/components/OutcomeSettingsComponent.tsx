import React, { useState, useCallback } from "react";
import OutcomeItem from "./OutcomeItem.tsx";
import BackButton from "./BackButton.tsx";

const getUrlHint = (url: string | undefined): string => {
  if (!url) return 'N/A';
  const cleanUrl = url.split('?')[0]; // 移除 token 部分
  const maxLen = 45;
  if (cleanUrl.length <= maxLen) return `Link: ${cleanUrl}`;
  return `Link: ${cleanUrl.substring(0, maxLen)}...`;
};
const BUCKET_NAME = 'funnel-editor-netlify.firebasestorage.app';

const OutcomeSettingsComponent = ({
  outcomes,
  setOutcomes,
  funnelId,
  storage,
  onBack,
  extractFileNameFromUrl,
  showNotification, // 可选，建议传入
}) => {
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // outcome 字段变更
  const handleFieldChange = useCallback(
    (id, field, value) => {
      setOutcomes(prev =>
        prev.map(o => (o.id === id ? { ...o, [field]: value } : o))
      );
    },
    [setOutcomes]
  );

  // 拖拽上传事件
  const handleDragOver = e => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = e => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e, outcomeId) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleImageUpload(outcomeId, droppedFile);
  };

  // 图片上传
  const handleImageUpload = async (outcomeId, file) => {
    if (uploadingId === outcomeId) return;
    setUploadingId(outcomeId);
    setUploadProgress(0);

    const trackClickBaseUrl =
      process.env.REACT_APP_TRACK_CLICK_URL?.replace(/\/trackClick$/, '') ||
      'https://api-track-click-jgett3ucqq-uc.a.run.app';

    try {
      // 1. 获取签名 URL
      const generateUrlResponse = await fetch(`${trackClickBaseUrl}/generateUploadUrl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            funnelId,
            outcomeId,
            fileName: file.name,
            fileType: file.type
          }
        }),
      });

      if (!generateUrlResponse.ok) {
        const errorResponse = await generateUrlResponse.json().catch(() => ({}));
        const details = errorResponse.error || "Failed to get signed URL (Check backend logs for details).";
        showNotification && showNotification(`Upload setup failed: ${details}`, 'error');
        throw new Error(`Failed to get signed URL: ${details}`);
      }

      const { data } = await generateUrlResponse.json();
      const { uploadUrl, filePath } = data;

      if (!filePath) throw new Error("Backend did not return the file path required for getting the permanent URL.");

      // 2. 上传到 GCS
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`File PUT failed with status: ${xhr.status || 'Network/CORS error'}.`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('File PUT failed due to network error or strict CORS policy.'));
        };

        xhr.send(file);
      });

      // 3. 生成永久下载地址
      const encodedFilePath = encodeURIComponent(filePath);
      const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedFilePath}?alt=media`;

      // 4. 更新 outcome
      handleFieldChange(outcomeId, "imageUrl", permanentUrl);
      showNotification && showNotification('Image uploaded successfully!', 'success');
    } catch (error) {
      showNotification && showNotification(`Upload Error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      setUploadingId(null);
      setUploadProgress(null);
    }
  };

  // 图片删除
 const handleClearImage = async (outcomeId: string) => {
    // 1. 获取正确的 outcome 对象
    const outcomeToClear = outcomes.find(o => o.id === outcomeId);
    
    // 检查是否需要清除
    if (!outcomeToClear || !outcomeToClear.imageUrl) {
        if (typeof setFileLabel === 'function') {
             setFileLabel(prev => ({ ...prev, [outcomeId]: '' }));
        }
        return;
    }
    
    const fileUrlToDelete = outcomeToClear.imageUrl; 

    try {
        // 2. 调用辅助函数，执行后端删除
        const token = await getAuthToken(); 
        await deleteFileApi(fileUrlToDelete, token); 

        console.log("✅ Remote file deleted successfully.");

    } catch (error: any) {
        console.error("❌ CRITICAL: Remote file deletion failed:", error.message);
        
        // 如果删除失败（非 404 错误），给用户一个通知
        const isAuthError = error.message.includes('token') || error.message.includes('Authentication');
        if (isAuthError) {
             typeof showNotification === 'function' ? showNotification('Authentication error Please re-login to delete file.', 'error') : console.log('Authentication error Please re-login to delete file.', 'error');
        } else if (!error.message.includes('not found')) {
             // 忽略文件已丢失的警告，只报告其他错误
             typeof showNotification === 'function' ? showNotification('File deletion failed Code Error', 'error') : console.log('File deletion failed Code Error', 'error');
        }
        // 允许继续，清除前端状态
    }
    
    // 3. 清除本地状态
    handleFieldChange(outcomeId, "imageUrl", "");
    
    // 4. 清除文件名标签
    if (typeof setFileLabel === 'function') {
        setFileLabel(prev => ({ ...prev, [outcomeId]: '' }));
    }

    typeof showNotification === 'function' ? showNotification('Image successfully cleared from editor.', 'success') : console.log('Image successfully cleared', 'success');
};

  return (
    <div className="link-settings-container">
      <h2>
        <span role="img" aria-label="trophy">🏆</span> Exclusive Results Configuration
      </h2>
      <p>Configure different result pages for high-converting, personalized recommendations. (Changes are auto-saved).</p>
      {outcomes.map(outcome => (
        <OutcomeItem
          key={outcome.id}
          outcome={outcome}
          onFieldChange={(field, value) => handleFieldChange(outcome.id, field, value)}
          onImageUpload={handleImageUpload}
          onImageClear={handleImageClear}
          uploading={uploadingId === outcome.id}
          uploadProgress={uploadingId === outcome.id ? uploadProgress : null}
          extractFileNameFromUrl={extractFileNameFromUrl}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ))}
      <button
        className="add-button"
        onClick={() =>
          setOutcomes(prev => [
            ...prev,
            { id: `result-${Date.now()}`, name: `New Result ${prev.length + 1}`, title: '', summary: '', ctaLink: '', imageUrl: '' }
          ])
        }
        style={{ marginTop: 16 }}
      >
        <span role="img" aria-label="add">➕</span> Add New Result
      </button>
      <div className="form-actions">
        <BackButton onClick={onBack} className="save-button">
          <span role="img" aria-label="save">💾</span> Apply & Return to Editor
        </BackButton>
      </div>
    </div>
  );
};

export default OutcomeSettingsComponent;

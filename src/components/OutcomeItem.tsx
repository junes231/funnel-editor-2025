import React, { useRef } from "react";
import OptimizedTextInput from "./OptimizedTextInput.tsx";

// getUrlHint 工具函数用于美化图片链接显示
export const getUrlHint = (url: string | undefined): string => {
  if (!url) return "N/A";
  const cleanUrl = url.split("?")[0];
  const maxLen = 45;
  if (cleanUrl.length <= maxLen) return `Link: ${cleanUrl}`;
  return `Link: ${cleanUrl.substring(0, maxLen)}...`;
};

const OutcomeItem = React.memo(function OutcomeItem({
  outcome,
  onFieldChange,
  onImageUpload,
  onImageClear,
  uploading,
  uploadProgress,
  extractFileNameFromUrl,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="outcome-card" style={{ marginBottom: 25, padding: 15, border: "1px solid #ddd", borderRadius: 8, position: "relative" }}>
      <h4>{outcome.name} (Result)</h4>
      <div className="form-group">
        <label>Result Name (Internal):</label>
        <OptimizedTextInput
          value={outcome.name}
          onUpdate={v => onFieldChange("name", v)}
          placeholder="e.g., Top Budget Recommendation"
          type="text"
        />
      </div>
      <div className="form-group">
        <label>Result Title (Displayed to User):</label>
        <OptimizedTextInput
          value={outcome.title}
          onUpdate={v => onFieldChange("title", v)}
          placeholder="e.g., Congratulations! You are a High-Value Client."
          type="text"
        />
      </div>
      <div className="form-group">
        <label>CTA Link:</label>
        <OptimizedTextInput
          value={outcome.ctaLink}
          onUpdate={v => onFieldChange("ctaLink", v)}
          placeholder="https://your-product-link.com"
          type="url"
        />
      </div>
      <div className="form-group">
        <label>Result Image URL:</label>
        {outcome.imageUrl && (
          <div
            className="image-preview-wrapper"
            onClick={() => window.open(outcome.imageUrl, "_blank")}
            style={{ cursor: "pointer", marginBottom: 8 }}
          >
            <img
              src={outcome.imageUrl}
              alt="Result Preview"
              style={{ maxWidth: 120, maxHeight: 80, marginRight: 8, verticalAlign: "middle" }}
              onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://placehold.co/100x100/F44336/ffffff?text=Load+Error";
              }}
            />
            <span style={{ marginLeft: 8 }}>
              {extractFileNameFromUrl(outcome.imageUrl) || getUrlHint(outcome.imageUrl)}
            </span>
            <button
              className="delete-image-btn"
              type="button"
              onClick={e => { e.stopPropagation(); onImageClear(outcome.id); }}
              style={{ marginLeft: 4 }}
            >
              Clear Image
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="custom-file-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? `Uploading: ${uploadProgress || 0}%` : "Upload Image"}
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={e => {
              if (e.target.files?.[0]) onImageUpload(outcome.id, e.target.files[0]);
            }}
            disabled={uploading}
          />
        </div>
        {uploading && (
          <div style={{ width: 120, height: 6, background: "#eee", marginTop: 4 }}>
            <div style={{ width: `${uploadProgress || 0}%`, height: 6, background: "#007bff" }} />
          </div>
        )}
        <OptimizedTextInput
          value={outcome.imageUrl}
          onUpdate={v => onFieldChange("imageUrl", v)}
          placeholder="Or paste an external image URL"
          type="url"
          style={{ marginTop: 10 }}
          disabled={uploading}
        />
      </div>
      {/* 拖拽上传区域 */}
      <div
        className="file-upload-wrapper"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, outcome.id)}
        style={{ marginTop: 8 }}
      >
        <span className="file-name-display-hint">
          {'Or drag and drop files into this area (maximum 25MB)'}
        </span>
      </div>
    </div>
  );
});

export default OutcomeItem;

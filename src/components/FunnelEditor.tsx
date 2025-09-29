import React, { useState } from "react";

interface FunnelEditorProps {
  onSave?: (data: string) => void;
}

const FunnelEditor: React.FC<FunnelEditorProps> = ({ onSave }) => {
  const [data, setData] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(e.target.value);
  };

  const handleSave = () => {
    if (!data) return;
    setSaved(true);
    onSave?.(data);
  };

  return (
    <div>
      <input
        placeholder="输入漏斗数据"
        value={data}
        onChange={handleInputChange}
      />
      <button onClick={handleSave}>保存</button>
      {saved && <span data-testid="saved-msg">已保存</span>}
    </div>
  );
};

export default FunnelEditor;

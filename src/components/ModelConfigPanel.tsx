import { CheckCircle2, KeyRound, Save, ServerCog } from "lucide-react";
import type { LlmConfig, LlmProtocol } from "../lib/aiCodeReview";

interface ModelConfigPanelProps {
  config: LlmConfig;
  isDirty: boolean;
  onChange: (config: LlmConfig) => void;
  onSave: () => void;
  saved: boolean;
}

export function ModelConfigPanel({
  config,
  isDirty,
  onChange,
  onSave,
  saved,
}: ModelConfigPanelProps) {
  function updateConfig<Key extends keyof LlmConfig>(
    key: Key,
    value: LlmConfig[Key],
  ) {
    onChange({
      ...config,
      [key]: value,
    });
  }

  return (
    <aside className="input-panel model-config-panel" aria-label="model config">
      <div className="panel-heading">
        <h2>大模型配置</h2>
        <span>OpenAI-compatible</span>
      </div>
      <section className="import-card">
        <ServerCog size={28} />
        <div>
          <strong>配置第三方大模型后启用 AI 代码评审</strong>
          <p>
            支持 OpenAI-compatible Chat Completions，也支持 OpenAI Responses
            协议。保存后会保留在当前浏览器里。
          </p>
        </div>
      </section>
      <section className="protocol-section" aria-label="模型协议">
        <span>协议</span>
        <div className="protocol-toggle" role="group" aria-label="选择模型协议">
          {protocolOptions.map((option) => (
            <button
              aria-pressed={config.protocol === option.value}
              className={config.protocol === option.value ? "active" : ""}
              key={option.value}
              onClick={() => updateConfig("protocol", option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      <label>
        BASE_URL
        <input
          value={config.baseUrl}
          onChange={(event) => updateConfig("baseUrl", event.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </label>
      <label>
        API_KEY
        <div className="secret-input">
          <KeyRound size={16} />
          <input
            type="password"
            value={config.apiKey}
            onChange={(event) => updateConfig("apiKey", event.target.value)}
            placeholder="sk-..."
          />
        </div>
      </label>
      <label>
        MODEL
        <input
          value={config.model}
          onChange={(event) => updateConfig("model", event.target.value)}
          placeholder="gpt-4o-mini / qwen-plus / deepseek-chat"
        />
      </label>
      <div className="model-config-actions">
        <span>
          {saved
            ? "配置已保存"
            : isDirty
              ? "有未保存修改"
              : "配置已是最新"}
        </span>
        <button
          disabled={!isDirty}
          onClick={onSave}
          type="button"
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          保存配置
        </button>
      </div>
    </aside>
  );
}

const protocolOptions: Array<{ label: string; value: LlmProtocol }> = [
  { label: "Chat Completions", value: "chat_completions" },
  { label: "OpenAI Responses", value: "responses" },
];

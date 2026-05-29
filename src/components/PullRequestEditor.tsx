import { reviewModes, type ReviewMode } from "../lib/reviewEngine";

interface PullRequestEditorProps {
  description: string;
  diff: string;
  onDescriptionChange: (value: string) => void;
  onDiffChange: (value: string) => void;
  onModeChange: (value: ReviewMode) => void;
  onTitleChange: (value: string) => void;
  mode: ReviewMode;
  title: string;
}

export function PullRequestEditor({
  description,
  diff,
  onDescriptionChange,
  onDiffChange,
  onModeChange,
  onTitleChange,
  mode,
  title,
}: PullRequestEditorProps) {
  return (
    <aside className="input-panel" aria-label="pull request input">
      <div className="panel-heading">
        <h2>PR 输入</h2>
        <span>本地离线分析</span>
      </div>
      <section className="mode-section" aria-label="审查策略">
        <div className="mode-header">
          <strong>审查策略</strong>
          <span>{reviewModes[mode].description}</span>
        </div>
        <div className="mode-toggle" role="group" aria-label="选择审查策略">
          {Object.entries(reviewModes).map(([key, config]) => (
            <button
              aria-pressed={mode === key}
              className={mode === key ? "active" : ""}
              key={key}
              onClick={() => onModeChange(key as ReviewMode)}
              type="button"
            >
              {config.label}
            </button>
          ))}
        </div>
      </section>
      <label>
        PR 标题
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="feat: add review dashboard"
        />
      </label>
      <label>
        PR 描述
        <textarea
          className="description-input"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="说明功能作用、使用方式、实现思路和测试方式"
        />
      </label>
      <label className="diff-label">
        Git diff
        <textarea
          className="diff-input"
          value={diff}
          onChange={(event) => onDiffChange(event.target.value)}
          spellCheck={false}
          placeholder="粘贴 git diff 或 PR patch 内容"
        />
      </label>
    </aside>
  );
}

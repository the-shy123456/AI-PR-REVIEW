import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  GitPullRequest,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { copyTextToClipboard } from "../lib/clipboard";
import type {
  CategorySummary,
  ReviewFinding,
  ReviewReport,
} from "../lib/reviewEngine";

const severityLabels = {
  critical: "严重",
  high: "高",
  medium: "中",
  low: "低",
};

const categoryLabels = {
  security: "安全",
  testing: "测试",
  reliability: "可靠性",
  maintainability: "可维护性",
  process: "流程",
};

interface ReviewPanelProps {
  activeTab: "findings" | "description" | "tests";
  fullReport: string;
  onTabChange: (tab: ReviewPanelProps["activeTab"]) => void;
  report: ReviewReport;
}

export function ReviewPanel({
  activeTab,
  fullReport,
  onTabChange,
  report,
}: ReviewPanelProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyGeneratedText(label: string, value: string) {
    try {
      const copied = await copyTextToClipboard(value);
      setCopyStatus(copied ? `${label}已复制` : `${label}复制失败`);
    } catch {
      setCopyStatus(`${label}复制失败`);
    }

    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  return (
    <section className="review-panel" aria-label="review report">
      <div className="summary-band">
        <Sparkles size={22} />
        <p>{report.summary}</p>
      </div>

      <div className="tabs" role="tablist" aria-label="review sections">
        <button
          className={activeTab === "findings" ? "active" : ""}
          onClick={() => onTabChange("findings")}
        >
          <AlertTriangle size={16} /> 审查意见
        </button>
        <button
          className={activeTab === "description" ? "active" : ""}
          onClick={() => onTabChange("description")}
        >
          <GitPullRequest size={16} /> PR 描述
        </button>
        <button
          className={activeTab === "tests" ? "active" : ""}
          onClick={() => onTabChange("tests")}
        >
          <ListChecks size={16} /> 测试与交付
        </button>
      </div>

      {activeTab === "findings" && (
        <div className="findings-list">
          <CategorySummaryBar items={report.categorySummary} />
          {report.findings.length === 0 ? (
            <EmptyState />
          ) : (
            report.findings.map((finding) => (
              <FindingItem key={finding.id} finding={finding} />
            ))
          )}
        </div>
      )}

      {activeTab === "description" && (
        <section className="generated-section">
          <div className="section-toolbar">
            <span>{copyStatus || "可直接粘贴到 PR 描述"}</span>
            <button
              onClick={() => copyGeneratedText("PR 描述", report.prDescription)}
              type="button"
            >
              <Clipboard size={16} /> 复制
            </button>
          </div>
          <pre className="generated-copy">{report.prDescription}</pre>
        </section>
      )}

      {activeTab === "tests" && (
        <section className="generated-section">
          <div className="section-toolbar">
            <span>{copyStatus || "复制完整报告作为 Review 评论草稿"}</span>
            <button
              onClick={() => copyGeneratedText("完整报告", fullReport)}
              type="button"
            >
              <Clipboard size={16} /> 复制
            </button>
          </div>
          <div className="checklist-grid">
            <Checklist title="测试建议" items={report.testPlan} />
            <Checklist title="交付检查" items={report.deliveryChecklist} />
          </div>
        </section>
      )}
    </section>
  );
}

function CategorySummaryBar({ items }: { items: CategorySummary[] }) {
  return (
    <section className="category-summary" aria-label="review category summary">
      {items.map((item) => (
        <article key={item.category}>
          <span>{categoryLabels[item.category]}</span>
          <strong>{item.count}</strong>
          <small>
            {item.highestSeverity ? severityLabels[item.highestSeverity] : "无"}
          </small>
        </article>
      ))}
    </section>
  );
}

function FindingItem({ finding }: { finding: ReviewFinding }) {
  return (
    <article className={`finding severity-${finding.severity}`}>
      <div className="finding-title">
        <div>
          <strong>{finding.title}</strong>
          <span>{categoryLabels[finding.category]}</span>
        </div>
        <b>{severityLabels[finding.severity]}</b>
      </div>
      <p>{finding.evidence}</p>
      <p>{finding.recommendation}</p>
    </article>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="checklist">
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>
          <CheckCircle2 size={16} />
          <span>{item}</span>
        </p>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <CheckCircle2 size={32} />
      <h3>未发现内置规则风险</h3>
      <p>建议继续进行业务逻辑、架构一致性和产品体验层面的人工复核。</p>
    </section>
  );
}

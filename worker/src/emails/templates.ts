const BRAND_GREEN = "#10b981";
const ALERT_RED = "#ef4444";
const ALERT_AMBER = "#f59e0b";
const RECOVERY_GREEN = "#22c55e";

function emailWrapper(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <div style="margin:0 auto;padding:40px 20px;max-width:560px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:40px;">
      <div style="font-size:24px;font-weight:bold;color:${BRAND_GREEN};margin-bottom:24px;">UL</div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
        Sent by Uptime Lens
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

export function downtimeEmailHtml(opts: {
  monitorName: string;
  url: string;
  cause: string;
  detectedAt: string;
  dashboardUrl: string;
}): string {
  return emailWrapper(
    `<div style="border-left:4px solid ${ALERT_RED};padding-left:16px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:600;color:${ALERT_RED};">Monitor Down</div>
      <div style="font-size:16px;color:#334155;margin-top:8px;">${opts.monitorName}</div>
    </div>
    <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-weight:600;width:80px;">URL</td><td style="padding:8px 0;">${opts.url}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Cause</td><td style="padding:8px 0;">${opts.cause}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Detected</td><td style="padding:8px 0;">${opts.detectedAt}</td></tr>
    </table>
    <a href="${opts.dashboardUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background-color:${BRAND_GREEN};color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Monitor</a>`,
    `Monitor Down: ${opts.monitorName}`,
  );
}

export function recoveryEmailHtml(opts: {
  monitorName: string;
  url: string;
  downtimeDuration: string;
  recoveredAt: string;
  dashboardUrl: string;
}): string {
  return emailWrapper(
    `<div style="border-left:4px solid ${RECOVERY_GREEN};padding-left:16px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:600;color:${RECOVERY_GREEN};">Monitor Recovered</div>
      <div style="font-size:16px;color:#334155;margin-top:8px;">${opts.monitorName}</div>
    </div>
    <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-weight:600;width:80px;">URL</td><td style="padding:8px 0;">${opts.url}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Down for</td><td style="padding:8px 0;">${opts.downtimeDuration}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Recovered</td><td style="padding:8px 0;">${opts.recoveredAt}</td></tr>
    </table>
    <a href="${opts.dashboardUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background-color:${BRAND_GREEN};color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Monitor</a>`,
    `Monitor Recovered: ${opts.monitorName}`,
  );
}

export function sslExpiryEmailHtml(opts: {
  monitorName: string;
  url: string;
  daysUntilExpiry: number;
  expiryDate: string;
  dashboardUrl: string;
}): string {
  return emailWrapper(
    `<div style="border-left:4px solid ${ALERT_AMBER};padding-left:16px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:600;color:${ALERT_AMBER};">SSL Certificate Expiring</div>
      <div style="font-size:16px;color:#334155;margin-top:8px;">${opts.monitorName}</div>
    </div>
    <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-weight:600;width:120px;">URL</td><td style="padding:8px 0;">${opts.url}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Days remaining</td><td style="padding:8px 0;">${opts.daysUntilExpiry}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;">Expires</td><td style="padding:8px 0;">${opts.expiryDate}</td></tr>
    </table>
    <a href="${opts.dashboardUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background-color:${BRAND_GREEN};color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Monitor</a>`,
    `SSL Certificate Expiring: ${opts.monitorName} (${opts.daysUntilExpiry} days)`,
  );
}

export function weeklyDigestEmailHtml(opts: {
  monitors: Array<{ name: string; uptimePercentage: number }>;
  incidents: Array<{ monitorName: string; duration: string; cause: string }>;
  weekStart: string;
  weekEnd: string;
}): string {
  const monitorRows = opts.monitors
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${m.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:${m.uptimePercentage >= 99.9 ? BRAND_GREEN : ALERT_RED};">${m.uptimePercentage}%</td>
        </tr>`,
    )
    .join("");

  const incidentSection =
    opts.incidents.length > 0
      ? `<div style="margin-top:24px;">
          <div style="font-size:14px;font-weight:600;color:#334155;margin-bottom:8px;">Incidents</div>
          ${opts.incidents
            .map(
              (inc) =>
                `<div style="padding:8px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">
                  <strong>${inc.monitorName}</strong> &mdash; ${inc.cause} (${inc.duration})
                </div>`,
            )
            .join("")}
        </div>`
      : "";

  return emailWrapper(
    `<div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:4px;">Weekly Uptime Digest</div>
    <div style="font-size:13px;color:#94a3b8;margin-bottom:24px;">${opts.weekStart} &ndash; ${opts.weekEnd}</div>
    <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Monitor</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Uptime</th>
        </tr>
      </thead>
      <tbody>
        ${monitorRows}
      </tbody>
    </table>
    ${incidentSection}`,
    `Weekly Uptime Digest: ${opts.weekStart} - ${opts.weekEnd}`,
  );
}

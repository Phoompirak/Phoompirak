import { writeFile } from "node:fs/promises";

const username = "Phoompirak";
const token = process.env.GITHUB_TOKEN;
const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=stars`, {
  headers: {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
});

if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);

const repos = (await response.json())
  .filter((repo) => !repo.fork)
  .sort((a, b) => b.stargazers_count - a.stargazers_count)
  .slice(0, 10);

const width = 900;
const height = 500;
const cx = 610;
const cy = 275;
const radius = 145;
const innerRadius = 82;
const colors = ["#f05272", "#8957e5", "#329bd5", "#50c2c0", "#55c271", "#f2bd55", "#9b6de3", "#e06b9b", "#45b7a8", "#7a8bd4"];
const total = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

const polar = (r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
const arc = (start, end) => {
  const [x1, y1] = polar(radius, start);
  const [x2, y2] = polar(radius, end);
  const [ix1, iy1] = polar(innerRadius, end);
  const [ix2, iy2] = polar(innerRadius, start);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${ix2} ${iy2} Z`;
};

let angle = -Math.PI / 2;
const slices = total
  ? repos.map((repo, index) => {
      const next = angle + (repo.stargazers_count / total) * Math.PI * 2;
      const path = `<path d="${arc(angle, next)}" fill="${colors[index]}" stroke="#0b1220" stroke-width="3"/>`;
      angle = next;
      return path;
    }).join("")
  : `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#1e293b" stroke="#0b1220" stroke-width="3"/>`;

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const legend = repos.map((repo, index) => {
  const y = 93 + index * 34;
  return `<rect x="42" y="${y - 12}" width="16" height="16" rx="2" fill="${colors[index]}"/><text x="70" y="${y + 1}" class="legend">${escape(repo.name)}</text>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:25px;font-weight:600}.legend{font-size:15px}.value{font-size:28px;font-weight:700}.muted{font-size:14px;fill:#94a3b8}</style>
<rect width="100%" height="100%" rx="16" fill="#0b1220"/>
<text x="40" y="48" class="title">Stars per Repo (top 10)</text>
${legend}
${slices}
<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="value">${total}</text>
<text x="${cx}" y="${cy + 23}" text-anchor="middle" class="muted">total stars</text>
</svg>`;

await writeFile("assets/stars-per-repo.svg", svg);

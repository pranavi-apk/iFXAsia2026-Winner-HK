import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pack = path.join(root, "demo/demo-docs/silver-oak-pack");
const files = [
  "01-certificate-of-incorporation.pdf",
  "05-register-of-directors.pdf",
  "07-passport-zhang-wei.pdf",
  "09-hkid-chen-xiaolin.pdf",
  "13-structure-chart.pdf",
  "14-voting-proxy.pdf",
  "19-share-sale-agreement-zh.pdf",
  "16-audited-accounts-fy2025.pdf",
].map((name) => path.join(pack, name));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(root, "video/out/rec"), size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
await page.addInitScript(() => {
  const cursor = document.createElement("div");
  cursor.id = "demo-cursor";
  cursor.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;margin-left:-2px;margin-top:-2px;border-radius:50%;border:2px solid #fff;background:rgba(28,25,21,.55);pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.35);";
  document.documentElement.appendChild(cursor);
  window.addEventListener("mousemove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }, true);
});

const t0 = Date.now();
const marks = [];
const mark = async (name, selector) => {
  const loc = page.locator(selector).first();
  const box = await loc.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 24), { steps: 22 });
  const sec = Number(((Date.now() - t0) / 1000).toFixed(2));
  marks.push({ name, sec, box });
  console.log(`MARK ${name} ${sec}`, box);
};
const pause = (ms) => page.waitForTimeout(ms);
async function click(selector) {
  await page.locator(selector).first().click();
}

await page.goto("http://127.0.0.1:8000/app", { waitUntil: "domcontentloaded" });
await page.locator(".home-title").waitFor();
await pause(2800);

await page.setInputFiles("#agent-files", files);
await page.locator(".uploaded-file-chip").first().waitFor();
await mark("files", ".agent-composer-box");
await pause(6500);

await mark("send", ".composer-submit");
await pause(3200);
await click(".composer-submit");
await page.locator(".key-findings-section").waitFor({ timeout: 90000 });
await pause(1200);
await mark("findings", ".key-findings-section");
await pause(8000);

await mark("map-button", '[data-subnav="map"]');
await pause(2800);
await click('[data-subnav="map"]');
await page.locator("#leaflet-global-map").waitFor();
await pause(1500);
await mark("map", "#leaflet-global-map");
await pause(8000);

await mark("structure-button", '[data-subnav="structure"]');
await pause(2600);
await click('[data-subnav="structure"]');
await page.locator(".tree-viewport").waitFor();
await pause(1000);
await click('[data-action="fit"]');
await pause(800);
await mark("structure", ".tree-viewport");
await pause(9000);

await mark("people-button", '[data-subnav="people"]');
await pause(2500);
await click('[data-subnav="people"]');
await page.locator(".pe-row").first().waitFor();
await pause(800);
await mark("person", ".pe-row");
await pause(3500);
await click(".pe-row");
await page.locator(".trilingual-resolution-box").waitFor();
await pause(700);
await mark("trilingual", ".trilingual-resolution-box");
await pause(7000);
await click("#pe-drawer-close-btn");
await pause(600);

await mark("knowledge-button", '[data-subnav="documents"]');
await pause(2500);
await click('[data-subnav="documents"]');
await page.locator(".kb-graph").waitFor();
await pause(1500);
await mark("graph", ".kb-canvas");
await pause(7500);

await mark("gaps-button", '[data-subnav="gaps"]');
await pause(2500);
await click('[data-subnav="gaps"]');
await page.locator(".gap-item-card").first().waitFor();
await pause(800);
await mark("gap", ".gap-item-card");
await pause(5500);
await mark("request", ".btn-request-doc");
await pause(3500);

await mark("copilot-button", "#btn-toggle-copilot");
await pause(2800);
await click("#btn-toggle-copilot");
await page.locator(".agent-sidecar-chat-panel").waitFor();
await pause(600);
await mark("copilot", ".agent-sidecar-chat-panel");
await pause(6500);

await context.close();
await browser.close();
fs.writeFileSync(path.join(root, "video/out/marks.json"), JSON.stringify(marks, null, 2));
console.log("recorded");

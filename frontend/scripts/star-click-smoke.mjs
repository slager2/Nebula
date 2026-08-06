import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';

let planID = process.env.PLAN_ID;
let graph;
if (planID) {
  const graphResponse = await fetch(`${baseURL}/api/v1/constellations/${planID}`);
  if (!graphResponse.ok) throw new Error(`Graph fixture request failed: ${graphResponse.status}`);
  graph = await graphResponse.json();
} else {
  const plansResponse = await fetch(`${baseURL}/api/v1/constellations`);
  if (!plansResponse.ok) throw new Error(`Plan list request failed: ${plansResponse.status}`);
  const plans = await plansResponse.json();
  for (const plan of plans) {
    const response = await fetch(`${baseURL}/api/v1/constellations/${plan.id}`);
    const candidate = await response.json();
    if (candidate.nodes?.some((node) => node.status === 'available')) {
      planID = String(plan.id);
      graph = candidate;
      break;
    }
  }
}
const availableNodes = graph?.nodes?.filter((node) => node.status === 'available') || [];
if (!planID || !availableNodes.length) throw new Error('No plan with an available node was found');

const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseURL}/forge?constellation=${planID}`, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(3500);

  const points = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const clusters = [];

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const offset = (y * canvas.width + x) * 4;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];
        const a = pixels[offset + 3];
        if (a > 180 && Math.abs(r - 125) < 5 && Math.abs(g - 211) < 5 && Math.abs(b - 252) < 5) {
          let cluster = clusters.find((item) => Math.hypot(x - item.xTotal / item.count, y - item.yTotal / item.count) < 28);
          if (!cluster) {
            cluster = { count: 0, xTotal: 0, yTotal: 0 };
            clusters.push(cluster);
          }
          cluster.count += 1;
          cluster.xTotal += x;
          cluster.yTotal += y;
        }
      }
    }
    const rect = canvas.getBoundingClientRect();
    return clusters.filter((cluster) => cluster.count >= 8).map((cluster) => ({
      x: rect.left + (cluster.xTotal / cluster.count) * (rect.width / canvas.width),
      y: rect.top + (cluster.yTotal / cluster.count) * (rect.height / canvas.height),
      pixels: cluster.count,
    }));
  });

  if (!points.length) throw new Error('Could not locate any available cyan stars on the canvas');
  let clickedNode = null;
  let hitPixels = 0;
  for (const point of points) {
    await page.mouse.move(point.x + 35, point.y + 35);
    await page.waitForTimeout(850);
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(120);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);
    for (const node of availableNodes) {
      if (await page.getByRole('heading', { name: node.name, exact: true }).isVisible().catch(() => false)) {
        clickedNode = node;
        hitPixels = point.pixels;
        break;
      }
    }
    if (clickedNode) break;
  }
  if (!clickedNode) throw new Error('Canvas clicks did not open any available lesson');

  await page.getByRole('button', { name: 'Lesson list' }).click();
  const lessonButton = page.getByRole('button', { name: new RegExp(clickedNode.name) });
  await lessonButton.focus();
  await lessonButton.press('Enter');
  await page.getByRole('heading', { name: clickedNode.name, exact: true }).waitFor();

  console.log(JSON.stringify({ clicked: clickedNode.name, hitPixels, keyboard: true }));
} finally {
  await browser.close();
}

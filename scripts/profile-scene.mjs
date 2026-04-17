import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'

const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9222)
const OUTPUT_PATH = path.resolve(process.cwd(), 'profiling-report.json')
const DIST_PATH = path.resolve(process.cwd(), 'dist')
const PROFILE_PATH = path.resolve(
  process.cwd(),
  `.chrome-profile-profile-${DEBUG_PORT}`,
)
const APP_URL = 'http://127.0.0.1:4173'

let nextId = 1
let traceResolve
let traceEvents = []

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`)
  }

  return response.json()
}

async function ensureBuildExists() {
  try {
    await fs.access(path.join(DIST_PATH, 'index.html'))
  } catch {
    throw new Error('Missing dist/index.html. Run a production build before profiling.')
  }
}

function getMimeType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg'
  if (filePath.endsWith('.webp')) return 'image/webp'
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8'
  return 'application/octet-stream'
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', APP_URL)
      let filePath = path.join(DIST_PATH, decodeURIComponent(requestUrl.pathname))

      if (requestUrl.pathname === '/') {
        filePath = path.join(DIST_PATH, 'index.html')
      }

      try {
        const stat = await fs.stat(filePath)
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html')
        }
      } catch {
        filePath = path.join(DIST_PATH, 'index.html')
      }

      const body = await fs.readFile(filePath)
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': getMimeType(filePath),
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(String(error))
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(4173, '127.0.0.1', resolve)
  })

  return server
}

async function launchChrome() {
  await fs.mkdir(PROFILE_PATH, { recursive: true })

  const chromePath =
    process.env.CHROME_PATH ??
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_PATH}`,
      '--enable-gpu',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      APP_URL,
    ],
    {
      detached: false,
      stdio: 'ignore',
    },
  )

  chrome.unref()
  return chrome
}

async function connectToPageTarget(debugPort) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`)
      const page = targets.find((target) => target.type === 'page')

      if (page?.webSocketDebuggerUrl) {
        return new WebSocket(page.webSocketDebuggerUrl)
      }
    } catch {
      // Keep polling until Chrome exposes the debugger target.
    }

    await sleep(500)
  }

  throw new Error('Unable to find Chrome debugger page target')
}

function createCdpClient(socket) {
  const pending = new Map()

  socket.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data.toString())

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        reject(new Error(message.error.message))
      } else {
        resolve(message.result)
      }
      return
    }

    if (message.method === 'Tracing.dataCollected') {
      traceEvents.push(...message.params.value)
      return
    }

    if (message.method === 'Tracing.tracingComplete') {
      traceResolve?.()
    }
  })

  return {
    async send(method, params = {}) {
      const id = nextId
      nextId += 1

      const payload = JSON.stringify({ id, method, params })
      socket.send(payload)

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
      })
    },
  }
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))
  return sorted[index]
}

function summarizeTrace(events) {
  const durationByName = new Map()
  let mainThreadTimeMs = 0
  let gpuLikeTimeMs = 0
  let rasterLikeTimeMs = 0

  for (const event of events) {
    if (event.ph !== 'X' || typeof event.dur !== 'number') {
      continue
    }

    const durationMs = event.dur / 1000
    const name = event.name ?? 'unknown'
    durationByName.set(name, (durationByName.get(name) ?? 0) + durationMs)

    if (
      event.cat?.includes('devtools.timeline') ||
      event.cat?.includes('blink.user_timing') ||
      event.cat?.includes('v8')
    ) {
      mainThreadTimeMs += durationMs
    }

    if (name.includes('Raster') || name.includes('Paint') || name.includes('Composite')) {
      rasterLikeTimeMs += durationMs
    }

    if (event.cat?.includes('gpu') || name.includes('Gpu')) {
      gpuLikeTimeMs += durationMs
    }
  }

  const topEvents = [...durationByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, totalMs]) => ({ name, totalMs: Number(totalMs.toFixed(2)) }))

  return {
    gpuLikeTimeMs: Number(gpuLikeTimeMs.toFixed(2)),
    mainThreadTimeMs: Number(mainThreadTimeMs.toFixed(2)),
    rasterLikeTimeMs: Number(rasterLikeTimeMs.toFixed(2)),
    topEvents,
  }
}

async function measureScene(cdp) {
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Performance.enable')
  await cdp.send('DOM.enable')
  await cdp.send('Input.setIgnoreInputEvents', { ignore: false })
  await cdp.send('Page.navigate', { url: APP_URL })
  await sleep(2200)

  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const frames = [];
        let last = performance.now();
        let running = true;

        function loop(now) {
          frames.push(now - last);
          last = now;
          if (running) requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);

        window.__codexPerf = {
          frames,
          markStop() { running = false; },
          getSnapshot() {
            const filtered = frames.filter((value) => value > 0 && value < 1000);
            const fpsValues = filtered.map((value) => 1000 / value);
            const longFrames = filtered.filter((value) => value > 16.7).length;
            const severeFrames = filtered.filter((value) => value > 25).length;
            const summary = {
              sampleCount: filtered.length,
              averageFrameMs: filtered.reduce((sum, value) => sum + value, 0) / Math.max(filtered.length, 1),
              minFps: fpsValues.length ? Math.min(...fpsValues) : 0,
              averageFps: fpsValues.reduce((sum, value) => sum + value, 0) / Math.max(fpsValues.length, 1),
              longFrames,
              severeFrames,
              maxFrameMs: filtered.length ? Math.max(...filtered) : 0,
              p95FrameMs: 0,
              p99FrameMs: 0,
            };
            return { filtered, summary };
          }
        };
      })();
    `,
  })

  await cdp.send('Tracing.start', {
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.layers',
      'disabled-by-default-v8.cpu_profiler',
      'gpu',
      'blink.user_timing',
    ].join(','),
    options: 'sampling-frequency=10000',
    transferMode: 'ReportEvents',
  })

  await sleep(1800)

  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const steps = 180;
        let step = 0;

        return new Promise((resolve) => {
          function tick() {
            step += 1;
            const progress = step / steps;
            window.scrollTo({ top: maxScroll * progress, behavior: 'instant' });
            if (step < steps) {
              requestAnimationFrame(tick);
            } else {
              resolve(true);
            }
          }
          tick();
        });
      })();
    `,
    awaitPromise: true,
  })

  await sleep(600)

  const viewport = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({ width: window.innerWidth, height: window.innerHeight }))()`,
    returnByValue: true,
  })

  const width = viewport.result.value.width
  const height = viewport.result.value.height
  const hoverPoints = [
    [width * 0.62, height * 0.42],
    [width * 0.54, height * 0.58],
    [width * 0.46, height * 0.48],
    [width * 0.57, height * 0.35],
  ]

  for (const [x, y] of hoverPoints) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      buttons: 0,
    })
    await sleep(220)
  }

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: width * 0.54,
    y: height * 0.48,
    button: 'left',
    clickCount: 1,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: width * 0.54,
    y: height * 0.48,
    button: 'left',
    clickCount: 1,
  })

  await sleep(1200)

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: width * 0.16,
    y: height * 0.18,
    button: 'left',
    clickCount: 1,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: width * 0.16,
    y: height * 0.18,
    button: 'left',
    clickCount: 1,
  })

  await sleep(800)

  await cdp.send('Runtime.evaluate', {
    expression: `window.__codexPerf.markStop();`,
  })

  await cdp.send('Tracing.end')
  await new Promise((resolve) => {
    traceResolve = resolve
  })

  const frameData = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const snapshot = window.__codexPerf.getSnapshot();
        const filtered = snapshot.filtered;
        const sorted = [...filtered].sort((a, b) => a - b);
        const percentile = (ratio) => {
          if (!sorted.length) return 0;
          const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
          return sorted[index];
        };
        snapshot.summary.p95FrameMs = percentile(0.95);
        snapshot.summary.p99FrameMs = percentile(0.99);
        return snapshot.summary;
      })();
    `,
    returnByValue: true,
  })

  const traceSummary = summarizeTrace(traceEvents)

  return {
    frameSummary: frameData.result.value,
    traceSummary,
  }
}

async function main() {
  await ensureBuildExists()
  const server = await startStaticServer()
  const chrome = await launchChrome()

  const cleanup = async () => {
    await new Promise((resolve) => server.close(resolve))
    if (!chrome.killed) {
      spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    }
  }

  const socket = await connectToPageTarget(DEBUG_PORT)
  const cdp = createCdpClient(socket)

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  if (socket.readyState !== WebSocket.OPEN) {
    await ready
  }

  const report = await measureScene(cdp)
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2))

  const summary = {
    ...report.frameSummary,
    traceSummary: report.traceSummary,
  }

  console.log(JSON.stringify(summary, null, 2))
  socket.close()
  await cleanup()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

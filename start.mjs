#!/usr/bin/env node
// vRain Web 启动脚本 (cross-platform)
// 用法:
//   node start.mjs                    # 生产模式 (构建后)
//   node start.mjs --dev              # 开发模式 (后端带 watch)
//   node start.mjs --port 3100 --backend-port 8180

import { execSync, spawn } from "child_process";
import { readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ── 配置 ────────────────────────────────────────────────
const DEFAULT_VITE_PORT = 3000;
const DEFAULT_BACKEND_PORT = 8080;

let vitePort = DEFAULT_VITE_PORT;
let backendPort = DEFAULT_BACKEND_PORT;
let isDev = false;

// 命令行覆盖
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    vitePort = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--backend-port" && args[i + 1]) {
    backendPort = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--dev") {
    isDev = true;
  }
}

// 读取 .env.local
try {
  const envRaw = readFileSync(join(__dirname, ".env.local"), "utf-8");
  for (const line of envRaw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (key.trim() === "VITE_PORT") vitePort = parseInt(value, 10) || vitePort;
    if (key.trim() === "PORT") backendPort = parseInt(value, 10) || backendPort;
  }
} catch {
  // no .env.local, use defaults
}

// ── 端口检测 ─────────────────────────────────────────────
function checkPort(port) {
  try {
    execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      stdio: "ignore",
      shell: true,
    });
    return false; // in use
  } catch {
    return true; // free
  }
}

console.log("");
console.log("  +---------------------------------------+");
console.log("  |       vRain Web Dev Server Starting    |");
console.log("  +---------------------------------------+");
console.log("");
console.log("  Checking ports...");
console.log("");

let viteConflict = !checkPort(vitePort);
let backendConflict = !checkPort(backendPort);

if (viteConflict) {
  console.log(`  [CONFLICT] Port ${vitePort} is in use`);
}
if (backendConflict) {
  console.log(`  [CONFLICT] Port ${backendPort} is in use`);
}

if (viteConflict || backendConflict) {
  console.log("");
  if (viteConflict) {
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question(`  New frontend port (Enter to use ${vitePort} + 1): `, (r) => {
        rl.close();
        resolve(r.trim());
      });
    });
    if (answer) {
      const n = parseInt(answer, 10);
      if (!isNaN(n) && n > 0) vitePort = n;
    } else {
      vitePort += 1;
    }
  }
  if (backendConflict) {
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question(`  New backend port (Enter to use ${backendPort} + 1): `, (r) => {
        rl.close();
        resolve(r.trim());
      });
    });
    if (answer) {
      const n = parseInt(answer, 10);
      if (!isNaN(n) && n > 0) backendPort = n;
    } else {
      backendPort += 1;
    }
  }
}

console.log("");
console.log(`  Frontend:  http://localhost:${vitePort}`);
console.log(`  Backend:   http://localhost:${backendPort}`);
console.log("");
console.log("  Starting dev servers...");
console.log("");

// ── 启动 ─────────────────────────────────────────────────
// 直接 spawn 两个子进程，各自设置正确的端口环境变量
// 绕过 npm / concurrently 的环境传递问题

// 直接调用入口 JS，避开 npx/cmd.exe，实现干净 Ctrl+C
// npm workspaces 会把包 hoist 到根 node_modules，所以尝试多个位置
function resolveBin(p) {
  const tryPaths = [
    join(__dirname, "node_modules", p),
    join(__dirname, "frontend", "node_modules", p),
    join(__dirname, "backend", "node_modules", p),
  ];
  for (const full of tryPaths) {
    try { if (statSync(full).isFile()) return full; } catch {}
  }
  throw new Error(`Cannot find binary: ${p} (tried ${tryPaths.length} paths)`);
}

const frontendBin = resolveBin("vite/bin/vite.js");
const backendBin = resolveBin("tsx/dist/cli.mjs");

const frontendProc = spawn(
  "node",
  [frontendBin, "--port", String(vitePort)],
  {
    stdio: "inherit",
    cwd: join(__dirname, "frontend"),
    shell: false,  // 关键：不启动 cmd.exe，避免 Windows 批处理提示
    env: { ...process.env, VITE_BACKEND_PORT: String(backendPort) },
  },
);

const backendProc = spawn(
  "node",
  [backendBin, ...(isDev ? ["watch", "backend/src/app.ts"] : ["backend/src/app.ts"])],
  {
    stdio: "inherit",
    cwd: __dirname,
    shell: false,
    env: { ...process.env, PORT: String(backendPort) },
  },
);

// 保持进程存活
frontendProc.on("error", (err) => console.error("Frontend error:", err.message));
backendProc.on("error", (err) => console.error("Backend error:", err.message));

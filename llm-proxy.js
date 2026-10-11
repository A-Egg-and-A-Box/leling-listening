/**
 * 大模型接口本地代理（零依赖，Node 18+）
 *
 * 用途：个别服务商（如 Kimi）的 API 不允许浏览器直接跨域调用。
 *      用这个脚本在本机转发一次即可，不必改动页面逻辑。
 *
 * 用法：
 *   UPSTREAM=https://api.moonshot.ai/v1 node llm-proxy.js
 *   （默认上游就是 Kimi；换成 DeepSeek / 豆包等，只需改 UPSTREAM）
 *
 * 然后把页面上「AI 引导设置」里的「接口地址」填成：
 *   http://127.0.0.1:8787/chat/completions
 * API Key 照常填服务商的 Key。代理只做原样透传，不存储、不落盘。
 *
 * 注：本文件只服务于「自备密钥的 AI 引导」这一可选项，
 *     页面主体（搜曲、B 站内嵌播放、内置引导脚本）完全不需要它。
 */
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8787;
const UPSTREAM = (process.env.UPSTREAM || 'https://api.moonshot.ai/v1').replace(/\/+$/, '');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

function pipe(req, res) {
  const u = new URL(UPSTREAM + (req.url.startsWith('/') ? req.url : '/' + req.url));
  const mod = u.protocol === 'https:' ? https : http;
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;

  const proxyReq = mod.request(u, { method: req.method, headers }, upstream => {
    res.writeHead(upstream.statusCode || 502, Object.assign({ 'Content-Type': 'application/json' }, CORS));
    upstream.pipe(res);
  });
  proxyReq.on('error', e => {
    res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, CORS));
    res.end(JSON.stringify({ error: { message: '代理转发失败：' + e.message } }));
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  pipe(req, res);
}).listen(PORT, () => {
  console.log('大模型代理已启动：http://127.0.0.1:' + PORT + '/chat/completions');
  console.log('转发到上游：' + UPSTREAM);
});
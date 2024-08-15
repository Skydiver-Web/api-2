import express from 'express'
import basicAuth from 'express-basic-auth'
import http from 'node:http'
import { createBareServer } from '@tomphttp/bare-server-node'
import { fileURLToPath } from "url";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import serveStatic from "serve-static";
import path from 'node:path'
import cors from 'cors'
import config from './config.js'

const __dirname = process.cwd()
const server = http.createServer()
const app = express(server)
const bareServer = createBareServer('/bare/')
const PORT = process.env.PORT || 8080

if (config.challenge) {
  console.log('Password protection is enabled. Usernames are: ' + Object.keys(config.users))
  console.log('Passwords are: ' + Object.values(config.users))

  app.use(
    basicAuth({
      users: config.users,
      challenge: true,
    })
  )
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(path.join(__dirname, 'static')))

if (config.routes !== false) {
  const routes = [
    { path: '/', file: 'index.html' },
    { path: '/home', file: 'index.html' },
    { path: '/gyat', file: 'index.html' },
    { path: '/games', file: 'games.html' },
    { path: '/games/roblox', file: 'games.html' },
    { path: '/ai', file: 'ai.html' },
    { path: '/play/roblox-corporation/5349/roblox', file: 'games.html' },
    { path: '/lol', file: '/lol/index.html' },
    { path: '/referrals', file: '/referrals/index.html' },
    { path: '/ref', file: '/referrals/index.html' },
  ];

  routes.forEach((route) => {
    app.get(route.path, (req, res) => {
      res.sendFile(path.join(__dirname, 'static', route.file))
    })
  })
}

app.get('/edu/*', cors({ origin: false }), async (req, res, next) => {
  try {
    const reqTarget = `https://raw.githubusercontent.com/Skydiver-Web/Skydiver-Web/main/${req.params[0]}`;
    const asset = await fetch(reqTarget);
    
    if (asset.ok) {
      const data = await asset.arrayBuffer();
      res.end(Buffer.from(data));
    } else {
      next();
    }
  } catch (error) {
    console.error('Error fetching:', error);
    next(error);
  }
});


const fetchData = async (req, res, next, baseUrls) => {
  try {
    const reqTarget = baseUrls.map((baseUrl) => `${baseUrl}/${req.params[0]}`)
    let data
    let asset

    for (const target of reqTarget) {
      asset = await fetch(target)
      if (asset.ok) {
        data = await asset.arrayBuffer()
        break
      }
    }

    if (data) {
      res.end(Buffer.from(data))
    } else {
      res.status(404).send()
    }
  } catch (error) {
    console.error(`Error fetching ${req.url}:`, error)
    res.status(500).send()
  }
}

app.get('*', (req, res) => {
  res.status(404).send();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send();
});

server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res)
  } else {
    app(req, res)
  }
})

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head)
  } else {
    socket.end()
  }
})

server.on('listening', () => {
  console.log(`Running at http://localhost:${PORT}`)
})

server.listen({
  port: PORT,
})

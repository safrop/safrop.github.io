import { useEffect, useState } from 'react';
import { HashRouter as Router, Navigate, useRoutes, Outlet } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Button, TextField, Grid, Stack } from "@mui/material";
import { Podcasts, Block, Upload, Download } from '@mui/icons-material';
import { observer } from './store'

const url = new URL("https://safrop.zk524gg.workers.dev")
// const url = new URL("http://localhost:8787")
const buffer2hex = (b) => Array.from(new Uint8Array(b)).map((b) => b.toString(16).padStart(2, '0')).join('')
const hex2buffer = (s) => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16))).buffer
const sha256buffer = (data) => crypto.subtle.digest('SHA-256', new TextEncoder('utf8').encode(data))
const sha256 = (data) => sha256buffer(data).then(buffer2hex)
const enc = (pub, data) => crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, new TextEncoder().encode(data))
const dec = (pri, data) => crypto.subtle.decrypt({ name: "RSA-OAEP" }, pri, data).then((data) => new TextDecoder().decode(data))
const genPub = (n) => crypto.subtle.importKey('jwk', { "alg": "RSA-OAEP-256", "e": "AQAB", "ext": true, "key_ops": ["encrypt"], "kty": "RSA", n }, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"])
const genKey = () => crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"])
  .then(async ({ privateKey, publicKey }) => ([privateKey, (await crypto.subtle.exportKey('jwk', publicKey))['n']]))

const App = observer(() => {
  const [ws, WS] = useState({})
  const [k, K] = useState('')
  const [v, V] = useState('')
  const [m, M] = useState([void 0, '', ''])
  const [u, U] = useState([void 0, ''])
  const [connected, setConnected] = useState(false)

  const websocket = async () => {
    url.protocol = "wss"
    url.pathname = "ws"
    const ws = new WebSocket(url)
    ws.addEventListener("open", () => setConnected(true) || sha256(m[1]).then(k => ws.send(k)))
    ws.addEventListener("close", () => setConnected(false))
    ws.addEventListener("message", ({ data }) => dec(m[0], hex2buffer(data)).then(V))
    WS(ws)
  }
  useEffect(() => { genKey().then(async ([pri, pub]) => M([pri, pub, await sha256(pub)])) }, [])

  return useRoutes([{
    path: '/', element:
      <Dialog open fullWidth>
        <DialogTitle display='flex' flexWrap="wrap" sx={{ pb: 0, px: 2 }}>
          {connected ?
            <IconButton onClick={() => ws.close()} children={<Block color='primary' />} /> :
            <IconButton onClick={() => websocket()} children={<Podcasts color='primary' />} />}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: "column", alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1/1' }} children={<Outlet />} />
        </DialogContent>
      </Dialog>,
    children: [
      {
        path: '', element: <Stack direction={'column'} width={'100%'} height={'100%'} spacing={2} mt={2}>
          <TextField label='k' value={k} onChange={({ target }) => K(target.value)} />
          <TextField label='v' rows={6} multiline value={v} onChange={({ target }) => V(target.value)} />

          <Stack>
            <span style={{ fontSize: "12px" }}>M: {m[2]}</span>
            <span style={{ fontSize: "12px" }}>U: {u[1]}</span>
          </Stack>

          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Key'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "up"
              fetch(url, { method: 'POST', body: JSON.stringify({ k, v: m[1] }) })
                .then(async () => alert(`UPLOADED: ${await sha256(m[1])}`))
                .catch(e => console.log(e))
            }} />
            <Button fullWidth children={'Download Key'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "dn"
              fetch(url, { method: 'POST', body: JSON.stringify({ k }) })
                .then(async (data) => {
                  const pub = await data.text()
                  U([await genPub(pub), await sha256(pub)])
                  alert(`DOWNLOADED: ${await sha256(pub)}`)
                }).catch(e => console.log(e))
            }} />
          </Stack>

          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Public'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "up"
              fetch(url, { method: 'POST', body: JSON.stringify({ k, v }) })
                .then(() => alert(`UPLOADED: ${k}=${v}`))
                .catch(e => console.log(e))
            }} />
            <Button fullWidth children={'Download Public'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "dn"
              fetch(url, { method: 'POST', body: JSON.stringify({ k }) })
                .then(d => d.text())
                .then(V)
                .catch(e => console.log(e))
            }} />
          </Stack>

          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Secret'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "up"
              enc(u[0], v)
                .then(v => fetch(url, { method: 'POST', body: JSON.stringify({ k: u[1], v: buffer2hex(v) }) }))
                .then(() => console.log(`Sent to ${u[1]}`))
                .catch(e => console.log(e))
            }} />
            <Button fullWidth children={'Download Secret'} variant='contained' onClick={() => {
              url.protocol = "https"
              url.pathname = "dn"
              sha256(m[1])
                .then(k => fetch(url, { method: 'POST', body: JSON.stringify({ k }) }))
                .then(d => d.text())
                .then(d => dec(m[0], hex2buffer(d)))
                .then(V)
                .catch(e => console.log(e))
            }} />
          </Stack>
        </Stack>
      },
    ]
  },
  { path: '*', element: <Navigate to="/" /> },
  ])
})

export default () => <Router children={<App />} />
const response = (body, status = { status: 200 }) => {
  const res = new Response(body, status)
  res.headers.set('Access-Control-Allow-Origin', "*")
  return res
}
addEventListener('fetch', (e) => e.respondWith((async () => {
  let params = {}
  switch (new URL(e.request.url).pathname) {
    case '/up_file':
      params.data = await e.request.arrayBuffer()
      params.keylength = new Uint8Array(params.data.slice(0, 1))[0]
      params.key = params.data.slice(1, params.keylength + 1)
      params.keyname = new TextDecoder().decode(params.key)
      await safrop.put(params.keyname, params.data.slice(params.keylength + 1))
      return response(params.keyname)
    case '/dn_file':
      params = await e.request.json()
      return safrop.get(params['k'], { type: 'arrayBuffer' }).then((v) => {
        return response(v)
      })
    case '/up':
      params = await e.request.json()
      if (await safrop.get(params['k']) && params['k'].length < 32) return response('Existed', { status: 401 })
      await safrop.put(params['k'], params['v'], { expirationTtl: 300 })
      return response(params['k'])
    case '/dn':
      params = await e.request.json()
      return safrop.get(params['k']).then((v) => {
        // params['peek'] || await safrop.delete(params['k'])
        return response(v)
      })
    case '/ws':
      if (e.request.headers.get("Upgrade") !== "websocket") return response("Expected websocket", { status: 400 })
      const [webSocket, server] = Object.values(new WebSocketPair())
      return Promise.resolve(server).then((w) => {
        server.accept()
        server.addEventListener("close", () => w.close())
        server.addEventListener("message", ({ data }) => {
          safrop.put(data, false, { expirationTtl: 60 }).then(() => {
            let count = 60
            const timer = setInterval(() => safrop.get(data).then((v) => {
              switch (v) {
                case 'true':
                  return safrop.delete(data).then(() => (clearInterval(timer), w.send(true), w.close()))
                case 'false':
                  return w.send(count -= 1)
                default:
                  clearInterval(timer), w.close()
              }
            }), 1000)
          })
        })
      }).then(() => response(null, { status: 101, webSocket }))
    default:
      return response("safrop")
  }
})()))

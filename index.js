const response = (body, status = { status: 200 }) => {
  const res = new Response(body, status)
  res.headers.set('Access-Control-Allow-Origin', "*")
  return res
}
addEventListener('fetch', (e) => e.respondWith((async () => {
  let params = {}
  switch (new URL(e.request.url).pathname) {
    case '/up':
      params = await e.request.json()
      if (await safrop.get(params['k']) && params['k'].length < 32) return response('Existed', { status: 401 })
      await safrop.put(params['k'], params['v'], { expirationTtl: 60 })
      return response(params['k'])
    case '/dn':
      params = await e.request.json()
      return response(await safrop.get(params['k']))
    case '/ws':
      if (e.request.headers.get("Upgrade") !== "websocket") return response("Expected websocket", { status: 400 })
      const [webSocket, server] = Object.values(new WebSocketPair())
      return Promise.resolve(server).then((w) => {
        let count = 0
        server.accept()
        server.addEventListener("close", () => w.close())
        server.addEventListener("message", async ({ data }) => {
          const timer = setInterval(() => {
            if (count > 60) {
              clearInterval(timer)
              w.close()
            }
            safrop.get(data).then((v)=>{
              if (v) {
                clearInterval(timer)
                w.send(v)
                w.close()
              }
            })
            count += 1
          }, 1000)
        })
      }).then(() => response(null, { status: 101, webSocket }))
    default:
      return response("safrop")
  }
})()))

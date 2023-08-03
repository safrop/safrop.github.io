import { makeAutoObservable, runInAction } from 'mobx';
export { observer } from 'mobx-react-lite';

const buffer2hex = (b) => Array.from(new Uint8Array(b)).map((b) => b.toString(16).padStart(2, '0')).join('')
const hex2buffer = (s) => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16))).buffer
const sha256buffer = (data) => crypto.subtle.digest('SHA-256', new TextEncoder('utf8').encode(data))
const sha256 = (data) => sha256buffer(data).then(buffer2hex)
const enc = (pub, data) => crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, new TextEncoder().encode(data))
const dec = (pri, data) => crypto.subtle.decrypt({ name: "RSA-OAEP" }, pri, data).then((data) => new TextDecoder().decode(data))
const genPub = (n) => crypto.subtle.importKey('jwk', { "alg": "RSA-OAEP-256", "e": "AQAB", "ext": true, "key_ops": ["encrypt"], "kty": "RSA", n }, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"])
const genKey = () => crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"])
	.then(async ({ privateKey, publicKey }) => ([privateKey, (await crypto.subtle.exportKey('jwk', publicKey))['n']]))

// const url = new URL("https://safrop.zk524gg.workers.dev")
const url = new URL("http://localhost:8787")
const ssl = false
const r = async (pathname, data) => {
	[url.protocol, url.pathname] = [ssl ? 'https' : 'http', pathname]
	return fetch(url, { method: 'POST', body: JSON.stringify(data) }).then(_ => _.text())
}



class Store {
	K = ''
	V = ''
	M = [void 0, '', '']
	U = [void 0, '']
	W = void 0
	connected = false
	constructor() {
		makeAutoObservable(this);
		genKey().then(([pri, pub]) => runInAction(async () => (this.M = [pri, pub, await sha256(pub)])))
	}
	set = (k, v) => runInAction(() => (this[k] = v))
	set_pubkey = async (_) => this.set('U', [await genPub(_), await sha256(_)])
	conn = (ok) => {
		if (ok) runInAction(() => {
			[url.protocol, url.pathname] = [ssl ? 'wss' : 'ws', 'ws']
			this.W = new WebSocket(url)
			this.W.addEventListener("open", () => this.set('connected', true) && this.W.send(this.M[2]))
			this.W.addEventListener("close", () => this.set('connected', false))
			this.W.addEventListener("message", ({ data }) => dec(this.M[0], hex2buffer(data)).then(_ => this.set('V', _)))
		})
		else {
			this.W.close()
			this.set('connected', false)
		}
	}
	up_pub = (k, v) => r('up', { k, v })
	dn_pub = (k) => r('dn', { k })
	up_sec = (v) => enc(this.U[0], v).then(buffer2hex).then((v) => r('up', { k: this.U[1], v }))
	dn_sec = () => r('dn', { k: this.M[2] }).then(_ => dec(this.M[0], hex2buffer(_))).then(_ => this.set('V', _))
}
export default new Store();
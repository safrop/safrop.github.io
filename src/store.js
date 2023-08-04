import { makeAutoObservable, runInAction } from 'mobx';
export { observer } from 'mobx-react-lite';

const CFG = {}
switch (window.location.host) {
	case '127.0.0.1':
	case 'localhost':
		CFG['url'] = new URL("http://localhost:8787")
		CFG['ssl'] = false
	default:
		CFG['url'] = new URL("https://safrop.zk524gg.workers.dev")
		CFG['ssl'] = true
}

const r = async (pathname, data) => {
	[CFG['url'].protocol, CFG['url'].pathname] = [CFG['ssl'] ? 'https' : 'http', pathname]
	return fetch(CFG['url'], { method: 'POST', body: JSON.stringify(data) }).then(_ => _.text())
}
const buffer2hex = (b) => Array.from(new Uint8Array(b)).map((b) => b.toString(16).padStart(2, '0')).join('')
const hex2buffer = (s) => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16))).buffer
const sha256buffer = (data) => crypto.subtle.digest('SHA-256', new TextEncoder('utf8').encode(data))
const sha256 = (data) => sha256buffer(data).then(buffer2hex)
const enc = (pub, data) => crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, new TextEncoder().encode(data))
const dec = (pri, data) => crypto.subtle.decrypt({ name: "RSA-OAEP" }, pri, data).then((data) => new TextDecoder().decode(data))
const genPub = (n) => crypto.subtle.importKey('jwk', { "alg": "RSA-OAEP-256", "e": "AQAB", "ext": true, "key_ops": ["encrypt"], "kty": "RSA", n }, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"])
const genKey = () => crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"])
	.then(async ({ privateKey, publicKey }) => ([privateKey, (await crypto.subtle.exportKey('jwk', publicKey))['n']]))

class Store {
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
			[CFG['url'].protocol, CFG['url'].pathname] = [CFG['ssl'] ? 'wss' : 'ws', 'ws']
			this.W = new WebSocket(CFG['url'])
			this.W.addEventListener("open", () => this.set('connected', true) && this.W.send(this.M[2]))
			this.W.addEventListener("close", () => this.set('connected', false))
			this.W.addEventListener("message", ({ data }) => dec(this.M[0], hex2buffer(data)).then(_ => this.set('V', _)))
		})
		else {
			this.W.close()
			this.set('connected', false)
		}
	}
	up_pub = (k, v) => k ? r('up', { k, v }) : Promise.reject("Empty Key")
	dn_pub = (k, peek) => k ? r('dn', { k, peek }) : Promise.reject("Empty Key")
	up_sec = (v) => v ? enc(this.U[0], v).then(buffer2hex).then((v) => r('up', { k: this.U[1], v })) : Promise.reject("Empty Value")
	dn_sec = () => r('dn', { k: this.M[2] }).then(_ => _ ? dec(this.M[0], hex2buffer(_)) : _)
}
export default new Store();
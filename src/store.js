export { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { BrowserQRCodeReader } from '@zxing/browser';
import { toDataURL } from 'qrcode';

const CFG = { http: new URL('https://safrop.zk524gg.workers.dev'), ws: new URL('wss://safrop.zk524gg.workers.dev/ws') };
['localhost', '127.0.0.1'].includes(location.hostname) && ([CFG.http, CFG.ws] = [new URL('http://localhost:8787'), new URL('ws://localhost:8787/ws')])
const request = async (pathname, data) => {
    CFG.http.pathname = pathname
    return fetch(CFG.http, { method: 'POST', body: JSON.stringify(data) }).then(_ => _.text())
}
const buffer2hex = (_) => Array.from(new Uint8Array(_)).map((_) => _.toString(16).padStart(2, '0')).join('')
const hex2buffer = (_) => new Uint8Array(_.match(/../g).map(h => parseInt(h, 16))).buffer
const sha256 = (_) => crypto.subtle.digest('SHA-256', new TextEncoder('utf8').encode(_)).then(buffer2hex)
const enc = (pub, data) => crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, new TextEncoder().encode(data))
const dec = (pri, data) => crypto.subtle.decrypt({ name: "RSA-OAEP" }, pri, data).then((_) => new TextDecoder().decode(_))

class Store {
    qreader = new BrowserQRCodeReader(new Map().set(2, [11]), { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 100 })
    qrindex = 0
    qrcode = ['']
    qrdata = ['']
    qrsrc = ''
    input = ''
    shareAnchor = null
    dropAnchor = null
    loading = false
    scanner = false
    scanmode = 'environment'
    key1 = [void 0, '', '']
    key2 = [void 0, '']
    constructor() {
        makeAutoObservable(this);
        this.set_key1()
    }
    set = (o) => {
        runInAction(() => Object.keys(o).forEach((k) => this[k] = o[k]))
    }
    init = (o = {}) => {
        this.set({ qrindex: 0, qrcode: [''], qrdata: [''], qrsrc: '', input: '', scanner: false, loading: false, ...o })
    }
    scan = () => {
        this.init({ scanner: true })
        const promise = this.qreader.decodeFromConstraints({ video: { facingMode: this.scanmode, width: 600, height: 600 } }, document.querySelector('video'), (i) => i && (this.setInput(i.getText()), this.toggleScan(0)))
        return () => { promise.then((s) => s.stop()) }
    }
    setInput = (i) => {
        this.init({ input: i })
        if (i !== '') {
            const qrdata = i.match(/[^]{2048}|[^]+/g)
            const qrcode = qrdata.map((v) => toDataURL(v, { margin: 1, scale: 16 }))
            Promise.all(qrcode).then((qrcode) => this.set({ qrcode, qrdata, qrsrc: qrcode[0] }))
        } else this.qrsrc = ''
    }
    setIndex = (i) => {
        this.set({ qrindex: i, qrsrc: this.qrcode[i], input: this.qrdata[i] })
    }
    toggleScan = (off) => {
        if (off === 0 || this.scanner) (this.scanner = false, location.hash = '/')
        else (this.scanner = true, location.hash = '/scan')
    }
    switchScan = () => {
        Promise.resolve(location.hash = '/')
            .then(() => this.scanmode = this.scanmode === 'environment' ? 'user' : 'environment')
            .then(() => location.hash = '/scan')
    }
    toggleShare = (anchor = null) => {
        this.set({ shareAnchor: this.shareAnchor ? null : anchor })
    }
    copy = () => {
        navigator.clipboard.writeText(this.input)
    }
    paste = () => {
        navigator.clipboard.readText().then(this.setInput)
    }
    upload = (files) => {
        this.init()
        if (this.scanner) this.toggleScan()
        for (const file of files) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => Promise.resolve((e.target).result).then((qrsrc) =>
                this.qreader.decodeFromImageUrl(qrsrc).then((d) => d.getText()).catch(() => 'invalid').then((input) => this.qrcode[0]
                    ? this.set({ qrcode: [...this.qrcode, qrsrc], qrdata: [...this.qrdata, input], qrsrc: this.qrcode[0], input: this.qrdata[0] })
                    : this.set({ qrcode: [qrsrc], qrdata: [input], qrsrc, input })))
        }
    }
    download = () => {
        let a = document.createElement("a")
        if (this.qrsrc) (a.download = 'qrcode.png', a.href = this.qrsrc, a.click())
        a = null
    }
    __share__ = (src, index = 0) => {
        const [mime, data] = src.split(",")
        const bstr = Buffer.from(data, 'base64').toString('latin1')
        return new File([new Uint8Array(bstr.length).map((_, i) => bstr.charCodeAt(i))], `qrcode${index}.png`, { type: mime.match(/:(.*?);/)?.[1] })
    }
    share = (type) => {
        this.set({ shareAnchor: null })
        if (!this.qrsrc) return
        switch (type) {
            case 'text': return navigator.share({ text: this.input })
            case 'file': return navigator.share({ files: [this.__share__(this.qrsrc)] })
            case 'files': return navigator.share({ files: this.qrcode.map(this.__share__) })
            default: return
        }
    }

    set_key1 = () => crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"])
        .then(async ({ privateKey, publicKey }) => ([privateKey, (await crypto.subtle.exportKey('jwk', publicKey))['n']]))
        .then(async ([pri, pub]) => this.set({ key1: [pri, pub, await sha256(pub)] }))
    set_key2 = (n) => crypto.subtle.importKey('jwk', { "alg": "RSA-OAEP-256", "e": "AQAB", "ext": true, "key_ops": ["encrypt"], "kty": "RSA", n }, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"])
        .then(_ => this.set({ key2: [_, ''] }))
        .then(() => sha256(n))
        .then(_ => this.set({ key2: [this.key2[0], _] }))
    up_pub = (k, v) => k ? request('up', { k, v }) : Promise.reject("Empty Key")
    dn_pub = (k, peek) => k ? request('dn', { k, peek }) : Promise.reject("Empty Key")
    up_sec = (v) => v ? enc(this.key2[0], v).then(buffer2hex).then((v) => request('up', { k: this.key2[1], v })) : Promise.reject("Empty Value")
    dn_sec = () => request('dn', { k: this.key1[2] }).then(_ => _ ? dec(this.key1[0], hex2buffer(_)) : _)
    conn = async () => {
        const ws = new WebSocket(CFG['ws'])
        ws.addEventListener("open", () => ws.send(this.key1[2]))
        ws.addEventListener("close", () => this.input.includes('connecting') && this.set({ input: 'Connection timed out!' }))
        ws.addEventListener("message", ({ data }) => this.set({ input: data === 'true' ? `Connected! ID: ${this.key1[2].slice(0, 32)}` : `connecting...(${data})` }))
    }
    toggleDrop = (anchor = null) => {
        this.set({ dropAnchor: this.dropAnchor ? null : anchor })
    }
    up_file = ([file]) => {
        CFG.http.pathname = 'up_file'
        const reader = new FileReader()
        reader.readAsArrayBuffer(file)
        reader.onload = (e) => Promise.resolve((e.target).result).then((data) => {
            const key = prompt("Input a key to upload the file")
            if (!key) return
            const keyname = new TextEncoder().encode(key)
            const filename = new TextEncoder().encode(file.name)
            const [l1, l2] = [keyname.length, filename.length]
            const [l1b, l2b] = [new Uint8Array([l1]), new Uint8Array([l2])]
            const body = new Uint8Array(2 + l1 + l2 + data.byteLength)
            body.set(l1b), body.set(keyname, 1)
            body.set(l2b, l1 + 1), body.set(filename, l1 + 2)
            body.set(new Uint8Array(data), l1 + l2 + 2)
            fetch(CFG.http, { method: 'POST', body }).then(_ => _.text()).then(()=>alert("Uploaded!"))
        })
    }
    dn_file = () => {
        const k = prompt("Input a key to download the file")
        if (!k) return
        CFG.http.pathname = 'dn_file'
        fetch(CFG.http, { method: 'POST', body: JSON.stringify({ k }) }).then(_ => _.arrayBuffer()).then((data) => {
            const length = new Uint8Array(data.slice(0, 1))[0]
            const name = data.slice(1, length + 1)
            const filename = new TextDecoder().decode(name)
            let a = document.createElement("a")
            a.download = filename
            a.href = URL.createObjectURL(new File([data.slice(length + 1)], filename))
            a.click(), a = null
        })
    }
}
export default new Store();
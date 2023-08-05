import { useEffect } from "react";
import { HashRouter as Router, Navigate, useRoutes, Outlet } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, Input, IconButton, Box, ClickAwayListener, MenuList, MenuItem, Popover } from "@mui/material";
import { Send, QrCodeScanner, Share, Cameraswitch, ContentCopy, Download, Upload, KeyboardArrowLeft, KeyboardArrowRight, Camera, ContentPaste, HighlightOff, HourglassTop } from '@mui/icons-material';
import store, { observer } from './store'

const path = window.location.pathname;
['/scan'].includes(path) && (window.location.href = '/#' + path)
navigator.serviceWorker.addEventListener("message", ({ data }) => store.upload(data.files));

const Scan = () => {
    useEffect(store.scan, [])
    return <Box><video style={{ width: '100%' }} /></Box>
}

const QR = observer(() => {
    const { qrcode, qrindex, qrsrc } = store
    return qrsrc
        ? <><img style={{ width: '100%' }} src={qrsrc} />
            {qrcode.length > 1 && <Box display='flex' alignItems='center'>
                <IconButton disabled={qrindex < 1} children={<KeyboardArrowLeft color={qrindex < 1 ? "disabled" : "primary"} fontSize='large' />} onClick={() => store.setIndex(qrindex - 1)} />
                {qrindex + 1} / {qrcode.length}
                <IconButton disabled={qrindex + 2 > qrcode.length} children={<KeyboardArrowRight color={qrindex + 2 > qrcode.length ? "disabled" : "primary"} fontSize='large' />} onClick={() => store.setIndex(qrindex + 1)} />
            </Box>}</>
        : <QrCodeScanner color='disabled' />
})

const ShareList = observer(() => <>
    <IconButton onClick={(e) => store.toggleShare(e.currentTarget)} children={<Share color='primary' />} />
    <Popover open={Boolean(store.shareAnchor)} anchorEl={store.shareAnchor} onClose={() => store.toggleShare()} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} children={
        <ClickAwayListener onClickAway={() => store.toggleShare()} children={
            <MenuList autoFocusItem children={['text', 'file', 'files'].map((type) => <MenuItem dense key={'share' + type} onClick={() => store.share(type)} children={type} />)} />} />} />
</>)

const Drop = observer(() => {
    const { input, key1, key2 } = store
    const onLongPress = (cb, c, b) => {
        const z = _ => (b && _.stopPropagation(), removeEventListener('click', z, true))
        const x = _ => (b = false, c = setTimeout(() => (cb(), b = true), 1000))
        const y = _ => (c && clearTimeout(c), addEventListener('click', z, true))
        return { onTouchStart: x, onMouseDown: x, onTouchEnd: y, onMouseUp: y }
    }
    return <><IconButton onClick={(e) => store.toggleDrop(e.currentTarget)} children={<Send color='primary' />} />
        <Popover open={Boolean(store.dropAnchor)} anchorEl={store.dropAnchor} onClose={() => store.toggleDrop()} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} children={
            <ClickAwayListener onClickAway={() => store.toggleDrop()} children={
                <MenuList autoFocusItem>
                    <MenuItem dense key={'up-key'} children={<><span className="material-icons">upload</span><span>My Public Key</span></>} onClick={() =>
                        store.up_pub(prompt("Input a simple key to upload"), key1[1]).then(() => alert(`Uploaded: ${key1[2].slice(0, 16)}`)).finally(store.toggleDrop)} />
                    <MenuItem dense key={'dn-key'} children={<><span className="material-icons">download</span><span>Other side Public Key</span></>} onClick={() =>
                        store.dn_pub(prompt("Input a given simple key to download other side public key")).then(store.set_key2).then(() => alert(`Downloaded: ${key2[1].slice(0, 16)}`)).finally(store.toggleDrop)} />
                    <MenuItem dense key={'up-pub'} children={<><span className="material-icons">upload</span><span>Public Value</span></>} onClick={() =>
                        store.up_pub(prompt("Input a key to upload your value without encryption"), input).then(() => alert(`Uploaded: ${input}`)).finally(store.toggleDrop)} disabled={!input} />
                    <MenuItem dense key={'dn-pub'} children={<><span className="material-icons">download</span><span>Public Value</span></>} onClick={() =>
                        store.dn_pub(prompt("Input a key to download other side value without encryption")).then(store.setInput).finally(store.toggleDrop)}
                        {...onLongPress(() => store.dn_pub(prompt("Input a key")).then(_ => setTimeout(() => navigator.clipboard.writeText(_), 333)).then(() => store.set({ input: 'Sent to clipboard' })).finally(store.toggleDrop))} />
                    <MenuItem dense key={'up-sec'} children={<><span className="material-icons">upload</span><span>Secret Value</span></>} onClick={() =>
                        store.up_sec(store.input).then(() => alert(`Sent to ${key2[1]}`)).finally(store.toggleDrop)} disabled={!key2[1] || !input} />
                    <MenuItem dense key={'dn-sec'} children={<><span className="material-icons">download</span><span>Secret Value</span></>} onClick={() =>
                        store.dn_sec().then(store.setInput).finally(store.toggleDrop)}
                        {...onLongPress(() => store.dn_sec().then(_ => setTimeout(() => navigator.clipboard.writeText(_), 333)).then(() => store.set({ input: 'Sent to clipboard' })).finally(store.toggleDrop))} />
                    <MenuItem dense key={'conn-1'} children={<><span className="material-icons">wifi</span><span>Connect From</span></>} onClick={() =>
                        store.conn().then(() => (store.setInput(key1[1]), store.toggleDrop()))} />
                    <MenuItem dense key={'conn-2'} children={<><span className="material-icons">wifi</span><span>Connect To</span></>} onClick={() => {
                        store.setInput(''), store.toggleDrop(), store.toggleScan()
                        const timer = setInterval(() => store.scanner || (clearInterval(timer), store.input && store.set_key2(store.input)
                            .then(() => store.up_pub(store.key2[1], true))
                            .then(() => store.set({ input: `Connected! ID: ${store.key2[1].slice(0, 32)}` }))), 500)
                    }} />
                </MenuList>} />} /></>
})

const App = observer(() => {
    const { input, scanner, loading } = store
    return useRoutes([{
        path: '/', element:
            <Dialog open fullWidth>
                <DialogTitle display='flex' flexWrap="wrap" sx={{ pb: 0, px: 2 }}>
                    <IconButton onClick={store.toggleScan} children={<Camera color={scanner ? 'secondary' : 'primary'} />} />
                    {scanner && <IconButton onClick={store.switchScan} children={<Cameraswitch color='primary' />} />}
                    <IconButton onClick={store.copy} children={<ContentCopy color='primary' />} />
                    <IconButton component="label" children={<><Upload color='primary' /><input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={({ target }) => (store.upload(target.files ?? []), target.value = '')} /></>} />
                    <IconButton onClick={store.download} children={<Download color='primary' />} />
                    <ShareList />
                    <Drop />
                </DialogTitle>
                <DialogContent>
                    <Input endAdornment={<IconButton sx={{ p: 0 }} onClick={input ? store.init : store.paste} children={input ? <HighlightOff /> : <ContentPaste />} />}
                        fullWidth multiline maxRows={4} sx={{ mb: 2 }} value={input} placeholder={'context'} onChange={(e) => store.setInput(e.target.value)} />
                    <Box sx={{ display: 'flex', flexDirection: "column", alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1/1' }} children={loading ? <HourglassTop color="primary" /> : <Outlet />} />
                </DialogContent>
            </Dialog>,
        children: [
            { path: '', element: <QR /> },
            { path: 'scan', element: <Scan /> },
        ]
    },
    { path: '*', element: <Navigate to="/" /> },
    ])
})

export default () => <Router children={<App />} />
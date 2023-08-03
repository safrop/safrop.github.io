import Store, { observer } from './store'
import { HashRouter as Router, Navigate, useRoutes, Outlet } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Button, TextField, Stack } from "@mui/material";
import { Podcasts, Block, Upload, Download, QrCodeScanner } from '@mui/icons-material';

const App = observer(() => {
  const { V, M, U, connected } = Store
  return useRoutes([{
    path: '/', element:
      <Dialog open fullWidth>
        <DialogTitle display='flex' flexWrap="wrap" sx={{ pb: 0, px: 2 }}>
          {connected ?
            <IconButton onClick={() => Store.conn(0)} children={<Block color='primary' />} /> :
            <IconButton onClick={() => Store.conn(1)} children={<Podcasts color='primary' />} />}
          <IconButton onClick={() => { }} children={<QrCodeScanner color='primary' />} />
          <IconButton onClick={() => Store.up_pub(prompt("Upload Your Public Key By A Simple Key:"), M[1]).then(() => alert(`UPLOADED: ${M[2].slice(0, 16)}`))} children={<Upload color='primary' />} />
          <IconButton onClick={() => Store.dn_pub(prompt("Download Other Side Public Key By A Simple Key:")).then(Store.set_pubkey)} children={<Download color='primary' />} />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: "column", alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1/1' }} children={<Outlet />} />
        </DialogContent>
      </Dialog>,
    children: [{
      path: '', element:
        <Stack direction={'column'} width={'100%'} height={'100%'} spacing={2} mt={2}>
          <Stack direction={'row'}>
            <span style={{ width: '100%' }}>M: {M[2].slice(0, 16)}</span>
            <span style={{ width: '100%' }}>U: {U[1].slice(0, 16) || 'None'}</span>
          </Stack>
          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Up-Pub'} variant='contained' onClick={() => Store.up_pub(prompt("Key:"), V).then(() => alert(`UPLOADED: ${V}`))} />
            <Button fullWidth children={'Dn-Pub'} variant='contained' onClick={() => Store.dn_pub(prompt("Key:")).then((_) => Store.set('V', _))} />
            <Button fullWidth children={'Up-Sec'} variant='contained' onClick={() => Store.up_sec(prompt("Value:")).then(() => alert(`Sent to ${U[1]}`))} disabled={!U[1]} />
            <Button fullWidth children={'Dn-Sec'} variant='contained' onClick={() => Store.dn_sec().then(_ => Store.set('V', _))} />
          </Stack>
          <TextField value={V} onChange={({ target }) => Store.set('V', target.value)} multiline minRows={3} />
        </Stack>
    }]
  },
  { path: '*', element: <Navigate to="/" /> },
  ])
})
export default () => <Router children={<App />} />
import Store, { observer } from './store'
import { HashRouter as Router, Navigate, useRoutes, Outlet } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Button, TextField, Stack } from "@mui/material";
import { Podcasts, Block } from '@mui/icons-material';

const App = observer(() => {
  const { K, V, M, U, connected } = Store
  return useRoutes([{
    path: '/', element:
      <Dialog open fullWidth>
        <DialogTitle display='flex' flexWrap="wrap" sx={{ pb: 0, px: 2 }}>
          {connected ?
            <IconButton onClick={() => Store.conn(0)} children={<Block color='primary' />} /> :
            <IconButton onClick={() => Store.conn(1)} children={<Podcasts color='primary' />} />}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: "column", alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1/1' }} children={<Outlet />} />
        </DialogContent>
      </Dialog>,
    children: [
      {
        path: '', element: <Stack direction={'column'} width={'100%'} height={'100%'} spacing={2} mt={2}>
          <TextField label='K' value={K} onChange={({ target }) => Store.set('K', target.value)} />
          <TextField label='V' value={V} onChange={({ target }) => Store.set('V', target.value)} rows={6} multiline />
          <Stack>
            <span>M: {M[2].slice(0, 16)}</span>
            <span>U: {U[1].slice(0, 16)}</span>
          </Stack>
          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Key'} variant='contained' onClick={() => Store.up_pub(K, M[1]).then(() => alert(`UPLOADED: ${M[2]}`))} />
            <Button fullWidth children={'Download Key'} variant='contained' onClick={() => Store.dn_pub(K).then(Store.set_pubkey)} />
          </Stack>
          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Public'} variant='contained' onClick={() => Store.up_pub(K, V).then(() => alert(`UPLOADED: ${K}=${V}`))} />
            <Button fullWidth children={'Download Public'} variant='contained' onClick={() => Store.dn_pub(K).then((_) => Store.set('V', _))} />
          </Stack>
          <Stack spacing={2} direction={'row'}>
            <Button fullWidth children={'Upload Secret'} variant='contained' onClick={() => Store.up_sec(V).then(() => alert(`Sent to ${U[1]}`))} />
            <Button fullWidth children={'Download Secret'} variant='contained' onClick={() => Store.dn_sec()} />
          </Stack>
        </Stack>
      },
    ]
  },
  { path: '*', element: <Navigate to="/" /> },
  ])
})
export default () => <Router children={<App />} />
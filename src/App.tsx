// import { useRef, useEffect } from "react";
import { HashRouter as Router, Navigate, useRoutes, Outlet } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, IconButton, Box } from "@mui/material";
import { Download } from '@mui/icons-material';
import { observer } from './store'

const App = observer(() => {
  return useRoutes([{
    path: '/', element:
      <Dialog open fullWidth>
        <DialogTitle display='flex' flexWrap="wrap" sx={{ pb: 0, px: 2 }}>
          <IconButton onClick={() => { }} children={<Download color='primary' />} />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: "column", alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1/1' }} children={<Outlet />} />
        </DialogContent>
      </Dialog>,
    children: [
      { path: '', element: <div>Helloworld</div> },
    ]
  },
  { path: '*', element: <Navigate to="/" /> },
  ])
})

export default () => <Router children={<App />} />
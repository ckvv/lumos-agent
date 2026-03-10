import { contextBridge } from 'electron'
import { API } from './api'

contextBridge.exposeInMainWorld('lumos', API)

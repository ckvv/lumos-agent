import App from '#renderer/App.vue'
import { i18n } from '#renderer/i18n'
import { router } from '#renderer/router'
import ui from '@nuxt/ui/vue-plugin'
import { createApp } from 'vue'
import '#renderer/shared/styles/main.css'

const app = createApp(App)

app.use(i18n)
app.use(router)
app.use(ui)
app.mount('#app')

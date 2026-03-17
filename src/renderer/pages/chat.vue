<script setup lang="ts">
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ChatWorkspaceView from '#renderer/components/chat/ChatWorkspaceView.vue'

definePage({
  meta: {
    requiresAuth: true,
    requiresProvider: true,
  },
  name: 'chat',
})
</script>

<template>
  <AuthenticatedFrame>
    <ChatWorkspaceView />
  </AuthenticatedFrame>
</template>

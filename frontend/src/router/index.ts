import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
  },
  {
    path: '/configurator',
    name: 'configurator',
    component: () => import('@/views/ConfiguratorView.vue'),
  },
  {
    path: '/configurator/:presetId',
    name: 'configurator-preset',
    component: () => import('@/views/ConfiguratorView.vue'),
    props: true,
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router


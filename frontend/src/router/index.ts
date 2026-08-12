import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/onboarding',
      component: OnboardingLayout,
      children: [
        {
          path: '',
          name: 'onboarding',
          component: () => import('@/pages/onboarding/OnboardingView.vue'),
        },
      ],
    },
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/home/HomeView.vue'),
        },
        {
          path: 'explore',
          name: 'explore',
          component: () => import('@/pages/explore/ExploreView.vue'),
        },
        {
          path: 'article/:slug',
          name: 'article',
          component: () => import('@/pages/article/ArticleView.vue'),
        },
        {
          path: 'write',
          name: 'write',
          component: () => import('@/pages/write/WriteView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/settings/SettingsView.vue'),
        },
      ],
    },
  ],
})

export default router

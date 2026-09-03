import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OnboardingLayout from '@/layouts/OnboardingLayout.vue'
import ForYouView from '@/pages/home/ForYouView.vue'
import ExploreView from '@/pages/home/ExploreView.vue'
import { useAuthStore } from '@/stores/auth'

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
          component: () => import('@/pages/home/HomeView.vue'),
          children: [
            {
              path: '',
              name: 'home',
              component: ForYouView,
            },
            {
              path: 'explore',
              name: 'explore',
              component: ExploreView,
            },
          ],
        },
        {
          path: 'library',
          name: 'library',
          component: () => import('@/pages/library/LibraryView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/pages/profile/ProfileView.vue'),
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/pages/articles/ArticlesView.vue'),
        },
        {
          path: 'article/:slug?',
          name: 'article',
          component: () => import('@/pages/article/ArticleView.vue'),
        },
        {
          path: 'equipment-lists',
          name: 'equipment-lists',
          component: () => import('@/pages/equipment-lists/EquipmentListsView.vue'),
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

router.beforeEach((to) => {
  const { token } = useAuthStore()

  if (!token && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }

  if (token && to.name === 'onboarding') {
    return { name: 'home' }
  }
})

export default router

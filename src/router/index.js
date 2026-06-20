import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '../store/game'

const routes = [
  { path: '/', name: 'country', component: () => import('../pages/CountrySelect.vue') },
  { path: '/formation', name: 'formation', component: () => import('../pages/FormationSelect.vue') },
  { path: '/pick', name: 'pick', component: () => import('../pages/PlayerPick.vue') },
  { path: '/squad', name: 'squad', component: () => import('../pages/SquadOverview.vue') }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const game = useGameStore()
  if (to.name === 'formation' && !game.country) return { name: 'country' }
  if (to.name === 'pick' && (!game.country || !game.formation)) return { name: 'country' }
  if (to.name === 'squad' && game.completedCount < 11) return { name: 'pick' }
})

export default router

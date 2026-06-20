import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'

const routes = [
  { path: '/', name: 'country', component: () => import('../pages/CountrySelect.vue') },
  { path: '/formation', name: 'formation', component: () => import('../pages/FormationSelect.vue') },
  { path: '/pick', name: 'pick', component: () => import('../pages/PlayerPick.vue') },
  { path: '/squad', name: 'squad', component: () => import('../pages/SquadOverview.vue') },
  { path: '/tournament', name: 'tournament', component: () => import('../pages/Tournament.vue') },
  { path: '/match/:stage', name: 'match', component: () => import('../pages/MatchPlay.vue') },
  { path: '/schedule', name: 'schedule', component: () => import('../pages/Schedule.vue') },
  { path: '/trophy', name: 'trophy', component: () => import('../pages/Trophy.vue') }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const game = useGameStore()
  if (to.name === 'formation' && !game.country) return { name: 'country' }
  if (to.name === 'pick' && (!game.country || !game.formation)) return { name: 'country' }
  if (to.name === 'squad' && game.completedCount < 11) return { name: 'pick' }
  if ((to.name === 'tournament' || to.name === 'match' || to.name === 'schedule') && (!game.country || !game.formation || game.completedCount < 11)) {
    return { name: 'country' }
  }
})

export default router

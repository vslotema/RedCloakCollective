import type { SuggestedFollow } from '~/types/recommendation'

// Stub data: the recommendations API is not wired up yet.
export const mockSuggestedFollows: SuggestedFollow[] = [
  {
    id: 201,
    name: 'Hannah Voss',
    avatar: 'https://i.pravatar.cc/150?u=201',
    bio: 'Physio and mum of two. I write about home therapy routines that actually stick.',
  },
  {
    id: 202,
    name: 'Tomas Berg',
    avatar: 'https://i.pravatar.cc/150?u=202',
    bio: 'Documenting five years of IEP meetings, appeals and small wins for other dads.',
  },
  {
    id: 203,
    name: 'Amara Diallo',
    avatar: 'https://i.pravatar.cc/150?u=203',
    bio: 'Feeding therapist. Slow, boring, evidence-based progress is my whole personality.',
  },
]

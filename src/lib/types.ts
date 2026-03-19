export type Set = {
  id: string
  session_id: string
  cat: string
  stroke: string
  dist: number
  count: number
  note: string
}

export type Session = {
  id: string
  user_id: string
  date: string
  pool: number
  note: string
  total_dist: number
  created_at: string
  sets: Set[]
}

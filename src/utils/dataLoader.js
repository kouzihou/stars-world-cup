const BASE = import.meta.env.BASE_URL

export async function fetchJSON(path) {
  const url = BASE.replace(/\/$/, '') + path
  const r = await fetch(url)
  if (!r.ok) throw new Error('fetch ' + url + ' failed: ' + r.status)
  return r.json()
}

export async function loadCountries() { return fetchJSON('/data/countries.json') }
export async function loadFormations() { return fetchJSON('/data/formations.json') }
export async function loadCountryPlayers(code) { return fetchJSON(`/data/players/${code}.json`) }

import type { NextApiRequest, NextApiResponse } from 'next'

const ASTANA_LAT = 51.1801
const ASTANA_LON = 71.4460

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q } = req.query
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Missing query' })

  const KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY
  console.log('2GIS KEY present:', !!KEY, '| value starts:', KEY?.slice(0, 6))

  if (!KEY) {
    return res.status(500).json({ error: 'API key not configured', detail: 'NEXT_PUBLIC_2GIS_API_KEY is undefined' })
  }

  // Без city_id — только координаты и радиус
  const url = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(q)}&key=${KEY}&point=${ASTANA_LON},${ASTANA_LAT}&radius=25000&fields=items.point,items.address,items.purpose_name&page_size=6`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      const text = await upstream.text()
      console.error('2GIS items status:', upstream.status, text)
      return res.status(upstream.status).json({ error: `2GIS error: ${upstream.status}`, detail: text })
    }
    const data = await upstream.json()

    // Нормализуем ответ под тот же формат что ожидает AddressInput
    const items = (data.result?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      full_name: item.address_name || item.full_name || item.name,
      purpose_name: item.purpose_name,
      point: item.point,
    }))

    res.status(200).json({ result: { items } })
  } catch (e: any) {
    console.error('Suggest fetch failed:', e?.message)
    res.status(500).json({ error: 'Upstream error', detail: e?.message })
  }
}
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY
  const url = `https://catalog.api.2gis.com/3.0/items/byid?id=${encodeURIComponent(id)}&key=${KEY}&fields=items.point`

  try {
    const upstream = await fetch(url)
    const data = await upstream.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'Upstream error' })
  }
}
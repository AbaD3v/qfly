/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY
    return [
      {
        source: '/2gis/items',
        destination: `https://catalog.api.2gis.com/3.0/items?key=${KEY}&point=71.4460,51.1801&radius=25000&fields=items.point,items.address,items.purpose_name&page_size=6`,
      },
      {
        source: '/2gis/byid',
        destination: `https://catalog.api.2gis.com/3.0/items/byid?key=${KEY}&fields=items.point`,
      },
    ]
  },
}

module.exports = nextConfig

export const INDIA_BOUNDS = {
  minLongitude: 68,
  maxLongitude: 97.5,
  minLatitude: 6.5,
  maxLatitude: 36.5,
}

const INDIA_OUTLINE: Array<[number, number]> = [
  [74, 34.6],
  [75, 35.5],
  [77, 35.5],
  [78.5, 34.5],
  [79.5, 32.5],
  [81, 30.4],
  [82.5, 29.5],
  [84, 28.8],
  [85.5, 27.8],
  [88, 27.9],
  [88.9, 27.3],
  [89.9, 26.8],
  [91.6, 27.8],
  [92.5, 28.1],
  [94, 28],
  [95.5, 28.3],
  [97.2, 28.4],
  [97, 27],
  [96, 26.5],
  [95, 25],
  [94.5, 23.5],
  [93.5, 22],
  [92.8, 21.5],
  [92.2, 22.2],
  [91, 23.2],
  [90, 24],
  [89.5, 25.2],
  [88.5, 26],
  [88, 25],
  [89, 23],
  [88.2, 21.7],
  [86.8, 20.2],
  [85, 19],
  [83, 17.7],
  [81.2, 16],
  [80.3, 13.5],
  [79.8, 11],
  [78.5, 9],
  [77.5, 8.1],
  [76.5, 8.8],
  [75.5, 10.5],
  [74.8, 12.5],
  [74, 15],
  [73.3, 17.5],
  [72.8, 19.5],
  [72.6, 21.2],
  [71, 21.8],
  [69, 22.3],
  [68.5, 23.5],
  [69.5, 24.5],
  [70.5, 25],
  [71, 26.5],
  [72.5, 27.5],
  [73, 29],
  [74, 31],
  [74.5, 32.5],
]

export const MAP_VIEWBOX = { width: 620, height: 640, padding: 24 }

export function projectCoordinate(longitude: number, latitude: number) {
  const { minLongitude, maxLongitude, minLatitude, maxLatitude } = INDIA_BOUNDS
  const { width, height, padding } = MAP_VIEWBOX
  const x =
    padding + ((longitude - minLongitude) / (maxLongitude - minLongitude)) * (width - padding * 2)
  const y =
    padding + ((maxLatitude - latitude) / (maxLatitude - minLatitude)) * (height - padding * 2)
  return { x, y }
}

export function outlinePath() {
  return INDIA_OUTLINE.map(([longitude, latitude], index) => {
    const point = projectCoordinate(longitude, latitude)
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }).join(' ')
}

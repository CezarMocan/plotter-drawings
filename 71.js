const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
const random = require('canvas-sketch-util/random');
const p5 = require('p5');
new p5()
const { Point, Path, Camera, Renderer } = require('./engine');
paper.setup(document.createElement('canvas'))
const kdtreelib = require('kd-tree-javascript')

let paths = []
let W, H

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

const FILL_LINE_SPACING = 0.03

// Set a random seed so we can reproduce this print later
Random.setSeed(defaultSeed || Random.getRandomSeed());

// Print to console so we can see which seed is being used and copy it if desired
console.log('Random Seed:', Random.getSeed());

const settings = {
  suffix: Random.getSeed(),
  dimensions: 'A4',
  orientation: 'portrait',
  pixelsPerInch: 300,
  scaleToView: true,
  units: 'cm'
};

const drawPolygon = (polyObject, all) => {
  const polygon = polyObject.path
  const drawRule = polyObject.drawRule
  // console.log(polygon.segments, drawRule)
  if (!polygon.segments) return
  if (polygon.segments.length == 0) return
  const p = createPath()  
  // console.log('drawPoly: ', polygon)
  var inX, inY, outX, outY, curX, curY, prevX, prevY
  for (let i = 0; i < polygon.segments.length; i++) {
    let index = i % polygon.segments.length

    const segment = polygon.segments[index]
    const point = segment.point
    let handle = segment.handleIn;

    curX = point.x, curY = point.y

    if (i == 0) {
      p.moveTo(curX, curY)
    } else {
      inX = curX + handle.x;
      inY = curY + handle.y;
      if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
        // if (random.noise2D(curX, curY, 0.1, 1) < 0.5)
        if (drawRule[index])
          p.lineTo(curX, curY);
        else
          p.moveTo(curX, curY);
      } else {
        p.bezierCurveTo(outX, outY, inX, inY, curX, curY);
      }
    }
    prevX = curX;
    prevY = curY;
    handle = segment.handleOut;
    outX = prevX + handle.x;
    outY = prevY + handle.y;
  }
  paths.push(p)
}


const allPolys = []

// const createRectangle = (x, y, z, sL1, sL2) => {
//   const face = new Path()
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y + sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), true)
//   face.add(new Point(x + sL1 / 2 + random.noise2D(x, y, 0.1, 1), y + sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   face.add(new Point(x + sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), true)
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   // face.add(new Point(x - sL1 / 2, y - sL2 / 2, z))
//   return [face]
// }


// const createRectangle = (x, y, z, sL1, sL2) => {
//   const face = new Path()
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y + sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), true)
//   face.add(new Point(x + sL1 / 2 + random.noise2D(x, y, 0.1, 1), y + sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   face.add(new Point(x + sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), true)
//   face.add(new Point(x - sL1 / 2 + random.noise2D(x, y, 0.1, 1), y - sL2 / 2 + random.noise2D(x, y, 0.15, 1), z + random.noise2D(x, y, 0.5, 0.5)), false)
//   // face.add(new Point(x - sL1 / 2, y - sL2 / 2, z))
//   return [face]
// }

const drawRibbon = (startPoints, endPoints, allPaths) => {
  let prevP = startPoints.slice(0)
  let currP = []
  const step = 1
  for (let pct = 0; pct <= 1; pct += step) {
    currP = []
    for (let i = 0; i < startPoints.length; i++) {
      let newP = startPoints[i].interpolate(endPoints[i], pct)
      newP.x += random.noise3D(pct, newP.x, newP.y % 10, 0.04, 1.4)//Math.sin(4 * pct * Math.PI) * 4
      newP.y += random.noise3D(pct, newP.x, newP.y % 10, 0.08, 0.6)//Math.sin(4 * pct * Math.PI) * 4
      newP.z += Math.cos(4 * pct * Math.PI) * 0.5 + random.noise3D(newP.x, newP.y % 10, newP.z, 0.05, 0.5)
      currP.push(newP)      
    }

    if (pct >= 0) {
      rect = new Path()
      rect.add(prevP[0])
      rect.add(prevP[1], true)
      rect.add(currP[1])
      rect.add(currP[0], true)
      allPaths.push(rect)  
    }
    prevP = currP
  }
  return prevP
}

const coordToIndex = (x, y, z, range) => {
  const nX = (range.x[1] - range.x[0]) / range.step + 1
  const nY = (range.y[1] - range.y[0]) / range.step + 1
  const nZ = (range.z[1] - range.z[0]) / range.step + 1

  return {
    i: Math.floor(map(x, range.x[0], range.x[1], 0, nX)),
    j: Math.floor(map(y, range.y[0], range.y[1], 0, nY)),
    k: Math.floor(map(z, range.z[0], range.z[1], 0, nZ))
  }
}

const indexToCoord = (i, j, k, range) => {
  const nX = (range.x[1] - range.x[0]) / range.step + 1
  const nY = (range.y[1] - range.y[0]) / range.step + 1
  const nZ = (range.z[1] - range.z[0]) / range.step + 1

  return {
    x: map(i, 0, nX, range.x[0], range.x[1]),
    y: map(j, 0, nY, range.y[0], range.y[1]),
    z: map(k, 0, nZ, range.z[0], range.z[1])
  }
}

const createNoiseField = (range) => {
  const theta = []
  const phi = []
  const nX = (range.x[1] - range.x[0]) / range.step + 1
  const nY = (range.y[1] - range.y[0]) / range.step + 1
  const nZ = (range.z[1] - range.z[0]) / range.step + 1

  for (let i = 0; i < nX; i++) {
    theta.push([]); phi.push([])
    for (let j = 0; j < nY; j++) {
      theta[i].push([]); phi[i].push([])
      for (let k = 0; k < nZ; k++) {
        theta[i][j].push(random.noise3D(i, j, k, 0.0865, Math.PI) + Math.PI)
        phi[i][j].push(random.noise3D(k, i, j, 0.0432, Math.PI) + Math.PI)
      }
    }
  }

  return { theta, phi, nX, nY, nZ, range }
}

const getPointOnSphere = (coord, theta, phi, r) => {
  // theta = (theta - theta % (Math.PI / 4))
  // phi = (phi - phi % (Math.PI / 4))
  return {
    x: coord.x + r * Math.cos(theta) * Math.sin(phi),
    y: coord.y + r * Math.sin(theta) * Math.sin(phi),
    z: coord.z + r * Math.cos(phi)
  }
}

const inRange = (p, range) => {
  if (p.x < range.x[0]) return false
  if (p.x > range.x[1]) return false
  if (p.y < range.y[0]) return false
  if (p.y > range.y[1]) return false
  if (p.z < range.z[0]) return false
  if (p.z > range.z[1]) return false
  return true
}

const distanceFunction = (a, b) => {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
}

const sketch = (props) => {
  const { width, height, units } = props;
  W = width
  H = height
 
  let topLeft = { x: 1, y: 1 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  const radius = 10
  const scale = { x: 1, y: 1 }
  const center = { x: 30, y: 0 }  
  const noPoints = 4
  const noPointsSmall = noPoints
  const angleOffset = Math.PI / 8

  const camera = new Camera({ x: 0, y: 0, z: 0.7}, { }, Math.PI / 4, 9 / 9, 0.1, 100)
  const renderer = new Renderer(camera)

  // let cube1 = createCube(0, 0, 20, 5, renderer, paths)
  // let cube2 = createCube(7, 7, 20, 5, renderer, paths)
  // let allPaths = cube1.concat(cube2)

  let allPaths = []  

  // const startPoints = [new Point(1, 5, 8), new Point(-1, 5, 8)]
  // const endPoints = [new Point(-5, -10, 4), new Point(-5, -10, 3)]

  const range = {
    x: [-10, 10],
    y: [-10, 10],
    z: [1, 12],
    step: 0.1
  }
  const allPoints = []

  let noiseField = createNoiseField(range)  
  const r = 0.05

  for (let i = 0; i < noiseField.nX; i++) {
    for (let j = 0; j < noiseField.nY; j++) {
      for (let k = 0; k < noiseField.nZ; k++) {
        const coord = indexToCoord(i, j, k, range)        
        const path = new Path()
        path.add(new Point(coord.x, coord.y, coord.z))
        const toPoint = getPointOnSphere(coord, noiseField.theta[i][j][k], noiseField.phi[i][j][k], r)
        path.add(new Point(toPoint.x, toPoint.y, toPoint.z))
        // allPaths.push(path)
        // console.log(i, j, k, coord, toPoint)
      }
    }
  }

  const kdtree = new kdtreelib.kdTree([], distanceFunction, ["x", "y", "z"])

  for (let ps = 0; ps < 4000; ps++) {
    console.log('PS: ', ps)

    let p = { 
      x: map(Math.random(), 0, 1, range.x[0], range.x[1]), 
      y: map(Math.random(), 0, 1, range.y[0], range.y[1]), 
      z: map(Math.random(), 0, 1, range.z[0], range.z[1]), 
    }
  
    const path = new Path()
    path.add(new Point(p.x, p.y, p.z))
    let noPoints = 0
    while (inRange(p, range) && noPoints < 200) {
      const nearest = kdtree.nearest(p, 1)
      kdtree.insert(p)
      if (nearest.length > 0 && nearest[0][1] < 0.04 ** 2) noPoints = 201
      else {
        const index = coordToIndex(p.x, p.y, p.z, noiseField.range)
        const { i, j, k } = index
        // console.log(index)
        const toPoint = getPointOnSphere(p, noiseField.theta[i][j][k], noiseField.phi[i][j][k], r)
        path.add(new Point(toPoint.x, toPoint.y, toPoint.z))
        p = toPoint
        noPoints++       
      }
    }
    allPaths.push(path)  
  }

  
  let projectedPaths = renderer.projectPaths(allPaths, W, H)
  let finalPaths = renderer.computePathsVisibility(projectedPaths, false)

  finalPaths.forEach(p => { drawPolygon(p) })
  
  let lines = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 0.5; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  lines = clipPolylinesToBox(lines, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(lines, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.035,
    // Optimize SVG paths for pen plotter use
    optimize: false
  });
};

canvasSketch(sketch, settings);

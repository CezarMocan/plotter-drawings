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
  console.log(polygon.segments, drawRule)
  if (!polygon.segments) return
  if (polygon.segments.length == 0) return
  const p = createPath()  
  // console.log('drawPoly: ', polygon)
  var inX, inY, outX, outY, curX, curY, prevX, prevY
  for (let i = 0; i <= polygon.segments.length; i++) {
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
  const step = 0.005
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

  const camera = new Camera({ x: 0, y: 0, z: -3}, { }, Math.PI / 12, 12 / 9, 0.1, 100)
  const renderer = new Renderer(camera)

  // let cube1 = createCube(0, 0, 20, 5, renderer, paths)
  // let cube2 = createCube(7, 7, 20, 5, renderer, paths)
  // let allPaths = cube1.concat(cube2)

  let allPaths = []  

  // const startPoints = [new Point(1, 5, 8), new Point(-1, 5, 8)]
  // const endPoints = [new Point(-5, -10, 4), new Point(-5, -10, 3)]

  const allPoints = [
    // [ new Point(1, 5, 8), new Point(-1, 5, 8) ],
    // [ new Point(-5, -10, 20), new Point(-5, -10, 3) ],
    // [ new Point(7, 4, 21), new Point(6.5, -2, 4) ],
    // [ new Point(0.2, 10, 5), new Point(-0.2, 10, 5) ],
    // [ new Point(0.5, -10, 5), new Point(-0.5, -10, 5) ],
    // [ new Point(1.2, 10, 6), new Point(0.8, 10, 6) ],
    // [ new Point(1.5, -10, 6), new Point(0.5, -10, 6) ],
    // [new Point(7, 15, 5), new Point(7, 14.7, 5)]
  ]

  let left = false
  let z = 13
  let x = 35
  let zStep = 1
  // for (let y = 25; y >= -25; y--) {
    for (let y = 35; y >= -35; y--) {
    z += zStep
    if (left) {
      allPoints.push([
        new Point(x, y, z), new Point(x, y - 1, z)
      ])
    } else {
      allPoints.push([
        new Point(-x, y, z), new Point(-x, y - 1, z)
      ])
    }
    left = !left
    if (z > 18 || z < 13) zStep = -zStep
  }



  // for (let i = 0; i < 5; i++) {
  //   allPoints.push(
  //     [
  //       new Point(
  //         random.noise1D(i, 1, 5),
  //         random.noise1D(i, 2, 5),
  //         random.noise1D(i, 3, 5) + 6
  //       ),
  //       new Point(
  //         random.noise1D(i, 4, 5),
  //         random.noise1D(i, 5, 5),
  //         random.noise1D(i, 6, 5) + 6
  //       ),
  //     ]
  //   )
  // }

  let lastPoint = allPoints[0]
  for (let i = 1; i < allPoints.length; i++) {
    lastPoint = drawRibbon(lastPoint, allPoints[i], allPaths)
  }
  /*
  for (let x = -8; x <= 8; x += 2.5) {
    const step = 2
    for (let y = -10; y < 10; y += step) {
      let z = 2 + random.noise2D(x, y, 0.1, 1)
      let rect
      if (random.noise3D(x, y, z, 0.1, 1) < 0.75)
        rect = createRectangle(x + random.noise1D(y + x, 0.1, 3), y, z, 0.35 + random.noise1D(x, 1, 0.5), (random.noise2D(x, y, 0.35, 0.4) + 8.8) * (z / 3))
      else
        rect = createRectangle(x + random.noise1D(y + x, 0.1, 3), y, z, (random.noise2D(x, y, 0.35, 0.4) + 8.8) * (z / 3), 0.35 + random.noise1D(x, 1, 0.5))
      allPaths = allPaths.concat(rect)
    }  
  }
  */

  let projectedPaths = renderer.projectPaths(allPaths, W, H)
  let finalPaths = renderer.computePathsVisibility(projectedPaths)

  finalPaths.forEach(p => { drawPolygon(p) })

  // let step = radius
  // for (let z = 10; z <= radius + 10; z += step) {
  //   const path = createPolygon(center, z, radius, noPoints, scale, angleOffset)
  //   center.y += Math.sin(z) * 0.1
  //   center.x += Math.cos(z * 1.3) * 0.05
  //   const p = renderer.renderPath(path, W, H)
  //   paths.push(p)  
  // }
  
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

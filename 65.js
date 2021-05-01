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

const drawPolygon = (polygon, all) => {
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
        p.lineTo(curX, curY);
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

const createRectangle = (x, y, z, sL1, sL2) => {
  const face = new Path()
  face.add(new Point(x - sL1 / 2, y - sL2 / 2, z))
  face.add(new Point(x - sL1 / 2, y + sL2 / 2, z))
  face.add(new Point(x + sL1 / 2, y + sL2 / 2, z))
  face.add(new Point(x + sL1 / 2, y - sL2 / 2, z))
  face.add(new Point(x - sL1 / 2, y - sL2 / 2, z))
  return [face]
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

  const camera = new Camera({ x: 0, y: 0, z: -2}, { }, Math.PI / 12, 12 / 9, 0.1, 100)
  const renderer = new Renderer(camera)

  // let cube1 = createCube(0, 0, 20, 5, renderer, paths)
  // let cube2 = createCube(7, 7, 20, 5, renderer, paths)
  // let allPaths = cube1.concat(cube2)

  let allPaths = []  

  let params = []
  for (let y = -5; y < 5; y += 0.2) {
    params.push({ x: 3.5, y: y, w: 2, h: 0.2 })
    params.push({ x: -3.5, y: y, w: 2, h: 0.2 })
  }

  for (let x = -3; x <= 3; x += 0.25) {
    params.push({ x: x, y: -5, w: 2, h: 0.2, zOff: 0.001 })
    params.push({ x: x, y: 5, w: 2, h: 0.2, zOff: 0.001 })
  }  

  dist = 0.03
  for (let z = -1.5; z <= 20; z += dist) {
    params.forEach(p => {
      // let path = createRectangle(p.x, p.y + Math.sin(z / 1.5) * 0.5, z, p.w, p.h)
      let path = createRectangle(p.x + random.noise3D(p.x, p.y, z, 0.18, 1), p.y + random.noise3D(p.x, p.y, z, 0.15, 1), z + (p.zOff ? p.zOff : 0), p.w, p.h)
      allPaths = allPaths.concat(path)  
    })
    if (z > 1) dist += 0.03
  }

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

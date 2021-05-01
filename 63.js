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
  console.log('drawPoly: ', polygon)
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

const createCube = (x, y, z, sL, renderer, paths) => {
  const face1 = new Path()
  const face2 = new Path()
  const face3 = new Path()
  const face4 = new Path()
  const face5 = new Path()
  const face6 = new Path()
  // Front
  face1.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))
  face1.add(new Point(x - sL / 2, y + sL / 2, z - sL / 8))
  face1.add(new Point(x + sL / 2, y + sL / 2, z - sL / 8))
  face1.add(new Point(x + sL / 2, y - sL / 2, z - sL / 8))
  face1.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))

  // Top
  face2.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))
  face2.add(new Point(x - sL / 2, y - sL / 2, z + sL / 8))
  face2.add(new Point(x + sL / 2, y - sL / 2, z + sL / 8))
  face2.add(new Point(x + sL / 2, y - sL / 2, z - sL / 8))
  face2.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))

  // Left
  face3.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))
  face3.add(new Point(x - sL / 2, y - sL / 2, z + sL / 8))
  face3.add(new Point(x - sL / 2, y + sL / 2, z + sL / 8))
  face3.add(new Point(x - sL / 2, y + sL / 2, z - sL / 8))
  face3.add(new Point(x - sL / 2, y - sL / 2, z - sL / 8))

  // Right
  face4.add(new Point(x + sL / 2, y - sL / 2, z - sL / 8))
  face4.add(new Point(x + sL / 2, y - sL / 2, z + sL / 8))
  face4.add(new Point(x + sL / 2, y + sL / 2, z + sL / 8))
  face4.add(new Point(x + sL / 2, y + sL / 2, z - sL / 8))
  face4.add(new Point(x + sL / 2, y - sL / 2, z - sL / 8))
  
  // Bottom
  face5.add(new Point(x - sL / 2, y + sL / 2, z - sL / 8))
  face5.add(new Point(x - sL / 2, y + sL / 2, z + sL / 8))
  face5.add(new Point(x + sL / 2, y + sL / 2, z + sL / 8))
  face5.add(new Point(x + sL / 2, y + sL / 2, z - sL / 8))
  face5.add(new Point(x - sL / 2, y + sL / 2, z - sL / 8))

  // Back
  face6.add(new Point(x - sL / 2, y - sL / 2, z + sL / 8))
  face6.add(new Point(x - sL / 2, y + sL / 2, z + sL / 8))
  face6.add(new Point(x + sL / 2, y + sL / 2, z + sL / 8))
  face6.add(new Point(x + sL / 2, y - sL / 2, z + sL / 8))
  face6.add(new Point(x - sL / 2, y - sL / 2, z + sL / 8))
  
  let cube = [face1, face2, face3, face4, face5, face6]
  return cube
  // cube.forEach(f => {
  //   paths.push(renderer.renderPath(f, W, H))
  // })
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

  console.log(allPaths)

  for (let x = -40; x <= 40; x += 10) {
    if (x == 0 || x == 10 || x == -10) continue
    for (let y = -50; y <= 50; y += 10) {
      // if (x == 0 && y == 0) continue;
      for (let z = 20; z <= 80; z += 10) {
        if (random.noise3D(x, y, z, 30, 1) > 0.9) continue
        allPaths = allPaths.concat(createCube(x + Math.random() * 0.001, y + Math.random() * 0.001, z + Math.random() * 0.001, random.noise3D(x, y, z, 100, 4) + 15, renderer, paths))
      }
    }
  }

  // for (let x = 50; x <= 70; x += 10) {
  //   for (let y = -50; y <= 50; y += 10) {
  //     // if (x == 0 && y == 0) continue;
  //     for (let z = 20; z <= 60; z += 10) {
  //       allPaths = allPaths.concat(createCube(x + Math.random() * 0.001, y + Math.random() * 0.001, z + Math.random() * 0.001, random.noise3D(x, y, z, 10, 4) + 9, renderer, paths))
  //     }
  //   }
  // }

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

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

const allPolys = []

const createPolygon = (center, z, radius, noPoints, scale, angleOffset) => {
  const polygon = new Path()
  let rotationOffset = 0
  let gapSize = 0
  for (let i = 0; i <= noPoints; i++) {    
    const angle = map(i, 0, noPoints, rotationOffset + gapSize / 2, 2 * PI + rotationOffset - gapSize / 2)
    const r = radius //+ random.noise2D(i, z / 100, 0.05, 0.2)
    polygon.add(new Point(
      Math.cos(angle + angleOffset) * r * scale.x + center.x,
      Math.sin(angle + angleOffset) * r * scale.y + center.y,
      z
    ))
  }

  return polygon
}

const createCube = (x, y, z, sL, renderer, paths) => {
  const face1 = new Path()
  const face2 = new Path()
  const face3 = new Path()
  const face4 = new Path()
  const face5 = new Path()
  const face6 = new Path()
  // Front
  face1.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))
  face1.add(new Point(x - sL / 2, y + sL / 2, z - sL / 2))
  face1.add(new Point(x + sL / 2, y + sL / 2, z - sL / 2))
  face1.add(new Point(x + sL / 2, y - sL / 2, z - sL / 2))
  face1.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))

  // Top
  // face2.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))
  // face2.add(new Point(x - sL / 2, y - sL / 2, z + sL / 2))
  // face2.add(new Point(x + sL / 2, y - sL / 2, z + sL / 2))
  // face2.add(new Point(x + sL / 2, y - sL / 2, z - sL / 2))
  // face2.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))

  // Left
  face3.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))
  face3.add(new Point(x - sL / 2, y - sL / 2, z + sL / 2))
  face3.add(new Point(x - sL / 2, y + sL / 2, z + sL / 2))
  face3.add(new Point(x - sL / 2, y + sL / 2, z - sL / 2))
  face3.add(new Point(x - sL / 2, y - sL / 2, z - sL / 2))

  // Right
  face4.add(new Point(x + sL / 2, y - sL / 2, z - sL / 2))
  face4.add(new Point(x + sL / 2, y - sL / 2, z + sL / 2))
  face4.add(new Point(x + sL / 2, y + sL / 2, z + sL / 2))
  face4.add(new Point(x + sL / 2, y + sL / 2, z - sL / 2))
  face4.add(new Point(x + sL / 2, y - sL / 2, z - sL / 2))
  
  // Bottom
  // face5.add(new Point(x - sL / 2, y + sL / 2, z - sL / 2))
  // face5.add(new Point(x - sL / 2, y + sL / 2, z + sL / 2))
  // face5.add(new Point(x + sL / 2, y + sL / 2, z + sL / 2))
  // face5.add(new Point(x + sL / 2, y + sL / 2, z - sL / 2))
  // face5.add(new Point(x - sL / 2, y + sL / 2, z - sL / 2))

  // Back
  face6.add(new Point(x - sL / 2, y - sL / 2, z + sL / 2))
  face6.add(new Point(x - sL / 2, y + sL / 2, z + sL / 2))
  face6.add(new Point(x + sL / 2, y + sL / 2, z + sL / 2))
  face6.add(new Point(x + sL / 2, y - sL / 2, z + sL / 2))
  face6.add(new Point(x - sL / 2, y - sL / 2, z + sL / 2))
  
  let cube = [face1, face2, face3, face4, face5, face6]
  cube.forEach(f => {
    paths.push(renderer.renderPath(f, W, H))
  })
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
  const angleOffset = Math.PI / 4

  const camera = new Camera({ x: 0, y: 0, z: -2}, { }, Math.PI / 16, 12 / 9, 0.1, 100)
  const renderer = new Renderer(camera)

  for (let x = -30; x <= 30; x += 10) {
    for (let y = -40; y <= 40; y += 10) {
      // if (x == 0 && y == 0) continue;
      for (let z = 20; z <= 15 * 3 + 10; z += 10) {
        createCube(x, y, z, 5, renderer, paths)
      }
    }
  }

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

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
  let rotationOffset = Math.PI / 2
  let gapSize = Math.PI
  for (let i = 0; i <= noPoints; i++) {    
    const angle = map(i, 0, noPoints, rotationOffset + gapSize / 2, 2 * PI + rotationOffset - gapSize / 2)
    const r = radius + random.noise2D(i, z / 100, 0.05, 0.2)
    polygon.add(new Point(
      Math.cos(angle + angleOffset) * r * scale.x + center.x,
      Math.sin(angle + angleOffset) * r * scale.y + center.y,
      z
    ))
  }

  return polygon
}

const createPolygon2 = (center, z, radius, noPoints, scale, angleOffset) => {
  const polygon = new Path()
  let rotationOffset = Math.PI / 2
  let gapSize = Math.PI

  let angle = map(0, 0, noPoints, rotationOffset + gapSize / 2, 2 * PI + rotationOffset - gapSize / 2)
  // let p1 = 
  polygon.add(new Point(
    Math.cos(angle + angleOffset) * radius * scale.x + center.x,
    Math.sin(angle + angleOffset) * radius * scale.y + center.y,
    z
  ))

  angle = map(noPoints, 0, noPoints, rotationOffset + gapSize / 2, 2 * PI + rotationOffset - gapSize / 2)
  polygon.add(new Point(
    Math.cos(angle + angleOffset) * radius * scale.x + center.x,
    Math.sin(angle + angleOffset) * radius * scale.y + center.y,
    z
  ))

  return polygon
}

const sketch = (props) => {
  const { width, height, units } = props;
  W = width
  H = height
 
  let topLeft = { x: 1, y: 1 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  const radius = 20
  const scale = { x: 1, y: 1 }
  const center = { x: W / 2, y: H / 2 + 10}  
  const noPoints = 100
  const noPointsSmall = noPoints
  const angleOffset = 0  

  const camera = new Camera(W / 2, H / 2 + 5, -80, 100)
  const renderer = new Renderer(camera)

  let step = 0.5
  for (let z = -100; z <= 2050; z += step) {
    const path = createPolygon(center, z, radius, noPoints, scale, angleOffset)
    center.y += Math.sin(z) * 0.1
    center.x += Math.cos(z * 1.3) * 0.05
    const p = renderer.renderPath(path)
    paths.push(p)  

    const path2 = createPolygon2(center, z, radius, noPoints, scale, angleOffset)
    const p2 = renderer.renderPath(path2)
    paths.push(p2)  
    step += random.noise1D(z, 1, 0.05) + 0.01

  }
  

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
    lineWidth: 0.055,
    // Optimize SVG paths for pen plotter use
    optimize: false
  });
};

canvasSketch(sketch, settings);

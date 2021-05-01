const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const random = require('canvas-sketch-util/random');
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');

const p5 = require('p5')
new p5()

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

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

let canvasWidth, canvasHeight

// Holds all our 'path' objects
// which could be from createPath, or SVGPath string, or polylines
const paths = [];
const circles = []

const intersectsCircles = (target, circles) => {
  let tC = new p5.Vector(target.x, target.y)
  for (let c of circles) {
    let cC = new p5.Vector(c.x, c.y)
    // console.log('Intersects: ', tC.dist(cC), target.radius + c.radius)
    if (tC.dist(cC) + 0.01 < target.radius + c.radius) return true
  }
  return false
}

const inBoundsFn = (x, y, radius) => {
  // if ((new p5.Vector(x, y)).dist(new p5.Vector(canvasWidth / 2, canvasHeight / 2)) > 7) return false
  if (x < 0) return false
  if (y < 0) return false
  if (x > canvasWidth) return false
  if (y > canvasHeight) return false
  return true
}

const generatePath = (x, y, radius, direction, weight, depth, maxDepth, inBoundsFn) => {

  const splitAngle = Math.PI * 0.3 //+ random.noise2D(x, y, 1, map(depth, 0, 80, 0.4, 0.2)))

  if (radius < 0.05) return
  // if (depth > maxDepth) return
  if (weight < 0.001) return
  if (intersectsCircles({ x, y, radius }, circles)) radius *= 0.75
  if (intersectsCircles({ x, y, radius }, circles)) return
  if (!inBoundsFn(x, y, radius)) return
  // todo: check for bounds

  const startPoint = { x, y }
  const endPoint = { 
    x: x + Math.cos(direction) * radius,
    y: y + Math.sin(direction) * radius
  }

  // const p = createPath()
  // p.moveTo(startPoint.x, startPoint.y)
  // p.lineTo(endPoint.x, endPoint.y)  

  circles.push({ x, y, radius })

  const newDirection = direction + random.noise2D(x, y, 3, 0.4)
  const newRadius = radius * 0.99
  const newCenter = {
    x: endPoint.x + Math.cos(newDirection) * newRadius,
    y: endPoint.y + Math.sin(newDirection) * newRadius
  }

  let sgns = [-1, 1]
  let splits = []

  splits.push({ x: newCenter.x, y: newCenter.y, radius: newRadius, direction: newDirection, boundX: endPoint.x, boundY: endPoint.y })

  for (let splitSgn of sgns) {
    let newWeight
    let isSplitting = (Math.random() < (0.4 * Math.min(1, depth / 20)))  
    // console.log('splits', splits)
    if (!isSplitting) {
      // newWeight = weight
    } else {
      // console.log('splitting...')
      newWeight = weight / 2
      const newEndPoint = { 
        x: x + Math.cos(direction + splitAngle * splitSgn) * radius,
        y: y + Math.sin(direction + splitAngle * splitSgn) * radius
      }  
      const newDirection2 = newDirection + splitAngle * splitSgn
      const newCenter2 = {
        x: newEndPoint.x + Math.cos(newDirection2) * newRadius,
        y: newEndPoint.y + Math.sin(newDirection2) * newRadius
      }

      splits.push({ x: newCenter2.x, y: newCenter2.y, direction: newDirection2, radius: newRadius, boundX: newEndPoint.x, boundY: newEndPoint.y })
    }
  }

  // if (depth == 0) splits.push({ x: newCenter.x, y: newCenter.y, radius: newRadius, direction: newDirection + Math.PI, boundX: endPoint.x, boundY: endPoint.y })

  splits.forEach(({ x, y, radius, direction, boundX, boundY }) => {
    const p = createPath()
    p.moveTo(startPoint.x, startPoint.y)
    p.lineTo(boundX, boundY)
    // p.lineTo(x, y)
    paths.push(p)
    generatePath(x, y, radius, direction, weight / splits.length, depth + 1, maxDepth, inBoundsFn)
  })
}

const sketch = (props) => {
  const { width, height, units } = props;
  canvasWidth = width
  canvasHeight = height
  // // Draw random arcs
  // const count = 450;
  // for (let i = 0; i < count; i++) {
  //   // setup arc properties randomly
  //   const angle = Random.gaussian(0, Math.PI / 2);
  //   const arcLength = Math.abs(Random.gaussian(0, Math.PI / 2));
  //   const r = ((i + 1) / count) * Math.min(width, height) / 1;

  //   // draw the arc
  //   const p = createPath();
  //   p.arc(width / 2, height / 2, r, angle, angle + arcLength);
  //   paths.push(p);
  // }

  generatePath(width / 2, height / 2, 0.3, -Math.PI / 2, 1, 0, 62, inBoundsFn)

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
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
    optimize: true
  });
};

canvasSketch(sketch, settings);

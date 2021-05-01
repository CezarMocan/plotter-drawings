const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
const p5 = require('p5');
const random = require('canvas-sketch-util/random');
new p5()
paper.setup(document.createElement('canvas'))


// You can force a specific seed by replacing this with a string value
const defaultSeed = '';
let paths
let topLeft, bottomRight

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

const drawPolygon = (polygon) => {
  // console.log(polygon)
  const p = createPath()
  // p.moveTo(polygon.segments[0].point.x, polygon.segments[0].point.y)

  var inX, inY, outX, outY, curX, curY, prevX, prevY

  for (let i = 0; i <= polygon.segments.length; i++) {
    let index = i % polygon.segments.length

    const segment = polygon.segments[index]
    const point = segment.point
    let handle = segment.handleIn;

    // console.log(point, handle)
    curX = point.x, curY = point.y

    if (i == 0) {
      p.moveTo(curX, curY)
    } else {
      inX = curX + handle.x;
      inY = curY + handle.y;
      if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
        p.lineTo(curX, curY);
      } else {
        // if (Math.random() < 0.9)
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

const splitDraw = (polygon, depth, maxDepth, maxAngle) => {
  polygon.closePath()
  let returns = false
  if (depth > maxDepth) returns = true
  if (Math.abs(polygon.area) < 0.05) returns = true
  if (Math.random() < 0.03) returns = true

  if (returns) {
    const centerX = polygon.segments.reduce((acc, s) => (acc + s.point.x), 0) / polygon.segments.length
    const centerY = polygon.segments.reduce((acc, s) => (acc + s.point.y), 0) / polygon.segments.length
    let fac = map(random.noise2D(centerX, centerY, 0.1, 1), -1, 1, 0.2, 3) //Math.random() * 3
    polygon.smooth({ type: 'geometric', factor: fac })
    // console.log('centers: ', centerX, centerY)
    
    // polygon.interpolate(polygon, new paper.Path([new paper.Point(centerX, centerY)]), 0.8)
    let newPath = new paper.Path([
      new paper.Point(centerX, centerY),
      new paper.Point(centerX, centerY + 0.001),
      new paper.Point(centerX + 0.001, centerY + 0.001),
      new paper.Point(centerX + 0.001, centerY),
    ])
    newPath.closePath()
    polygon.interpolate(polygon, newPath, map(fac, 0, 3, 0.3, 0.75))
    drawPolygon(polygon)
    return
  }


  const now = new Date().getTime()
  let pctA = 0, pctB = 1
  while (Math.abs(pctA - pctB) > 0.05) {
    pctA = Math.random()
    pctB = Math.random()
  }

  pctA = 0.3 + Math.random() / 2.5
  pctB = 0.3 + Math.random() / 2.5

  let sideA, sideB

  let tA = new paper.Path([polygon.segments[0], polygon.segments[1]])
  let tB = new paper.Path([polygon.segments[3], polygon.segments[0]])
  let vertical = (tA.length > tB.length)//Math.random() < 0.5
  if (vertical) {
    sideA = new paper.Path([polygon.segments[0], polygon.segments[1]])
    sideB = new paper.Path([polygon.segments[2], polygon.segments[3]])
  } else {
    sideA = new paper.Path([polygon.segments[3], polygon.segments[0]])
    sideB = new paper.Path([polygon.segments[1], polygon.segments[2]])
  }

  let A = sideA.getPointAt(pctA * sideA.length)
  let B = sideB.getPointAt(pctB * sideB.length)

  // console.log('D: ', depth)
  // console.log(A, B)

  // let p = createPath()
  // p.moveTo(A.x, A.y)
  // p.lineTo(B.x, B.y)
  // paths.push(p)

  let poly1, poly2
  if (vertical) {
    poly1 = new paper.Path([polygon.segments[0], A, B, polygon.segments[3]])
    poly2 = new paper.Path([A, polygon.segments[1], polygon.segments[2], B])
  } else {
    poly1 = new paper.Path([polygon.segments[0], polygon.segments[1], B, A])
    poly2 = new paper.Path([A, B, polygon.segments[2], polygon.segments[3]])
  }

  // console.log(poly1.segments)

  splitDraw(poly1, depth + 1, maxDepth, maxAngle)
  splitDraw(poly2, depth + 1, maxDepth, maxAngle)
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  paths = [];

  topLeft = { x: 1, y: 1 }
  bottomRight = { x: width - 1, y: height - 1 }

  const polygon = new paper.Path([
    new paper.Point(topLeft.x, bottomRight.y),
    new paper.Point(bottomRight.x, bottomRight.y),
    new paper.Point(bottomRight.x, topLeft.y),
    new paper.Point(topLeft.x, topLeft.y),
  ])

  // console.log(polygon)

  const p = createPath()
  p.moveTo(polygon.segments[0].point.x, polygon.segments[0].point.y)
  for (let i = 1; i <= polygon.segments.length; i++) {
    let index = i % polygon.segments.length
    p.lineTo(polygon.segments[index].point.x, polygon.segments[index].point.y)
    // console.log(polygon.segments[index].point.x, polygon.segments[index].point.y)
  }
  // paths.push(p)

  splitDraw(polygon, 0, 10, 2 * Math.PI)

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });
  // Clip to bounds, using a margin in working units
  const margin = 0.25; // in working 'units' based on settings
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

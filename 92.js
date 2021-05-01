const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
const kdtreeLib = require('kd-tree-javascript')

const triangleDistanceFunction = (t1, t2) => {
  return (t1.cX - t2.cX) ** 2 + (t1.cY - t2.cY) ** 2  
}

const kdtree = new kdtreeLib.kdTree([], triangleDistanceFunction, ["cX", "cY"])

const p5 = require('p5')
new p5()
paper.setup(document.createElement('canvas'))

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

const drawPolygon = (polygon, all = true, prob = 1) => {
  // console.log(polygon.segments, drawRule)
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
        if (all) {
          p.lineTo(curX, curY);
        } else {
          if (random.noise2D(curX, curY, 10000, 0.25) + 0.7 < 1 * prob || Math.random() < 0.01) {
            let newX = curX + random.noise2D(curX, curY, 12, 0.1) * (prob < 0.99)
            let newY = curY + random.noise2D(curX, curY, 13, 0.1) * (prob < 0.99)
            p.moveTo(newX, newY)
            p.lineTo(newX + 0.01, newY + 0.01)
          }
          p.moveTo(curX, curY)
        }
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

const getPointOnCircle = (x, y, r, angle) => {
  return {
    x: x + Math.cos(angle) * r,
    y: y + Math.sin(angle) * r
  }
}

const getSgn = (a, b) => {
  if (a < b) return -1
  if (a == b) return 0
  if (a > b) return 1
}

const allPolys = []

const contains = (polys, point) => {
  for (let i = polys.length - 1; i >= 0; i--) {
    if (polys[i].contains(point)) return true
  }
  return false
}

const drawShape = (p, direction) => {
  const path = createPath()

  p.x += random.noise1D(p.x, 10, 1)
  p.y += random.noise1D(p.y, 10, 1)

  // path.moveTo(p.x, p.y)

  const length = map(random.noise2D(p.x, p.y, 10, 1), -1, 1, 0.75, 1.25)
  direction += random.noise2D(p.x, p.y, 10, 0.3)
  const to = {
    x: p.x + Math.cos(direction) * length,
    y: p.y + Math.sin(direction) * length
  }

  let left = {
    x: p.x + Math.cos(direction - Math.PI / 2) * length / 16,
    y: p.y + Math.sin(direction - Math.PI / 2) * length / 16
  }

  let right = {
    x: p.x + Math.cos(direction + Math.PI / 2) * length / 16,
    y: p.y + Math.sin(direction + Math.PI / 2) * length / 16
  }

  left.x += random.noise1D(left.x, 12, 0.25)
  left.y += random.noise1D(left.y, 4, 0.25)
  right.x += random.noise1D(right.x, 12, 0.25)
  right.y += random.noise1D(right.y, 4, 0.25)

  const pPoly = new paper.Path([
    new paper.Point(left.x, left.y),
    new paper.Point(right.x, right.y),
    new paper.Point(to.x, to.y)
  ])
  pPoly.closePath()

  let triObj = {
    poly: pPoly,
    cX: (left.x + right.x + to.x) / 3,
    cY: (left.y + right.y + to.y) / 3
  }

  let renderPoly = triObj.poly.clone()
  // console.log(triObj)
  const nearest = kdtree.nearest({ cX: triObj.cX, cY: triObj.cY }, 5)
  nearest.forEach(t => renderPoly = renderPoly.subtract(t[0].poly, { insert: false }))

  // console.log(nearest)

  drawPolygon(renderPoly)
  // path.moveTo(left.x, left.y)
  // path.lineTo(right.x, right.y)
  // path.lineTo(to.x, to.y)
  // path.lineTo(left.x, left.y)

  // paths.push(path)

  kdtree.insert(triObj)
}

const sketch = (props) => {
  const { width, height, units } = props;
  canvasWidth = width
  canvasHeight = height

  let centerX = width / 2 - 2
  let centerY = height / 2

  let p = createPath()
  p.moveTo(centerX, centerY)
  
  for (let radius = 0.1; radius <= 4; radius += 0.05) {
    for (let direction = 0; direction <= 2 * Math.PI; direction += 0.05) {
      console.log(radius, direction)
      const point = {
        x: Math.cos(direction) * radius + centerX,
        y: Math.sin(direction) * radius + centerY
      }

      if (random.noise2D(point.x, point.y, 4, 1) < 0) p.lineTo(point.x, point.y)
      else p.moveTo(point.x, point.y)

      drawShape(point, direction)
    }
  }

  paths.push(p)

  centerX += 4
  centerY += 1.7
  p = createPath()
  p.moveTo(centerX, centerY)
  
  for (let radius = 0.1; radius <= 3; radius += 0.05) {
    for (let direction = 0; direction <= 2 * Math.PI; direction += 0.05) {
      console.log(radius, direction)
      const point = {
        x: Math.cos(direction) * radius + centerX,
        y: Math.sin(direction) * radius + centerY
      }

      if (random.noise2D(point.x, point.y, 4, 1) < 0) p.lineTo(point.x, point.y)
      else p.moveTo(point.x, point.y)

      drawShape(point, direction)
    }
  }

  paths.push(p)

 
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

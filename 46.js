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

let paths = []
let N, M

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

const drawPolygon = (polygon) => {
  const p = createPath()
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
      let skips = false//(random.noise2D(curX, curY, 1, 1) < 0.5)
      if (skips) p.moveTo(curX, curY)
      else {
        if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
          p.lineTo(curX, curY);
        } else {
          p.bezierCurveTo(outX, outY, inX, inY, curX, curY);          
        }  
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

const interpolate = (x, y, pct) => {
  return x + (y - x) * pct
}

const interpolatePoint = (a, b, pct1, pct2) => {
  if (pct2 === undefined) pct2 = pct1
  return {
    x: interpolate(a.x, b.x, pct1),
    y: interpolate(a.y, b.y, pct2)
  }
}

const getRandomWithWeights = (weights) => {
  const sum = weights.reduce(((acc, w) => acc + w), 0)
  const val = Math.random() * sum
  let s = 0

  for (let i = 0; i < weights.length; i++) {
    if (val < s + weights[i]) return i
    s += weights[i]
  }

  return weights.length - 1
}

const getLineInSquare = (p1, p2, R, C) => {
  let r1 = Math.floor(Math.random() * (R + 1))
  let c1 = Math.floor(Math.random() * (C + 1))

  let r2 = Math.floor(Math.random() * (R + 1))
  let c2 = Math.floor(Math.random() * (C + 1))

  while (r1 == r2 && c1 == c2) {
    r1 = Math.floor(Math.random() * (R + 1))
    c1 = Math.floor(Math.random() * (C + 1))  
  }

  return {
    p1: interpolatePoint(p1, p2, r1 / R, c1 / C),
    p2: interpolatePoint(p1, p2, r2 / R, c2 / C)
  }
}

const drawLine = (p1, p2) => {
  const path = createPath()
  path.moveTo(p1.x, p1.y)
  path.lineTo(p2.x, p2.y)
  paths.push(path)
}

const drawLineWithWidth = (p1, p2, width) => {
  if (width == 0) return
  const r = FILL_LINE_SPACING
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  
  drawLine(p1, p2)
  if (width < 2) return

  let currR = r
  for (let i = 0; i < width; i += 2) {
    const sgns = [-1, 1]
    for (let sgn of sgns) {
      drawLine(
        { 
          x: p1.x + Math.cos(angle + Math.PI / 2 * sgn) * currR,
          y: p1.y + Math.sin(angle + Math.PI / 2 * sgn) * currR,
        },
        { 
          x: p2.x + Math.cos(angle + Math.PI / 2 * sgn) * currR,
          y: p2.y + Math.sin(angle + Math.PI / 2 * sgn) * currR,
        },
      )  
    }
    currR += r
  }
}

const getCircleInSquare = (p1, p2, R, C) => {
  let r1 = Math.floor(Math.random() * (R - 1)) + 1
  let c1 = Math.floor(Math.random() * (C - 1)) + 1
  const c = interpolatePoint(p1, p2, r1 / R, c1 / C)
  return {
    x: c.x,
    y: c.y,
    r: Math.abs((p1.x - p2.x) / R) / 2
  }
}

const drawCircle = (x, y, r) => {
  const p = createPath()
  p.arc(x, y, r, 0, 2 * Math.PI)
  paths.push(p)
}

const drawCircleWithWidth = (x, y, r, w) => {  
  drawCircle(x, y, r)
  if (w < 2) return
  for (let i = 0; i <= w; i++) {
    drawCircle(x, y, interpolate(r, 0, i / w))
  }
}

const sketch = (props) => {
  const { width, height, units } = props;
  
  N = 18
  M = N * 12 / 9

  const lineWidthWeights = [0.6, 0.1, 0.05, 0.02, 0.005]
  const lineWidths = [1, 2, 0, 16, 32]

  const circleWidthWeights = [0.7, 0.3, 0.1]
  const circleWidths = [1, 15, 2]

  let topLeft = { x: 1, y: 1 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      let p = interpolatePoint(topLeft, bottomRight, i / N, j / M)
      let p2 = interpolatePoint(topLeft, bottomRight, (i + 1) / N, (j + 1) / M)
      let poly = new paper.Path([
        new paper.Point(p.x, p.y),
        new paper.Point(p.x, p2.y),
        new paper.Point(p2.x, p2.y),
        new paper.Point(p2.x, p.y),
      ])
      poly.closePath()

      const centerX = poly.segments.reduce((acc, s) => (acc + s.point.x), 0) / poly.segments.length
      const centerY = poly.segments.reduce((acc, s) => (acc + s.point.y), 0) / poly.segments.length
      let centerPoly = new paper.Path([
        new paper.Point(centerX, centerY),
        new paper.Point(centerX, centerY + 0.001),
        new paper.Point(centerX + 0.001, centerY + 0.001),
        new paper.Point(centerX + 0.001, centerY),
      ])
      centerPoly.closePath()

      const interpX = 0.5
      const interpY = 1
      poly = poly.interpolate(centerPoly, poly, interpX)

      // Draw circles
      const noCircles = Math.max(0, Math.round(random.noise2D(i, j, 1, 3) - 1))
      for (let l = 0; l < noCircles; l++) {
        let c = getCircleInSquare(
          interpolatePoint({ x: centerX, y: centerY }, p, interpX, interpY), 
          interpolatePoint({ x: centerX, y: centerY }, p2, interpX, interpY), 
          2, 2
        )
        const circleWidth = circleWidths[getRandomWithWeights(circleWidthWeights)]
        drawCircleWithWidth(c.x, c.y, c.r * (1 + (!!(Math.random() < 0.3)) / 2), circleWidth)  
      }
      

      // Draw lines
      const noLines = Math.max(0, Math.round(random.noise2D(i, j, 0.01, 33) + (3.2 - 2 * noCircles)))
      for (let l = 0; l < noLines; l++) {
        let l = getLineInSquare(
          interpolatePoint({ x: centerX, y: centerY }, p, interpX, interpY), 
          interpolatePoint({ x: centerX, y: centerY }, p2, interpX, interpY), 
          1 + (!!(Math.random() < 0.2)), 4 + !!(Math.random() < 0.2)
        )
        const lineWidth = lineWidths[getRandomWithWeights(lineWidthWeights)]
        // console.log(i, j, l, lineWidth)
        drawLineWithWidth(l.p1, l.p2, lineWidth)
      }
      // drawPolygon(poly)

    }
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
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

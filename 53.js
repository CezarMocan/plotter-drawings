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
let polygons = []
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

const dist = (p1, p2) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

let minYs = {}

const drawLine = (p1, p2, resolution, period = 0.05, topLeft, bottomRight, step) => {

  let currPoly = new paper.Path()
  currPoly.add(new paper.Point(topLeft.x, bottomRight.y))

  const p = createPath()
  let prevContains = false
  let currContains = false
  for (let i = 0; i <= resolution; i++) {
    
    const currP = interpolatePoint(p1, p2, i / resolution, i / resolution)
    const amp = (0.1 + 2.9 * step) ** 2.2
    const rand = (random.noise2D(currP.x, currP.y, period, amp) + amp) //* (Math.sin(i / 30))

    currP.y -= rand

    const pp = new paper.Point(currP.x, currP.y)
    const currContains = (!(!minYs[i] || currP.y < minYs[i])) //|| (i < (1 - step) * 200) || (i > resolution - (1 - step) * 200)
    currPoly.add(pp)

    if (i == 0) p.moveTo(currP.x, currP.y)
    if (!currContains) {
      if (prevContains) {
        p.moveTo(interpolate(p1.x, p2.x, (i - 1) / resolution), minYs[i - 1])
      }
      minYs[i] = currP.y
      p.lineTo(currP.x, currP.y)
    } else {
      if (!prevContains && i > 0) {
        p.lineTo(currP.x, minYs[i])
      }
      p.moveTo(currP.x, currP.y)
    }
    // if ((!currContains && !prevContains)) p.lineTo(currP.x, currP.y)
    // else p.moveTo(currP.x, currP.y)

    prevContains = currContains
  }

  currPoly.add(new paper.Point(bottomRight.x, bottomRight.y))
  currPoly.closePath()
  allPolys.push(currPoly)

  if (allPolys.length > 60) allPolys.shift()

  paths.push(p)
}

const allPolys = []

const contains = (polys, point) => {
  for (let i = polys.length - 1; i >= 0; i--) {
    if (polys[i].contains(point)) return polys[i]
  }
  return null
}

const sketch = (props) => {
  const { width, height, units } = props;
  W = width
  H = height

  N = 36
  M = N * 12 / 9

 
  let topLeft = { x: -10.5, y: -10.5 }
  let bottomRight = { x: width - topLeft.x, y: height - topLeft.y }

  let spacing = 0.085
  let currY = bottomRight.y
  let period = 0.03
  for (let i = 0; i < 400; i++) {
    let p1 = { x: topLeft.x, y: currY }
    let p2 = { x: bottomRight.x, y: currY }    
    drawLine(p1, p2, 300, period, topLeft, bottomRight, (400 - i) / 400)
    period *= (1 + 0.001 + (0.01825 * Math.sin(i / 16)))
    currY -= spacing
    // if (i % 25 == 0) currY -= (spacing * 2.5)
    // if (i % 100 == 0) currY -= (spacing * 5)
    spacing = (0.07 + (0.01 * Math.cos(i / 15))) * (400 - i) * 0.005

    if (i % 10 == 0) console.log(i)
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines1 = pathsToPolylines(paths, { units });

  // paths = []
  // spacing = 0.065
  // currY = bottomRight.y
  // period = 0.05
  // for (let i = 0; i < 800; i++) {
  //   let p1 = { x: topLeft.x, y: currY }
  //   let p2 = { x: bottomRight.x, y: currY }
  //   drawLine(p1, p2, 400, period)
  //   period *= (1 + 0.0013 + (0.00125 * Math.sin(i / 8)))
  //   currY -= spacing
  //   // if (i % 25 == 0) currY -= (spacing * 2.5)
  //   // if (i % 100 == 0) currY -= (spacing * 5)
  //   spacing = 0.07 + (0.011 * Math.sin(i / 16))
  // }
  // let lines2 = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 0.5; // in working 'units' based on settings
  const box = [ 1 * margin, margin, width - 1 * margin, height - margin ];
  lines1 = clipPolylinesToBox(lines1, box);
  let lines = [lines1]

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

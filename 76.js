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
const kdtreelib = require('kd-tree-javascript')

// You can force a specific seed by replacing this with a string value
// const defaultSeed = '391220';
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(defaultSeed || Random.getRandomSeed());

// Print to console so we can see which seed is being used and copy it if desired
console.log('Random Seed:', Random.getSeed());

let paths = []

const settings = {
  suffix: Random.getSeed(),
  dimensions: 'A4',
  orientation: 'portrait',
  pixelsPerInch: 300,
  scaleToView: true,
  units: 'cm'
};

const interpolate = (a, b, pct) => (a + (b - a) * pct)
const drawPolygon = (polygon, all, prob) => {
  // console.log(polygon.segments, drawRule)
  if (!polygon.segments) return
  if (polygon.segments.length == 0) return
  const p = createPath()  
  // console.log('drawPoly: ', polygon)
  var inX, inY, outX, outY, curX, curY, prevX, prevY
  for (let i = 0; i < polygon.segments.length; i++) {
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

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines

  const R = 6
  const N = 600
  const center = { x: width / 2 + 1, y: height / 2 }

  const poly = new paper.Path()
  const centerPoly = new paper.Path()

  for (let i = 0; i <= N; i++) {
    const padding = 30
    let noiseFactor = 1
    if (i <= padding) noiseFactor = i / padding
    if (i + padding >= N) noiseFactor = (N - i) / padding

    const angle = map(i, 0, N, 0, 2 * Math.PI)
    const radius = R + random.noise1D(i, 0.01, 3) * noiseFactor * (1 + Math.sin(i / 20) * 2.4)
    const edge = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    }

    poly.add(new paper.Point(edge.x, edge.y))    
    centerPoly.add(new paper.Point(
      interpolate(width / 2, edge.x, 0.01),
      interpolate(height / 2, edge.y, 0.01),
    ))
  }


  drawPolygon(poly, true)

  let noPaths = 200
  for (let i = 0; i <= noPaths; i++) {
    const newP = new paper.Path()
    newP.interpolate(poly, centerPoly, i / noPaths)
    drawPolygon(newP, false, 1 - (i / noPaths))
  }

  // for (let i = -10; i <= 1; i += 0.5) {
  //   const newP = new paper.Path()
  //   newP.interpolate(poly, centerPoly, i / 100)
  //   drawPolygon(newP, true, 1 - (i / noPaths))
  // }

  for (let i = -150; i <= -25; i += 1) {
    const newP = new paper.Path()
    newP.interpolate(poly, centerPoly, i / 100)
    drawPolygon(newP, true, 0.52)
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 0.1; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  lines = clipPolylinesToBox(lines, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(lines, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.04,
    // Optimize SVG paths for pen plotter use
    optimize: false
  });
};

canvasSketch(sketch, settings);

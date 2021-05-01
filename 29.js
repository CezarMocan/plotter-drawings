const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const random = require('canvas-sketch-util/random');
const paper = require('paper/dist/paper-core')
const { squaredDistance } = require('canvas-sketch-util/lib/vec2');
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

const paths = [];
let field = [];
let topLeft, bottomRight, N, M, pageWidth, pageHeight;

const getCoord = (topLeft, bottomRight, i, j, N, M) => {
  return {
    x: map(i, 0, N - 1, topLeft.x, bottomRight.x),
    y: map(j, 0, M - 1, topLeft.y, bottomRight.y)
  }
}

const getFieldCoord = (topLeft, bottomRight, x, y, N, M) => {
  return {
    i: Math.round(map(x, topLeft.x, bottomRight.x, 0, N - 1)),
    j: Math.round(map(y, topLeft.y, bottomRight.y, 0, M - 1)),
  }
}

const getDirection = (x, y) => {
  const coord = getFieldCoord(topLeft, bottomRight, x, y, N, M)
  return field[coord.i][coord.j].direction
}

const inBounds = (x, y) => {
  if (x < 0) return false
  if (y < 0) return false
  if (x > pageWidth) return false
  if (y > pageHeight) return false
  return true
}

const drawLine = ({ x, y, step, direction, length, path }) => {
  if (length <= 0 || !inBounds(x, y)) {
    paths.push(path)
    return
  }

  if (direction == null) {
    path.moveTo(x, y)  
  }

  let targetDirection = getDirection(x, y)
  let smoothing = direction == null ? 0 : 0.75
  direction = smoothing * direction + (1 - smoothing) * targetDirection

  const nextPoint = {
    x: x + Math.cos(direction) * step,
    y: y + Math.sin(direction) * step,
  }

  path.lineTo(nextPoint.x, nextPoint.y)

  drawLine({
    x: nextPoint.x, y: nextPoint.y,
    step, direction, 
    length: length - step,
    path
  })
}

const sketch = (props) => {
  const { width, height, units } = props;
  pageWidth = width
  pageHeight = height

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines

  N = 1280
  M = 1920

  topLeft = {
    x: -width * 0.5,
    y: -height * 0.5
  }

  bottomRight = {
    x: width * 1.5,
    y: height * 1.5
  }  

  for (let i = 0; i <= N; i++) {
    field.push([])
    for (let j = 0; j <= M; j++) {
      field[i].push({
        direction: map(random.noise2D(i, j, 0.009, 1), -1, 1, 1.25 * Math.PI, 1.75 * Math.PI)
      })

      const p = createPath()
      let startPoint = getCoord(topLeft, bottomRight, i, j, N, M)
      p.moveTo(startPoint.x, startPoint.y)

      const r = Math.sin(i * j / 90) * random.noise1D(i - j, 0.5, 0.15) + 0.3

      let endPoint = {
        x: startPoint.x + Math.cos(field[i][j].direction) * r,
        y: startPoint.y + Math.sin(field[i][j].direction) * r,
      }
      p.lineTo(endPoint.x, endPoint.y)

      // paths.push(p)
    }
  }

  // let yOffsets = [-12, 0, 12]
  let yOffsets = [0]

  for (let yOffset of yOffsets) {

    for (let totalDir = 0; totalDir < 2; totalDir++) {

      // for (let i = 0; i <= width; i += (width / 1 + 1)) {
        // for (let j = 5; j <= height - 5; j += 0.035) {
          // const startPoint = { x: i + random.noise2D(i, j, 1, 0.25), y: j + random.noise2D(i, j, 0.03, 0.15) }
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.015) {
          const rad = 4.5
          const r = rad * (1 + random.noise1D(angle, 0.5, 0.05))
          // const startPoint = { x: width / 2 + random.noise2D(i, j, 0.055, 1), y: j + random.noise2D(i, j, 0.03, 0.15) }
          const startPoint = { x: Math.cos(angle) * r + width / 2, y: Math.sin(angle) * r + height / 2 + yOffset }
          drawLine({
            x: startPoint.x,
            y: startPoint.y,
            step: 0.25,
            direction: null,
            length: 37 + random.noise1D(angle, 0.1, 2),//map(j, 0, height, 2, 2) + Math.sin((i * height + j) / 500) * 1,
            path: createPath()
          })    
        }
        // }
      // }

      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= M; j++) 
          field[i][j].direction += Math.PI
      }
    }
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
    lineWidth: 0.055,
    // Optimize SVG paths for pen plotter use
    optimize: false
  });
};

canvasSketch(sketch, settings);

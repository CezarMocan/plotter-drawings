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

const getCoord = (topLeft, bottomRight, i, j, N, M) => {
  return {
    x: map(i, 0, N - 1, topLeft.x, bottomRight.x),
    y: map(j, 0, M - 1, topLeft.y, bottomRight.y)
  }
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  let N = 230
  let M = 230

  let topLeft = {
    x: -width * 0.1,
    y: -height * 0.1
  }

  let bottomRight = {
    x: width * 1.1,
    y: height * 1.1
  }

  let field = []
  for (let i = 0; i <= N; i++) {
    field.push([])
    for (let j = 0; j <= M; j++) {
      field[i].push({
        direction: map(random.noise2D(i, j, 0.01, 1), -1, 1, 0, 2 * Math.PI)
      })

      const p = createPath()
      let startPoint = getCoord(topLeft, bottomRight, i, j, N, M)
      p.moveTo(startPoint.x, startPoint.y)

      const r = Math.sin(i * j / 90) * random.noise1D(i - j, 0.5, 0.15)

      let endPoint = {
        x: startPoint.x + Math.cos(field[i][j].direction) * r,
        y: startPoint.y + Math.sin(field[i][j].direction) * r,
      }
      p.lineTo(endPoint.x, endPoint.y)

      paths.push(p)
    }
  }
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

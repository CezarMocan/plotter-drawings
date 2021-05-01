const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const p5 = require('p5');
const random = require('canvas-sketch-util/random');

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

class Dot {
  constructor(x, y, gravity) {
    this.pos = createVector(x, y);
    this.oldpos = createVector(x, y);
    
    this.friction = 0.4;
    this.groundFriction = 0.7;
    
    this.gravity = gravity || createVector(0, 0);    
    
    this.radius = 5;
    this.color = '#e62a4f';
    this.mass = 1;
  } 
  update() {
    let vel = p5.Vector.sub(this.pos, this.oldpos);
    vel.mult(this.friction);    
    this.oldpos.set(this.pos.x, this.pos.y);
    this.pos.add(vel);
    this.pos.add(this.gravity);
  }
  render(p) {
    // p.arc(this.pos.x, this.pos.y, 0.5, 0, 2 * Math.PI);
    p.moveTo(this.pos.x, this.pos.y)
    p.lineTo(this.oldpos.x, this.oldpos.y)
    /*
    fill(this.color);
    noStroke()
    circle(this.pos.x, this.pos.y, 1)
    stroke(this.color)
    noFill()
    line(this.pos.x, this.pos.y, this.oldpos.x, this.oldpos.y)
    */
  }
}

class Stick {
  constructor(p1, p2, length) {
    this.startPoint = p1;
    this.endPoint = p2;
    this.stiffness = 2;
    this.color = '#f5476a';
    
    // if the length is not given then calculate the distance based on position
    if (!length) {
      this.length = this.startPoint.pos.dist(this.endPoint.pos);
    } else {
      this.length = length;
    }    
  }
  update() {
    // calculate the distance between two dots
    let dx = this.endPoint.pos.x - this.startPoint.pos.x;
    let dy = this.endPoint.pos.y - this.startPoint.pos.y;
    // pythagoras theorem
    let dist = Math.sqrt(dx * dx + dy * dy);
    // calculate the resting distance betwen the dots
    let diff = (this.length - dist) / dist * this.stiffness;

    // getting the offset of the points
    let offsetx = dx * diff * 0.5;
    let offsety = dy * diff * 0.5;

    // calculate mass
    let m1 = this.startPoint.mass + this.endPoint.mass;
    let m2 = this.startPoint.mass / m1;
    m1 = this.endPoint.mass / m1;

    // and finally apply the offset with calculated mass
    if (!this.startPoint.pinned) {
      this.startPoint.pos.x -= offsetx * m1;
      this.startPoint.pos.y -= offsety * m1;
    }
    if (!this.endPoint.pinned) {
      this.endPoint.pos.x += offsetx * m2;
      this.endPoint.pos.y += offsety * m2;
    }
  }
  render(p) {
    p.moveTo(this.startPoint.pos.x, this.startPoint.pos.y)
    p.lineTo(this.endPoint.pos.x, this.endPoint.pos.y)
    // line(this.startPoint.pos.x, this.startPoint.pos.y, this.endPoint.pos.x, this.endPoint.pos.y)
  }
}

function getOffset(i, n) {
  return {
    startX: (1 + Math.cos(i / n)) * 40,
    startY: i
  }
}

function getPosition(noPoints, i, width, height, globalOffsetX = 0, globalOffsetY = 0, curveStart = 0) {
  let x, y 
  let start = curveStart
  let cnt = 450
  i = map(i, 0, noPoints, start, start + cnt)
  const { startX, startY } = getOffset(i - start, cnt)
  // const startY = (i - start)
  // const startX = (i - start) / 10
  // y = ((Math.cos(i / 7)) * 40 + i + 50) / 10 + 1
  const scaleY = 1 / (20 + Math.cos(i / 30) * 2)
  y = ((Math.cos(i / 7)) * height + startY + 50) * scaleY
  // const scaleX = 1 / (2 + Math.sin(i / 5) * 0.8)
  const scaleX = 1 / (10 + random.noise1D(i, 0.02, 4))
  // x = ((Math.sin(i / 8) + 1) * (width / 1.6) / 2 + width / 4 + width / 8 * (1 - heightFactor)) * scaleX - 1
  x = ((Math.sin(i / 8) + 1) * width + startX) * scaleX
  // console.log('x: ', x)
  return {
    x: x + globalOffsetX,
    y: y + globalOffsetY
  }
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  for (let bigX = 0; bigX < 4; bigX++) {
    for (let bigY = 0; bigY < 4; bigY++) {
      const noLines = 1
      let lines = []
      let lineParams = []
      for (let i = 0; i < noLines; i++) {
        lines.push([])
        lineParams.push({ startParam: (bigX + 1) * (bigY + 1) * 2000 + map(Math.random(), 0, 1, 0, 100000) + i * 1000, offsetX: map(i, 0, noLines, -4, 2.5), offsetY: 0 })
      }
    
      // let lineParams = [
      //   { startParam: 32850, offsetX: 2, offsetY: 0 },
      //   { startParam: 32852, offsetX: 2, offsetY: 0 },
      //   // { startParam: 37850, offsetX: -2, offsetY: 0 },
      // ]
    
      let sticks = []
    
      const noPoints = 250
      const weightLimit = noPoints
      let index = 0
      for (let dots of lines) {
        for (let i = 0; i < noPoints; i++) {
          const pos = getPosition(noPoints, i, width, height, lineParams[index].offsetX, lineParams[index].offsetY, lineParams[index].startParam)
          const weightVal = Math.sin(((weightLimit - i) / weightLimit) / 950) / 1300 + random.noise1D(i, 0.008, 0.003)
          dots.push(new Dot(pos.x / 4 + bigX * 5.6, pos.y / 6 + bigY * 8, createVector(0, weightVal))); 
      
          if (i > 0) {
            sticks.push(new Stick(dots[i - 1], dots[i]))
          }
        }  
        index++
      }
    
      // console.log(dots)
    
      for (let frames = 0; frames < 3; frames++) {
        for (let solver = 0; solver < 8; solver++) {
          for (let dots of lines) {
            for (let d of dots) d.update();  
          }
          for (let s of sticks) s.update()
        }
    
        // const p1 = createPath()
        // for (let d of dots) {      
        //   // d.constrain();
        //   // d.render(p1);
        // }
        // paths.push(p1)
    
        const p = createPath()
        for (let s of sticks) s.render(p)
        paths.push(p)
    
        // const pP = createPath()
        // for (let lineIndex = 0; lineIndex < noLines - 1; lineIndex++) {
        //   for (let i = 0; i < noPoints; i++) {
        //     if (random.noise1D(i + lineIndex * noLines, 10, 1) > -0.2) {
        //       pP.moveTo(lines[lineIndex][i].pos.x, lines[lineIndex][i].pos.y)
        //       pP.lineTo(lines[lineIndex + 1][i].pos.x, lines[lineIndex + 1][i].pos.y)
        //     }
        //   }  
        // }
        // paths.push(pP)
        
      }
    
    }
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let linesToRender = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const actualMargin = 0.1
  const box = [ actualMargin, actualMargin, width - actualMargin, height - actualMargin ];
  linesToRender = clipPolylinesToBox(linesToRender, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(linesToRender, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.045,
    // Optimize SVG paths for pen plotter use
    optimize: true
  });
};

canvasSketch(sketch, settings);
